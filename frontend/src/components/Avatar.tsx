import { User } from "@/types";

export function Avatar({ user, size = 32 }: { user: Pick<User, "name" | "avatarUrl">; size?: number }) {
  if (user.avatarUrl) {
    return <img src={user.avatarUrl} alt={user.name} width={size} height={size} referrerPolicy="no-referrer" className="rounded-full object-cover" style={{ width: size, height: size }} />;
  }
  return (
    <div className="rounded-full bg-brand-500 text-white flex items-center justify-center text-sm font-medium" style={{ width: size, height: size }}>
      {user.name[0]?.toUpperCase()}
    </div>
  );
}
