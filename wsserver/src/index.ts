import dotenv from "dotenv";
dotenv.config();
import { WebSocketServer } from "ws";
import { RoomManager } from "./roomManager.js";
import jwt from "jsonwebtoken";

declare module "http" {
    interface IncomingMessage {
        userId?: number;
        username?: string;
    }
}

const PORT = Number(process.env.PORT) || 8080;
const JWT_SECRET = process.env.JWT_SECRET;
if (!PORT) {
    throw new Error("PORT is missing");
}
if (!JWT_SECRET) {
    throw new Error("JWT_SECRET is missing");
}

interface myJwtPayload extends jwt.JwtPayload {
    userId: number;
    username: string;
}

const roomManager = new RoomManager();

const wss = new WebSocketServer({ port: PORT });

wss.on("connection", (socket, req) => {
    // req.url = "/slgsngsjgn22343"
    const token = req.url?.slice(1); // remove the leading "/"
    console.log("token = ", token);
    if (!token) {
        socket.close(1008, "Token is missing");
        return;
    }
    try {
        const decoded = jwt.verify(token, JWT_SECRET) as myJwtPayload;
        const username = decoded.username;
        const userId = decoded.userId;
        // console.log("decoded = ", decoded);

        socket.on("message", (data) => {
            const message = JSON.parse(data.toString());
            roomManager.messageHandler(message, username, userId, socket);
        });

        socket.on("close", () => {
            // user closed the tab without sending leave_room — you still need to clean them up
            roomManager.handleDisconnect(username, userId, socket);
        });
    } catch (err) {
        socket.close(1008, "Invalid token"); // 1008 = policy violation
    }
});
