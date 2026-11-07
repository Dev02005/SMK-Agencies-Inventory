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
  onQuickAdd,
}: {
  user: Profile;
  role: Role;
  notices: Promise<Notice[]>;
  onQuickAdd: () => void;
}) {
  return (
    <header className="frosted sticky top-0 z-30 border-b border-black/[0.05] pt-[env(safe-area-inset-top)] print:hidden">
      <div className="mx-auto flex h-14 max-w-[1200px] items-center gap-3 px-4 md:px-8">
        <Link href="/" className="flex items-center gap-2 md:hidden">
          <Image src="/logo.png" alt="Sri Kameswari Agencies" width={110} height={46} priority className="h-7 w-auto object-contain" />
        </Link>

        <SearchBox role={role} className="hidden md:block" />

        <div className="ml-auto flex items-center gap-2.5">
          <NotificationBell notices={notices} role={role} profileId={user.id} />
          {/* Signature Squircle Quick Add Button */}
          <button
            type="button"
            onClick={onQuickAdd}
            aria-label="Quick add"
            title="Quick add"
            className="grid size-9 place-items-center rounded-xl bg-accent-soft text-accent transition-all hover:bg-accent hover:text-white shadow-xs active:scale-95 cursor-pointer"
          >
            <Plus size={17} strokeWidth={2.25} aria-hidden />
          </button>
          <ProfileMenu user={user} role={role} />
        </div>
      </div>
    </header>
  );
}
