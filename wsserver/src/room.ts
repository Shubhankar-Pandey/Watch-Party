import { WebSocket } from "ws";

export type Role = "host" | "moderator" | "participant";

interface ParticipantInfo {
    userId: number;
    role: Role;
    socket: WebSocket;
}

export interface ChatMessage {
    username: string;
    userId: number;
    message: string;
}

export class Room {
    public host: [string, number];

    public participants: Map<string, ParticipantInfo>;

    public videoId: string;

    public roomId: string;

    public playState: "playing" | "paused" = "paused";

    public currentTime: number = 0;

    public chatMessages: ChatMessage[];

    constructor(
        username: string,
        userId: number,
        roomId: string,
        videoId: string,
        socket: WebSocket,
    ) {
        this.host = [username, userId];

        this.roomId = roomId;

        this.videoId = videoId;

        this.participants = new Map<string, ParticipantInfo>();

        this.chatMessages = [];

        this.addParticipant(username, userId, socket, "host");
    }

    public addParticipant(
        username: string,
        userId: number,
        socket: WebSocket,
        role: Role = "participant",
    ) {
        this.participants.set(username, {
            userId,
            role,
            socket,
        });
    }

    public leaveParticipant(username: string) {
        this.participants.delete(username);
    }

    public getRole(username: string): Role | undefined {
        return this.participants.get(username)?.role;
    }

    public canControlPlayback(username: string): boolean {
        const role = this.getRole(username);

        return role === "host" || role === "moderator";
    }

    public broadcast(message: any, excludeUsername?: string) {
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

    public getParticipantList() {
        return Array.from(this.participants.entries()).map(([username, info]) => ({
            username,
            userId: info.userId,
            role: info.role,
        }));
    }
}
