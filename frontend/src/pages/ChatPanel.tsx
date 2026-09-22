import type { ChatMessage } from "./liveRoom.types";

interface ChatPanelProps {
  messages: ChatMessage[];
  chatInput: string;
  onChatInputChange: (value: string) => void;
  onSend: () => void;
}

export function ChatPanel({
  messages,
  chatInput,
  onChatInputChange,
  onSend,
}: ChatPanelProps) {
  return (
    <div className="w-1/4 border-r flex flex-col">
      <div className="p-4 border-b">
        <h2 className="font-bold">Chat</h2>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {messages.map((chat, index) => (
          <div key={index} className="mb-3">
            <p className="font-bold">{chat.username}</p>
            <p className="wrap-break-word">{chat.message}</p>
          </div>
        ))}
      </div>

      <div className="p-3 border-t flex gap-2">
        <input
          value={chatInput}
          onChange={(e) => onChatInputChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              onSend();
            }
          }}
          placeholder="Type a message..."
          className="border p-2 flex-1"
        />

        <button onClick={onSend} className="border px-3">
          Send
        </button>
      </div>
    </div>
  );
}
