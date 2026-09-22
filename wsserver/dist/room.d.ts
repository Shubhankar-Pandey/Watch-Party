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
export declare class Room {
    host: [string, number];
    participants: Map<string, ParticipantInfo>;
    videoId: string;
    roomId: string;
    playState: "playing" | "paused";
    currentTime: number;
    chatMessages: ChatMessage[];
    constructor(username: string, userId: number, roomId: string, videoId: string, socket: WebSocket);
    addParticipant(username: string, userId: number, socket: WebSocket, role?: Role): void;
    leaveParticipant(username: string): void;
    getRole(username: string): Role | undefined;
    canControlPlayback(username: string): boolean;
    broadcast(message: any, excludeUsername?: string): void;
    getParticipantList(): {
        username: string;
        userId: number;
        role: Role;
    }[];
}
export {};
//# sourceMappingURL=room.d.ts.map