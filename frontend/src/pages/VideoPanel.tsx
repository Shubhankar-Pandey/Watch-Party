import { formatTime } from "./time";
import type { Role } from "./liveRoom.types";

interface VideoPanelProps {
  containerId: string;
  myRole: Role;
  canControlPlayback: boolean;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  needsUnmute: boolean;
  onTogglePlayPause: () => void;
  onSeek: (value: number) => void;
  onVolumeChange: (value: number) => void;
  onUnmute: () => void;
  newVideoId: string;
  onNewVideoIdChange: (value: string) => void;
  onChangeVideo: () => void;
}

export function VideoPanel({
  containerId,
  myRole,
  canControlPlayback,
  isPlaying,
  currentTime,
  duration,
  volume,
  needsUnmute,
  onTogglePlayPause,
  onSeek,
  onVolumeChange,
  onUnmute,
  newVideoId,
  onNewVideoIdChange,
  onChangeVideo,
}: VideoPanelProps) {
  return (
    <div className="w-1/2 p-4 border-r overflow-auto">
      <h2 className="text-xl font-bold mb-3">Watch Party</h2>

      <div className="relative">
        <div id={containerId} className="w-full aspect-video" />

        {needsUnmute && (
          <button
            onClick={onUnmute}
            className="absolute bottom-3 right-3 bg-black text-white text-sm px-3 py-1.5 rounded"
          >
            🔇 Tap to unmute
          </button>
        )}
      </div>

      <div className="mt-3 border rounded p-3">
        {canControlPlayback && (
          <div className="flex items-center gap-3">
            <button
              onClick={onTogglePlayPause}
              className="border px-3 py-2 rounded"
            >
              {isPlaying ? "Pause" : "Play"}
            </button>

            <input
              type="range"
              min="0"
              max={duration || 0}
              value={Math.min(currentTime, duration || 0)}
              onChange={(e) => onSeek(Number(e.target.value))}
              className="flex-1"
            />

            <span className="text-sm whitespace-nowrap">
              {formatTime(currentTime)}
              {" / "}
              {formatTime(duration)}
            </span>
          </div>
        )}

        <div className="flex items-center gap-3 mt-3">
          <span className="text-sm">Volume</span>

          <input
            type="range"
            min="0"
            max="100"
            value={volume}
            onChange={(e) => onVolumeChange(Number(e.target.value))}
            className="w-32"
          />

          <span>{volume}%</span>
        </div>

        {!canControlPlayback && (
          <p className="text-sm text-gray-500 mt-2">
            You can only control your own volume.
          </p>
        )}
      </div>

      <div className="mt-4">
        Your role: <strong>{myRole}</strong>
      </div>

      {canControlPlayback && (
        <div className="mt-5">
          <h3 className="font-bold mb-2">Change Video</h3>

          <div className="flex gap-2">
            <input
              value={newVideoId}
              onChange={(e) => onNewVideoIdChange(e.target.value)}
              placeholder="YouTube Video ID"
              className="border p-2 flex-1"
            />

            <button onClick={onChangeVideo} className="border px-3">
              Change
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
