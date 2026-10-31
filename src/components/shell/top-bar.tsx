import { Plus } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { NotificationBell } from "@/components/notifications/notification-bell";
import type { Profile, Role } from "@/lib/data/types";
import type { Notice } from "@/lib/notices";
import { ProfileMenu } from "./profile-menu";
import { SearchBox } from "./search-box";

export function TopBar({
  user,
  role,
  notices,
  onRoleChange,
  onQuickAdd,
}: {
  user: Profile;
  role: Role;
  notices: Notice[];
  onRoleChange: (role: Role) => void;
  onQuickAdd: () => void;
}) {
  return (
    <header className="frosted sticky top-0 z-30 border-b border-black/[0.05] pt-[env(safe-area-inset-top)] print:hidden">
      <div className="mx-auto flex h-14 max-w-[1200px] items-center gap-3 px-4 md:px-8">
        <Link href="/" className="flex items-center gap-2 md:hidden">
          <Image src="/icon.svg" alt="" width={28} height={28} unoptimized className="rounded-[7px]" />
          <span className="text-[17px] font-semibold tracking-[-0.3px] text-ink">SKA</span>
        </Link>

        <SearchBox role={role} className="hidden md:block" />

        <div className="ml-auto flex items-center gap-2">
          <NotificationBell notices={notices} role={role} profileId={user.id} />
          <button
            type="button"
            onClick={onQuickAdd}
            aria-label="Quick add"
            title="Quick add"
            className="grid size-9 place-items-center rounded-full bg-accent-soft text-accent transition-colors hover:bg-accent hover:text-white"
          >
            <Plus size={20} strokeWidth={2} aria-hidden />
          </button>
          <ProfileMenu user={user} role={role} onRoleChange={onRoleChange} />
        </div>
      </div>
    </header>
  );
}
