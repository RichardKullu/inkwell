"use client";

import { useCollaboration, type PresenceUser } from "@/lib/collaboration/provider";

const ANIMAL_ICONS = ["🐱", "🐶", "🦊", "🐼", "🐨", "🦁", "🐯", "🐸", "🦉", "🐙", "🦋", "🐬", "🦄", "🐝", "🐢"];

function getIconForUser(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return ANIMAL_ICONS[Math.abs(hash) % ANIMAL_ICONS.length];
}

export default function PresenceAvatars() {
  const { presenceUsers, currentUserName } = useCollaboration();

  const allUsers: PresenceUser[] = [
    { name: currentUserName, color: "#6c63ff" },
    ...presenceUsers,
  ];

  return (
    <div className="flex items-center gap-1">
      {allUsers.slice(0, 8).map((user, i) => {
        const icon = getIconForUser(user.name);
        const isSelf = i === 0;

        return (
          <div
            key={user.name}
            title={isSelf ? `${user.name} (you)` : user.name}
            className="relative group"
          >
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-sm border-2 shadow-sm cursor-default"
              style={{ backgroundColor: user.color + "20", borderColor: user.color }}
            >
              {icon}
            </div>
            <div
              className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white"
              style={{ backgroundColor: isSelf ? "#22c55e" : user.color }}
            />
            <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-gray-900 text-white text-[10px] rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
              {isSelf ? "You" : user.name}
            </div>
          </div>
        );
      })}
      {allUsers.length > 8 && (
        <div className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-medium text-gray-600 bg-gray-200 border-2 border-white">
          +{allUsers.length - 8}
        </div>
      )}
    </div>
  );
}
