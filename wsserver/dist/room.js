import { WebSocket } from "ws";
export class Room {
    host;
    participants;
    videoId;
    roomId;
    playState = "paused";
    currentTime = 0;
    chatMessages;
    constructor(username, userId, roomId, videoId, socket) {
        this.host = [username, userId];
        this.roomId = roomId;
        this.videoId = videoId;
        this.participants = new Map();
        this.chatMessages = [];
        this.addParticipant(username, userId, socket, "host");
    }
    addParticipant(username, userId, socket, role = "participant") {
        this.participants.set(username, {
            userId,
            role,
            socket,
        });
    }
    leaveParticipant(username) {
        this.participants.delete(username);
    }
    getRole(username) {
        return this.participants.get(username)?.role;
    }
    canControlPlayback(username) {
        const role = this.getRole(username);
        return role === "host" || role === "moderator";
    }
    broadcast(message, excludeUsername) {
        const payload = JSON.stringify(message);
        for (const [username, info] of this.participants) {
            if (username === excludeUsername) {
                continue;
            }
            if (info.socket.readyState === info.socket.OPEN) {
                info.socket.send(payload);
            }
        }
    }
    getParticipantList() {
        return Array.from(this.participants.entries()).map(([username, info]) => ({
            username,
            userId: info.userId,
            role: info.role,
        }));
    }
}
//# sourceMappingURL=room.js.map