import mongoose from "mongoose";
import { Users } from "./db.js";
import bcrypt from "bcrypt";
import dotenv from "dotenv";

dotenv.config();

async function test() {
    await mongoose.connect(process.env.MONGO_URL);
    try {
        const hashedPassword = await bcrypt.hash("Password1!", 10);
        await Users.create({
            email: "test_new_user@example.com",
            password: hashedPassword,
            name: "Test User",
            role: "user"
        });
        console.log("Success");
    } catch (e) {
        console.error("Error creating user:", e);
    } finally {
        mongoose.connection.close();
    }
}

test();
