import type { User } from "@/types";

const COLORS = ["#6c63ff", "#ff6b6b", "#51cf66", "#fcc419", "#339af0", "#f06595"];

interface PresenceAvatarsProps {
  users: User[];
}

export default function PresenceAvatars({ users }: PresenceAvatarsProps) {
  if (users.length === 0) return null;

  return (
    <div className="flex -space-x-2">
      {users.slice(0, 5).map((user, i) => {
        const initials = user.display_name
          .split(" ")
          .map((n) => n[0])
          .join("")
          .slice(0, 2)
          .toUpperCase();

        return (
          <div
            key={user.id}
            title={user.display_name}
            className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-semibold text-white border-2 border-white"
            style={{ backgroundColor: COLORS[i % COLORS.length] }}
          >
            {initials}
          </div>
        );
      })}
      {users.length > 5 && (
        <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-medium text-gray-600 bg-gray-200 border-2 border-white">
          +{users.length - 5}
        </div>
      )}
    </div>
  );
}
