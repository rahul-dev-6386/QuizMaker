import { Attempt, BattleMatch, Users } from "../models/index.js";

export async function getAttempts(req, res) {
  const attempts = await Attempt.find({ userId: req.userId })
    .populate("quizId", "title category")
    .sort({ submittedAt: -1 });

  res.json({ attempts });
}

export async function getDashboardStats(req, res) {
  try {
    const attempts = await Attempt.find({ userId: req.userId });
    const user = await Users.findById(req.userId);

    const totalQuizzes = attempts.length;
    const totalScore = attempts.reduce((acc, a) => acc + a.score, 0);
    const bestScore = Math.max(...attempts.map((a) => a.score), 0);
    const averageScore = totalQuizzes ? totalScore / totalQuizzes : 0;
    const totalQuestionsAttempted = attempts.reduce(
      (acc, a) => acc + (a.answers?.length || 0),
      0
    );
    const accuracyPercent = totalQuestionsAttempted
      ? (totalScore / totalQuestionsAttempted) * 100
      : 0;
    const allBattleMatches = await BattleMatch.find({ "players.userId": req.userId }).lean();
    const userBattleResults = allBattleMatches
      .map((match) => {
        const player = match.players.find((p) => p.userId?.toString() === req.userId);
        const opponent = match.players.find((p) => p.userId?.toString() !== req.userId);
        return player
          ? {
              id: match._id,
              category: match.category,
              result: player.result,
              score: player.score,
              opponentName: opponent?.name || "Opponent",
              opponentScore: opponent?.score ?? 0,
              completedAt: match.completedAt,
            }
          : null;
      })
      .filter(Boolean);
    const battleWins = userBattleResults.filter((match) => match.result === "win").length;
    const battleLosses = userBattleResults.filter((match) => match.result === "loss").length;
    const battleDraws = userBattleResults.filter((match) => match.result === "draw").length;
    const totalBattleMatches = userBattleResults.length;
    const battleWinRate = totalBattleMatches
      ? (battleWins / totalBattleMatches) * 100
      : 0;

    const buildBattleLeaderboard = async (startDate) => {
      return BattleMatch.aggregate([
        { $match: { completedAt: { $gte: startDate } } },
        { $unwind: "$players" },
        { $match: { "players.result": "win" } },
        {
          $group: {
            _id: "$players.userId",
            name: { $last: "$players.name" },
            wins: { $sum: 1 },
            totalScore: { $sum: "$players.score" },
          },
        },
        { $sort: { wins: -1, totalScore: -1, name: 1 } },
        { $limit: 5 },
      ]);
    };

    const now = new Date();
    const dayStart = new Date(now);
    dayStart.setHours(0, 0, 0, 0);
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - 6);
    weekStart.setHours(0, 0, 0, 0);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const [dailyLeaderboard, weeklyLeaderboard, monthlyLeaderboard] = await Promise.all([
      buildBattleLeaderboard(dayStart),
      buildBattleLeaderboard(weekStart),
      buildBattleLeaderboard(monthStart),
    ]);

    res.json({
      totalQuizzes,
      bestScore,
      averageScore,
      totalQuestionsAttempted,
      accuracyPercent,
      battleStats: {
        wins: battleWins,
        losses: battleLosses,
        draws: battleDraws,
        matches: totalBattleMatches,
        winRate: battleWinRate,
        currentStreak: user?.battleCurrentStreak || 0,
        bestStreak: user?.battleBestStreak || 0,
        recent: userBattleResults.slice(0, 5),
        leaderboard: {
          daily: dailyLeaderboard,
          weekly: weeklyLeaderboard,
          monthly: monthlyLeaderboard,
        },
      },
      gamification: {
        xp: user?.xp || 0,
        level: user?.level || 1,
        streak: user?.streak || 0,
        badges: user?.badges || [],
      }
    });
  } catch {
    res.status(500).json({ message: "Error generating dashboard stats" });
  }
}
