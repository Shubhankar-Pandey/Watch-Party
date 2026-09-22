import type { Participant, Role } from "./liveRoom.types";

interface ParticipantsPanelProps {
  participants: Participant[];
  myRole: Role;
  onAssignModerator: (username: string) => void;
  onRemoveParticipant: (username: string) => void;
}

export function ParticipantsPanel({
  participants,
  myRole,
  onAssignModerator,
  onRemoveParticipant,
}: ParticipantsPanelProps) {
  return (
    <div className="w-1/4 overflow-y-auto">
      <div className="p-4 border-b">
        <h2 className="font-bold">Participants</h2>
      </div>

      <div className="p-4">
        {participants.map((participant) => (
          <div key={participant.userId} className="border-b py-3">
            <div className="flex justify-between gap-3">
              <div>
                <p className="font-semibold">{participant.username}</p>
                <p className="text-sm text-gray-500">{participant.role}</p>
              </div>

              {myRole === "host" && participant.role === "participant" && (
                <div className="flex gap-2">
                  <button
                    onClick={() => onAssignModerator(participant.username)}
                    className="border px-2 py-1 text-sm"
                  >
                    Moderator
                  </button>

                  <button
                    onClick={() => onRemoveParticipant(participant.username)}
                    className="border px-2 py-1 text-sm"
                  >
                    Remove
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
