import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { BattleMatch, Quiz, Users } from "./models/index.js";
import { env } from "./config/env.js";

// Socket event validation schemas
const joinQueueSchema = z.object({
  userId: z.string().min(1),
  name: z.string().min(1).max(100),
  category: z.string().default("General"),
});

const submitAnswerSchema = z.object({
  roomId: z.string().min(1),
  questionIndex: z.number().int().min(0),
  isCorrect: z.boolean(),
  scoreTimeElapsed: z.number().min(0),
});

// Matchmaking queues per category
// { "General": [userId, userId2], ... }
const queues = {};

// Active games
// { roomId: { players: [{id, score, name}], category, startTime, currentQuestion, ... } }
const activeGames = {};

// Player to room map
const playerRoom = {};

// Simple lock map to prevent race conditions in queue operations
const queueLocks = new Map();

async function withQueueLock(category, fn) {
  while (queueLocks.get(category)) {
    await new Promise(resolve => setTimeout(resolve, 10));
  }
  queueLocks.set(category, true);
  try {
    return await fn();
  } finally {
    queueLocks.delete(category);
  }
}

const ioConfig = {
  cors: {
    origin: env.CLIENT_ORIGINS,
    methods: ["GET", "POST"]
  }
};

// Socket authentication middleware
function authenticateSocket(socket, next) {
  const token = socket.handshake.auth.token || 
                socket.handshake.headers.authorization?.replace("Bearer ", "") ||
                socket.handshake.headers.cookie?.split(";")
                  .map((part) => part.trim())
                  .find((part) => part.startsWith("accessToken="))
                  ?.split("=")[1];

  if (!token) {
    return next(new Error("Authentication error: No token provided"));
  }

  try {
    const decoded = jwt.verify(token, env.ACCESS_SECRET);
    socket.userId = decoded.id;
    socket.role = decoded.role;
    next();
  } catch (err) {
    next(new Error("Authentication error: Invalid or expired token"));
  }
}

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

function getPublicPlayers(players) {
  return players.map((p) => ({
    id: String(p.id),
    socketId: p.socketId,
    name: p.name,
    score: p.score,
    answeredCount: p.answeredQuestions?.size || 0,
  }));
}

async function updateWinnerStreak(userId) {
  const user = await Users.findById(userId);
  if (!user) return;

  user.battleWins = (user.battleWins || 0) + 1;
  user.battleCurrentStreak = (user.battleCurrentStreak || 0) + 1;
  user.battleBestStreak = Math.max(user.battleBestStreak || 0, user.battleCurrentStreak);
  await user.save();
}

async function updateNonWinnerRecord(userId, field) {
  await Users.findByIdAndUpdate(userId, {
    $inc: { [field]: 1 },
    $set: { battleCurrentStreak: 0 },
  });
}

async function persistBattleResult(game, { winner = null, completedReason = "finished" } = {}) {
  if (!game || game.completed || !Array.isArray(game.players) || game.players.length < 2) {
    return;
  }

  game.completed = true;

  const isDraw = !winner;
  const outcome = completedReason === "disconnect" ? "disconnect" : isDraw ? "draw" : "win";

  await BattleMatch.create({
    roomId: game.roomId,
    category: game.category,
    winnerUserId: winner?.id || null,
    outcome,
    completedReason,
    startedAt: game.startedAt,
    completedAt: new Date(),
    players: game.players.map((player) => ({
      userId: player.id,
      name: player.name,
      score: player.score,
      result: isDraw ? "draw" : player.id === winner.id ? "win" : "loss",
    })),
  });

  if (isDraw) {
    await Promise.all(game.players.map((player) => updateNonWinnerRecord(player.id, "battleDraws")));
    return;
  }

  await Promise.all(
    game.players.map((player) =>
      player.id === winner.id
        ? updateWinnerStreak(player.id)
        : updateNonWinnerRecord(player.id, "battleLosses")
    )
  );
}

