import { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";

import type {
  ChatMessage,
  Participant,
  Role,
  RoomInfo,
} from "./liveRoom.types";
import { getUserIdFromStoredToken } from "./jwt";
import { useRoomSocket } from "./UseRoomSocket";
import { useYouTubePlayer } from "./useYouTubePlayer";
import { TopBar } from "./TopBar";
import { VideoPanel } from "./VideoPanel";
import { ChatPanel } from "./ChatPanel";
import { ParticipantsPanel } from "./ParticipantsPanel";

export function LiveRoom() {
  const roomInfoRef = useRef<RoomInfo | null>(null);

  const [roomInfo, setRoomInfo] = useState<RoomInfo | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [myRole, setMyRole] = useState<Role>("participant");

  const [videoId, setVideoId] = useState("");
  const [newVideoId, setNewVideoId] = useState("");

  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");

  function canControlPlayback() {
    return myRole === "host" || myRole === "moderator";
  }

  /*
   * ==================================================
   * LOAD ROOM
   * ==================================================
   */
  useEffect(() => {
    const storedRoom = localStorage.getItem("watchPartyRoom");

    if (!storedRoom) {
      toast.error("Room information not found");

      return;
    }

    try {
      const parsedRoom: RoomInfo = JSON.parse(storedRoom);

      roomInfoRef.current = parsedRoom;
      setRoomInfo(parsedRoom);

      if (parsedRoom.videoId) {
        setVideoId(parsedRoom.videoId);
      }
    } catch (error) {
      console.error("Invalid room information", error);
      toast.error("Invalid room information");
    }
  }, []);

  /*
   * ==================================================
   * WEBSOCKET
   * ==================================================
   */
  const { connected, sendMessage } = useRoomSocket({
    roomInfo,
    onMessage: handleServerMessage,
  });

  /*
   * ==================================================
   * YOUTUBE PLAYER
   * ==================================================
   */
  const youtubePlayer = useYouTubePlayer({
    videoId,
    setVideoId,
    canControlPlayback,
    onLocalPlaybackAction: (action, time) => {
      sendMessage(
        action === "seek"
          ? { action, roomId: roomInfoRef.current?.roomId, time }
          : {
              action,
              roomId: roomInfoRef.current?.roomId,
              currentTime: time,
            },
      );
    },
  });

  /*
   * ==================================================
   * SERVER MESSAGE
   * ==================================================
   */
  function handleServerMessage(message: any) {
    console.log("WS message:", message);

    switch (message.type) {
      case "room_created": {
        setMyRole("host");
        setParticipants(message.participants);

        youtubePlayer.queuePendingSync({
          playState: message.playState,
          currentTime: message.currentTime,
          videoId: message.videoId,
        });

        setVideoId(message.videoId);

        if (message.chatMessages) {
          setChatMessages(message.chatMessages);
        }

        break;
      }

      case "room_joined": {
        console.log("ROOM JOINED:", message);

        setParticipants(message.participants);
        updateMyRole(message.participants);
        setChatMessages(message.chatMessages || []);

        /*
         * Save state before changing videoId. The YouTube player
         * will consume this once it becomes ready.
         */
        youtubePlayer.queuePendingSync({
          playState: message.playState,
          currentTime: message.currentTime,
          videoId: message.videoId,
        });

        setVideoId(message.videoId);

        break;
      }

      case "sync_state": {
        youtubePlayer.applySyncState(message);
        break;
      }

      case "user_joined":
      case "user_left":
      case "role_assigned": {
        setParticipants(message.participants);
        updateMyRole(message.participants);
        break;
      }

      case "participant_removed": {
        setParticipants(message.participants);
        break;
      }

      case "chat_history": {
        setChatMessages(message.messages || []);
        break;
      }

      case "chat_message": {
        setChatMessages((previous) => [
          ...previous,
          {
            username: message.username,
            userId: message.userId,
            message: message.message,
          },
        ]);

        break;
      }

      case "error": {
        toast.error(message.message);
        break;
      }

      default: {
        console.log("Unknown message:", message);
      }
    }
  }

  function updateMyRole(list: Participant[]) {
    const userId = getUserIdFromStoredToken();

    if (userId == null) {
      return;
    }

    const currentUser = list.find(
      (participant) => participant.userId === userId,
    );

    if (currentUser) {
      setMyRole(currentUser.role);
    }
  }

  /*
   * ==================================================
   * ACTIONS
   * ==================================================
   */
  function changeVideo() {
    if (!canControlPlayback()) {
      toast.error("You cannot change the video");
      return;
    }

    if (!newVideoId.trim()) {
      toast.error("Enter a video ID");
      return;
    }

    sendMessage({
      action: "change_video",
      roomId: roomInfo?.roomId,
      videoId: newVideoId.trim(),
    });

    setNewVideoId("");
  }

  function sendChatMessage() {
    if (!chatInput.trim()) {
      return;
    }

    sendMessage({
      action: "chat_message",
      roomId: roomInfo?.roomId,
      message: chatInput.trim(),
    });

    setChatInput("");
  }

  function assignModerator(username: string) {
    if (myRole !== "host") {
      return;
    }

    sendMessage({
      action: "assign_role",
      roomId: roomInfo?.roomId,
      username,
      role: "moderator",
    });
  }

  function removeParticipant(username: string) {
    if (myRole !== "host") {
      return;
    }

    sendMessage({
      action: "remove_participant",
      roomId: roomInfo?.roomId,
      username,
    });
  }

  function leaveRoom() {
    sendMessage({
      action: "leave_room",
      roomId: roomInfo?.roomId,
    });

    localStorage.removeItem("watchPartyRoom");
    window.location.href = "/meetRoom";
  }

  /*
   * ==================================================
   * UI
   * ==================================================
   */
  return (
    <div className="w-screen h-screen flex flex-col">
      <TopBar
        roomId={roomInfo?.roomId}
        connected={connected}
        onLeave={leaveRoom}
      />

      <div className="flex flex-1 min-h-0">
        <VideoPanel
          containerId={youtubePlayer.containerId}
          myRole={myRole}
          canControlPlayback={canControlPlayback()}
          isPlaying={youtubePlayer.isPlaying}
          currentTime={youtubePlayer.currentTime}
          duration={youtubePlayer.duration}
          volume={youtubePlayer.volume}
          needsUnmute={youtubePlayer.needsUnmute}
          onTogglePlayPause={youtubePlayer.togglePlayPause}
          onSeek={youtubePlayer.handleSeek}
          onVolumeChange={youtubePlayer.handleVolume}
          onUnmute={youtubePlayer.unmutePlayback}
          newVideoId={newVideoId}
          onNewVideoIdChange={setNewVideoId}
          onChangeVideo={changeVideo}
        />

        <ChatPanel
          messages={chatMessages}
          chatInput={chatInput}
          onChatInputChange={setChatInput}
          onSend={sendChatMessage}
        />

        <ParticipantsPanel
          participants={participants}
          myRole={myRole}
          onAssignModerator={assignModerator}
          onRemoveParticipant={removeParticipant}
        />
      </div>
    </div>
  );
}
