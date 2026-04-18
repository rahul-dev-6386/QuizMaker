import { io } from "socket.io-client";
const socket = io("http://localhost:5000");

socket.on("connect", () => {
  console.log("Connected with id", socket.id);
  socket.emit("joinQueue", { userId: "fake1", name: "Fake User 1", category: "General" });
  socket.emit("joinQueue", { userId: "fake2", name: "Fake User 2", category: "Math" });
  socket.emit("joinQueue", { userId: "fake3", name: "Fake User 3", category: "Math" });
  
  setTimeout(() => {
    console.log("disconnecting dummy socket");
    process.exit(0);
  }, 2000);
});

socket.on("lobbyStats", (stats) => {
    console.log("Stats received:", stats);
});
