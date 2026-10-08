import Link from "next/link";
import { Heart, MessageSquare, Plus } from "lucide-react";
import { unreadCount } from "@propertyx/notifications";
import { unreadMessages } from "@propertyx/core";
import { db, getUser } from "@/lib/server";
import { Logo } from "./logo";
import { DesktopNav, MobileMenu, UserMenu, NotificationBell } from "./header-client";

export async function Header() {
  const user = await getUser();
  const [notif, msgs] = user ? await Promise.all([unreadCount(db, user.id), unreadMessages(db, user.id)]) : [0, 0];
  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/90 backdrop-blur-md">
      <div className="container-px flex h-16 items-center gap-3">
        <MobileMenu user={user ? { name: user.name } : null} />
        <Logo />
        <DesktopNav />
        <div className="ml-auto flex items-center gap-1 sm:gap-2">
          <Link href="/saved" className="btn-ghost hidden px-2.5 md:inline-flex" title="Saved">
            <Heart className="h-5 w-5" />
            <span className="hidden 2xl:inline">Saved</span>
          </Link>
          <Link href="/messages" className="btn-ghost relative hidden px-2.5 md:inline-flex" title="Messages">
            <MessageSquare className="h-5 w-5" />
            <span className="hidden 2xl:inline">Messages</span>
            {msgs > 0 && <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white">{msgs > 9 ? "9+" : msgs}</span>}
          </Link>
          {user && <NotificationBell count={notif} />}
          <Link href="/post-property" className="btn-gold hidden sm:inline-flex">
            <Plus className="h-4 w-4" /> <span className="hidden xl:inline">Post Property</span><span className="xl:hidden">Post</span>
          </Link>
          {user ? (
            <UserMenu user={{ name: user.name, email: user.email, roles: user.roles, isStaff: user.isStaff, avatarUrl: user.avatarUrl }} />
          ) : (
            <Link href="/login" className="btn-primary">
              <span className="hidden 2xl:inline">Login / Register</span><span className="2xl:hidden">Login</span>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
