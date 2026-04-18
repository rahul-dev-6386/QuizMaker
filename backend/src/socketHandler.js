import { Server } from "socket.io";
import { Quiz } from "./models/index.js";

// Matchmaking queues per category
// { "General": [userId, userId2], ... }
const queues = {};

// Active games
// { roomId: { players: [{id, score, name}], category, startTime, currentQuestion, ... } }
const activeGames = {};

// Player to room map
const playerRoom = {};

const ioConfig = {
  cors: {
    origin: "*", // allow all origins for now
    methods: ["GET", "POST"]
  }
};

async function getBattleQuestions(category, count = 5) {
  const matchStage =
    category === "General"
      ? { questions: { $exists: true, $ne: [] } }
      : { category, questions: { $exists: true, $ne: [] } };

  const sampledQuestions = await Quiz.aggregate([
    { $match: matchStage },
    { $unwind: "$questions" },
    { $sample: { size: count } },
    {
      $project: {
        _id: 0,
        quizId: "$_id",
        questionId: "$questions._id",
        question: "$questions.question",
        questionImage: { $ifNull: ["$questions.questionImage", ""] },
        options: "$questions.options",
        correctAnswer: "$questions.correctAnswer",
      },
    },
  ]);

  return sampledQuestions.map((question) => ({
    ...question,
    quizId: String(question.quizId),
    questionId: String(question.questionId),
  }));
}

export function setupSocketServer(server) {
  const io = new Server(server, ioConfig);

  const broadcastStats = () => {
      const stats = {};
      for (const cat in queues) {
          stats[cat] = (stats[cat] || 0) + queues[cat].length;
      }
      for (const roomId in activeGames) {
          const game = activeGames[roomId];
          if (game && game.category) {
              stats[game.category] = (stats[game.category] || 0) + game.players.length;
          }
      }
      io.emit("lobbyStats", stats);
  };

  io.on("connection", (socket) => {
    console.log("Client connected:", socket.id);
    broadcastStats();

    socket.on("joinQueue", async ({ userId, name, category = "General" }) => {
      const normalizedUserId = String(userId || "");

      // Basic queueing
      if (!queues[category]) queues[category] = [];
      queues[category].push({ socketId: socket.id, userId: normalizedUserId, name });

      socket.join(`queue_${category}`);
      broadcastStats();

      // If we have 2 players, start game
      if (queues[category].length >= 2) {
        const p1 = queues[category].shift();
        const p2 = queues[category].shift();

        const roomId = `room_${Date.now()}_${Math.random()}`;
        
        const questions = await getBattleQuestions(category, 5);

        activeGames[roomId] = {
            players: [
                { id: String(p1.userId), socketId: p1.socketId, name: p1.name, score: 0, currentQ: 0 },
                { id: String(p2.userId), socketId: p2.socketId, name: p2.name, score: 0, currentQ: 0 }
            ],
            questions,
            category,
        };

        // Emit to both
        io.to(p1.socketId).socketsJoin(roomId);
        io.to(p2.socketId).socketsJoin(roomId);
        playerRoom[p1.socketId] = roomId;
        playerRoom[p2.socketId] = roomId;

        io.to(roomId).emit("gameStart", {
            roomId,
            players: activeGames[roomId].players.map((p) => ({
              id: String(p.id),
              name: p.name,
              score: 0,
              currentQ: 0,
            })),
            questions
        });
        broadcastStats();
      }
    });

    socket.on("submitAnswer", ({ roomId, questionIndex, isCorrect, scoreTimeElapsed }) => {
        const game = activeGames[roomId];
        if (!game) return;

        const player = game.players.find(p => p.socketId === socket.id);
        if (player) {
            player.currentQ = questionIndex;
            if (isCorrect) {
                // simple score based on time
                const points = Math.max(10, 100 - (scoreTimeElapsed * 10)); 
                player.score += points;
            }

            // Broadcast score update
            io.to(roomId).emit("scoreUpdate", {
                players: game.players.map((p) => ({
                    id: String(p.id),
                    name: p.name,
                    score: p.score,
                    currentQ: p.currentQ,
                }))
            });

            // Check if game over
            const allFinished = game.players.every(p => p.currentQ >= game.questions.length - 1);
            if (allFinished) {
                const [firstPlayer, secondPlayer] = game.players;
                const winner =
                    firstPlayer.score === secondPlayer.score
                        ? null
                        : game.players.reduce((a, b) => a.score > b.score ? a : b);
                io.to(roomId).emit("gameOver", {
                    winnerId: winner?.id || null,
                    winnerName: winner?.name || null,
                    finalScores: game.players.map((p) => ({
                        id: String(p.id),
                        name: p.name,
                        score: p.score,
                    })),
                });
                delete activeGames[roomId];
                broadcastStats();
            }
        }
    });

    socket.on("disconnect", () => {
        console.log("Client disconnected:", socket.id);
        // Remove from queues
        for (const cat in queues) {
            queues[cat] = queues[cat].filter(p => p.socketId !== socket.id);
        }
        
        // Handle disconnect in-game
        const roomId = playerRoom[socket.id];
        if (roomId && activeGames[roomId]) {
            io.to(roomId).emit("opponentDisconnected");
            delete activeGames[roomId];
        }
        delete playerRoom[socket.id];
        broadcastStats();
    });
  });

  return io;
}
