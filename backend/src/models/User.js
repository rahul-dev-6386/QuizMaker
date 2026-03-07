import mongoose from "mongoose";

const UserSchema = new mongoose.Schema({
  email: { type: String, unique: true },
  password: String,
  name: String,
  role: {
    type: String,
    enum: ["user", "admin"],
    default: "user",
  },
});

export const Users = mongoose.model("User", UserSchema);