export function setupSocketServer(server) {
  const io = new Server(server, ioConfig);

  // Apply authentication middleware
  io.use(authenticateSocket);

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
    console.log("Client connected:", socket.id, "User:", socket.userId);
    broadcastStats();

    socket.on("joinQueue", async (data) => {
      // Validate payload
      const parsed = joinQueueSchema.safeParse(data);
      if (!parsed.success) {
        return socket.emit("error", { message: "Invalid joinQueue payload", errors: parsed.error.issues });
      }

      const { userId, name, category } = parsed.data;

      // Verify userId matches authenticated user
      if (String(userId) !== String(socket.userId)) {
        return socket.emit("error", { message: "Unauthorized: User ID mismatch" });
      }

      const normalizedUserId = String(userId || "");

      await withQueueLock(category, async () => {
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
              roomId,
              players: [
                  { id: String(p1.userId), socketId: p1.socketId, name: p1.name, score: 0, answeredQuestions: new Set() },
                  { id: String(p2.userId), socketId: p2.socketId, name: p2.name, score: 0, answeredQuestions: new Set() }
              ],
              questions,
              category,
              startedAt: new Date(),
              completed: false,
          };

          // Emit to both
          io.to(p1.socketId).socketsJoin(roomId);
          io.to(p2.socketId).socketsJoin(roomId);
          playerRoom[p1.socketId] = roomId;
          playerRoom[p2.socketId] = roomId;

          const payloadPlayers = activeGames[roomId].players.map((p) => ({
            id: String(p.id),
            socketId: p.socketId,
            name: p.name,
            score: 0,
            answeredCount: 0,
          }));

          io.to(p1.socketId).emit("gameStart", {
              roomId,
              selfSocketId: p1.socketId,
              players: payloadPlayers,
              questions
          });
          io.to(p2.socketId).emit("gameStart", {
              roomId,
              selfSocketId: p2.socketId,
              players: payloadPlayers,
              questions
          });
          broadcastStats();
        }
      });
    });

    socket.on("submitAnswer", async (data) => {
        // Validate payload
        const parsed = submitAnswerSchema.safeParse(data);
        if (!parsed.success) {
            return socket.emit("error", { message: "Invalid submitAnswer payload", errors: parsed.error.issues });
        }

        const { roomId, questionIndex, isCorrect, scoreTimeElapsed } = parsed.data;

        const game = activeGames[roomId];
        if (!game) return;

        const player = game.players.find(p => p.socketId === socket.id);
        if (player) {
            if (player.answeredQuestions.has(questionIndex)) return;

            player.answeredQuestions.add(questionIndex);
            if (isCorrect) {
                // simple score based on time
                const points = Math.max(10, 100 - (scoreTimeElapsed * 10)); 
                player.score += points;
            }

            // Broadcast score update
            io.to(roomId).emit("scoreUpdate", {
                players: getPublicPlayers(game.players)
            });

            // Check if game over
            const allFinished = game.players.every(p => p.answeredQuestions.size >= game.questions.length);
            if (allFinished) {
                const [firstPlayer, secondPlayer] = game.players;
                const winner =
                    firstPlayer.score === secondPlayer.score
                        ? null
                        : game.players.reduce((a, b) => a.score > b.score ? a : b);
                await persistBattleResult(game, { winner });
                io.to(roomId).emit("gameOver", {
                    winnerId: winner?.id || null,
                    winnerSocketId: winner?.socketId || null,
                    winnerName: winner?.name || null,
                    finalScores: getPublicPlayers(game.players),
                });
                delete activeGames[roomId];
                broadcastStats();
            }
        }
    });

    socket.on("disconnect", async () => {
        console.log("Client disconnected:", socket.id);
        // Remove from queues
        for (const cat in queues) {
            queues[cat] = queues[cat].filter(p => p.socketId !== socket.id);
        }
        
        // Handle disconnect in-game
        const roomId = playerRoom[socket.id];
        if (roomId && activeGames[roomId]) {
            const game = activeGames[roomId];
            const winner = game.players.find((player) => player.socketId !== socket.id);
            await persistBattleResult(game, { winner, completedReason: "disconnect" });
            io.to(roomId).emit("opponentDisconnected");
            delete activeGames[roomId];
        }
        delete playerRoom[socket.id];
        broadcastStats();
    });
  });

  return io;
}
