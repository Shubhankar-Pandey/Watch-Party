export type Role = "host" | "moderator" | "participant";

export interface Participant {
  username: string;
  userId: number;
  role: Role;
}

export interface RoomInfo {
  roomId: string;
  videoId?: string;
  mode: "create" | "join";
}

export interface ChatMessage {
  username: string;
  userId: number;
  message: string;
}

export interface SyncState {
  playState: "playing" | "paused";
  currentTime: number;
  videoId: string;
}

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}
