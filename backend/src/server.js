import app from "./app.js";
import { connectDatabase } from "./config/database.js";
import { env } from "./config/env.js";
import { setupSocketServer } from "./socketHandler.js";

async function startServer() {
  try {
    await connectDatabase();
    const server = app.listen(env.PORT, () => {
      console.log(`Server running on port ${env.PORT}`);
    });
    
    // Set up real-time multiplayer sockets
    setupSocketServer(server);
  } catch (err) {
    console.error("Failed to start server:", err.message);
    process.exit(1);
  }
}

startServer();
