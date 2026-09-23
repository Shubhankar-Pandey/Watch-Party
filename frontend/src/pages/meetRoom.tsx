import { useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

import { extractYouTubeVideoId } from "../youtube";

function generateRoomId() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

export function MeetRoom() {
  const navigate = useNavigate();

  const [videoUrl, setVideoUrl] = useState("");
  const [joinRoomId, setJoinRoomId] = useState("");

  function handleCreateRoom() {
    if (!videoUrl.trim()) {
      toast.error("Please enter a YouTube video URL");
      return;
    }

    const videoId = extractYouTubeVideoId(videoUrl);

    if (!videoId) {
      toast.error("Enter a valid YouTube video URL or ID");
      return;
    }

    const roomId = generateRoomId();

    // Store information required by LiveRoom
    localStorage.setItem(
      "watchPartyRoom",
      JSON.stringify({
        roomId,
        videoId,
        mode: "create",
      }),
    );

    navigate("/liveroom");
  }

  function handleJoinRoom() {
    if (!joinRoomId.trim()) {
      toast.error("Please enter room ID");
      return;
    }

    localStorage.setItem(
      "watchPartyRoom",
      JSON.stringify({
        roomId: joinRoomId.trim().toUpperCase(),
        mode: "join",
      }),
    );

    navigate("/liveroom");
  }

  return (
    <div className="w-screen min-h-screen flex items-center justify-center gap-10">
      {/* CREATE ROOM */}
      <div className="border border-gray-400 rounded-lg p-8 w-96">
        <h1 className="text-2xl font-bold mb-6">Create Room</h1>

        <label className="block mb-2">YouTube Video URL</label>

        <input
          type="text"
          value={videoUrl}
          onChange={(e) => setVideoUrl(e.target.value)}
          placeholder="e.g. https://www.youtube.com/watch?v=dQw4w9WgXcQ"
          className="border border-black p-2 w-full mb-5"
        />

        <button
          onClick={handleCreateRoom}
          className="border border-black px-4 py-2 w-full"
        >
          Create Room
        </button>
      </div>

      {/* JOIN ROOM */}
      <div className="border border-gray-400 rounded-lg p-8 w-96">
        <h1 className="text-2xl font-bold mb-6">Join Room</h1>

        <label className="block mb-2">Room ID</label>

        <input
          type="text"
          value={joinRoomId}
          onChange={(e) => setJoinRoomId(e.target.value)}
          placeholder="Enter room ID"
          className="border border-black p-2 w-full mb-5"
        />

        <button
          onClick={handleJoinRoom}
          className="border border-black px-4 py-2 w-full"
        >
          Join Room
        </button>
      </div>
    </div>
  );
}
