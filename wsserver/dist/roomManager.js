import { Room } from "./room.js";
import { WebSocket } from "ws";
export class RoomManager {
    rooms;
    constructor() {
        this.rooms = new Map();
    }
    messageHandler(message, username, userId, socket) {
        const action = message.action;
        console.log("WS ACTION:", action, "USER:", username, "ROOM:", message.roomId);
        // create room by host 
        if (action === "create_room") {
            const existingRoom = this.rooms.get(message.roomId);
            if (existingRoom) {
                // The room already exists. If this is the ORIGINAL
                // host reconnecting (e.g. they refreshed the page),
                // their previous socket already closed and was
                // removed from participants by handleDisconnect -
                // without this, they'd be stuck: their local video
                // keeps working (it's independent of the server),
                // but every play/pause/seek they send would be
                // silently denied server-side since they're no
                // longer a registered participant, and nothing
                // would ever get broadcast to anyone else. Re-
                // register them as host on their new socket instead
                // of just rejecting them.
                if (existingRoom.host[0] === username) {
                    existingRoom.addParticipant(username, userId, socket, "host");
                    socket.send(JSON.stringify({
                        type: "room_created",
                        roomId: existingRoom.roomId,
                        videoId: existingRoom.videoId,
                        playState: existingRoom.playState,
                        currentTime: existingRoom.currentTime,
                        participants: existingRoom.getParticipantList(),
                        chatMessages: existingRoom.chatMessages,
                    }));
                    existingRoom.broadcast({
                        type: "user_joined",
                        username,
                        userId,
                        role: "host",
                        participants: existingRoom.getParticipantList(),
                    }, username);
                    return;
                }
                socket.send(JSON.stringify({
                    type: "error",
                    message: "Room already exists",
                }));
                return;
            }
            const newRoom = new Room(username, userId, message.roomId, message.videoId, socket);
            this.rooms.set(message.roomId, newRoom);
            socket.send(JSON.stringify({
                type: "room_created",
                roomId: newRoom.roomId,
                videoId: newRoom.videoId,
                playState: newRoom.playState,
                currentTime: newRoom.currentTime,
                participants: newRoom.getParticipantList(),
                chatMessages: newRoom.chatMessages,
            }));
            return;
        }
        // if not create room, means join room 
        // therefore ther room should be exist 
        const room = this.rooms.get(message.roomId);
        if (!room) {
            socket.send(JSON.stringify({
                type: "error",
                message: "Room not found",
            }));
            return;
        }
        // join room 
        if (action === "join_room") {
            room.addParticipant(username, userId, socket, "participant");
            // Send EVERYTHING the new participant needs in one message.
            socket.send(JSON.stringify({
                type: "room_joined",
                roomId: room.roomId,
                videoId: room.videoId,
                playState: room.playState,
                currentTime: room.currentTime,
                participants: room.getParticipantList(),
                chatMessages: room.chatMessages,
            }));
            // Tell all OTHER users that someone joined.
            room.broadcast({
                type: "user_joined",
                username,
                userId,
                role: "participant",
                participants: room.getParticipantList(),
            }, username);
            return;
        }
        // leave room 
        if (action === "leave_room") {
            room.leaveParticipant(username);
            room.broadcast({
                type: "user_left",
                username,
                userId,
                participants: room.getParticipantList(),
            });
            return;
        }
        // play
        if (action === "play") {
            if (!room.canControlPlayback(username)) {
                return this.denied(socket);
            }
            room.playState = "playing";
            room.currentTime = message.currentTime ?? room.currentTime;
            room.broadcast({
                type: "sync_state",
                playState: room.playState,
                currentTime: room.currentTime,
                videoId: room.videoId,
            });
            return;
        }
        // pause
        if (action === "pause") {
            if (!room.canControlPlayback(username)) {
                return this.denied(socket);
            }
            room.playState = "paused";
            room.currentTime = message.currentTime ?? room.currentTime;
            room.broadcast({
                type: "sync_state",
                playState: room.playState,
                currentTime: room.currentTime,
                videoId: room.videoId,
            });
            return;
        }
        // seek 
        if (action === "seek") {
            if (!room.canControlPlayback(username)) {
                return this.denied(socket);
            }
            room.currentTime = Number(message.time);
            room.broadcast({
                type: "sync_state",
                playState: room.playState,
                currentTime: room.currentTime,
                videoId: room.videoId,
            });
            return;
        }
        // change video
        if (action === "change_video") {
            if (!room.canControlPlayback(username)) {
                return this.denied(socket);
            }
            if (typeof message.videoId !== "string" || !message.videoId.trim()) {
                socket.send(JSON.stringify({
                    type: "error",
                    message: "Video ID is required",
                }));
                return;
            }
            room.videoId = message.videoId.trim();
            room.currentTime = 0;
            room.playState = "paused";
            room.broadcast({
                type: "sync_state",
                playState: room.playState,
                currentTime: room.currentTime,
                videoId: room.videoId,
            });
            return;
        }
        // chat 
        if (action === "chat_message") {
            if (typeof message.message !== "string") {
                return;
            }
            const chatText = message.message.trim();
            if (!chatText) {
                return;
            }
            const chatMessage = {
                username,
                userId,
                message: chatText,
            };
            // store chat history 
            room.chatMessages.push(chatMessage);
            // Send to everyone currently in the room.
            room.broadcast({
                type: "chat_message",
                username,
                userId,
                message: chatText,
            });
            return;
        }
        // assign role 
        if (action === "assign_role") {
            if (room.getRole(username) !== "host") {
                return this.denied(socket);
            }
            const target = room.participants.get(message.username);
            if (!target) {
                socket.send(JSON.stringify({
                    type: "error",
                    message: "Participant not found",
                }));
                return;
            }
            if (message.role !== "moderator" && message.role !== "participant") {
                socket.send(JSON.stringify({
                    type: "error",
                    message: "Invalid role",
                }));
                return;
            }
            target.role = message.role;
            room.broadcast({
                type: "role_assigned",
                username: message.username,
                role: message.role,
                participants: room.getParticipantList(),
            });
            return;
        }
        // remove participants
        if (action === "remove_participant") {
            if (room.getRole(username) !== "host") {
                return this.denied(socket);
            }
            const targetUsername = message.username;
            const target = room.participants.get(targetUsername);
            if (!target) {
                socket.send(JSON.stringify({
                    type: "error",
                    message: "Participant not found",
                }));
                return;
            }
            room.leaveParticipant(targetUsername);
            // Tell the removed participant that they were removed.
            if (target.socket.readyState === target.socket.OPEN) {
                target.socket.send(JSON.stringify({
                    type: "participant_removed",
                    username: targetUsername,
                }));
            }
            //Tell remaining participants.
            room.broadcast({
                type: "participant_removed",
                username: targetUsername,
                participants: room.getParticipantList(),
            });
            return;
        }
        // unknown action 
        console.log("UNKNOWN WS ACTION:", JSON.stringify(action), message);
        socket.send(JSON.stringify({
            type: "error",
            message: `Unknown action: ${action}`,
        }));
    }
    denied(socket) {
        socket.send(JSON.stringify({
            type: "error",
            message: "Permission denied",
        }));
    }
    handleDisconnect(username, userId, socket) {
        for (const room of this.rooms.values()) {
            const info = room.participants.get(username);
            if (info && info.socket === socket) {
                room.leaveParticipant(username);
                room.broadcast({
                    type: "user_left",
                    username,
                    userId,
                    participants: room.getParticipantList(),
                });
                break;
            }
        }
    }
}
//# sourceMappingURL=roomManager.js.map