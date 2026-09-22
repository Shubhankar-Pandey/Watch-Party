interface TopBarProps {
  roomId?: string;
  connected: boolean;
  onLeave: () => void;
}

export function TopBar({ roomId, connected, onLeave }: TopBarProps) {
  return (
    <div className="h-14 border-b flex items-center justify-between px-5">
      <div>
        <span className="font-bold">Room:</span> {roomId}
      </div>

      <div>
        {connected ? (
          <span className="text-green-600">● Connected</span>
        ) : (
          <span className="text-red-600">● Disconnected</span>
        )}
      </div>

      <button onClick={onLeave} className="border px-3 py-1">
        Leave
      </button>
    </div>
  );
}
