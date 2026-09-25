import { initialsFor } from "@/lib/admin/people";

const SIZE = {
  sm: "h-9 w-9 text-[13px]",
  md: "h-10 w-10 text-[14px]",
  lg: "h-14 w-14 text-[20px]",
} as const;

export interface PersonAvatarProps {
  fullName: string | null;
  email: string;
  size?: keyof typeof SIZE;
  /** A deactivated person: the same disc, greyed out. */
  muted?: boolean;
}

/** One or two initials in a disc. Decorative: the name always sits next to it,
 * so a screen reader skips it. Pure markup — usable from a server or a client
 * component. */
export function PersonAvatar({ fullName, email, size = "md", muted = false }: PersonAvatarProps) {
  return (
    <span
      aria-hidden="true"
      className={`flex shrink-0 select-none items-center justify-center rounded-full font-semibold ${SIZE[size]} ${
        muted ? "bg-border/60 text-text-secondary" : "bg-primary/10 text-primary"
      }`}
    >
      {initialsFor(fullName, email)}
    </span>
  );
}
