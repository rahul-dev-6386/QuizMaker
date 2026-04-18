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
      // Basic queueing
      if (!queues[category]) queues[category] = [];
      queues[category].push({ socketId: socket.id, userId, name });

      socket.join(`queue_${category}`);
      broadcastStats();

      // If we have 2 players, start game
      if (queues[category].length >= 2) {
        const p1 = queues[category].shift();
        const p2 = queues[category].shift();

        const roomId = `room_${Date.now()}_${Math.random()}`;
        
        // Fetch random questions for this category
        const randomQuizzes = await Quiz.aggregate([
          { $match: { category: category === "General" ? { $exists: true } : category } },
          { $sample: { size: 1 } }
        ]);
        
        let questions = [];
        if (randomQuizzes.length > 0) {
            questions = randomQuizzes[0].questions.slice(0, 5); // 5 questions for battle
        }

        activeGames[roomId] = {
            players: [
                { id: p1.userId, socketId: p1.socketId, name: p1.name, score: 0, currentQ: 0 },
                { id: p2.userId, socketId: p2.socketId, name: p2.name, score: 0, currentQ: 0 }
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
            players: activeGames[roomId].players.map(p => ({ name: p.name, score: 0 })),
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
                players: game.players.map(p => ({ name: p.name, score: p.score, currentQ: p.currentQ }))
            });

            // Check if game over
            const allFinished = game.players.every(p => p.currentQ >= game.questions.length - 1);
            if (allFinished) {
                const winner = game.players.reduce((a, b) => a.score > b.score ? a : b);
                io.to(roomId).emit("gameOver", { winner: winner.name, finalScores: game.players.map(p => ({ name: p.name, score: p.score })) });
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
