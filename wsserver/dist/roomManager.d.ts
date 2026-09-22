import { Room } from "./room.js";
import { WebSocket } from "ws";
export declare class RoomManager {
    rooms: Map<string, Room>;
    constructor();
    messageHandler(message: any, username: string, userId: number, socket: WebSocket): void;
    private denied;
    handleDisconnect(username: string, userId: number, socket: WebSocket): void;
}
//# sourceMappingURL=roomManager.d.ts.map