import React, { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { Users, Calendar, MapPin, CalendarOff, Menu, Bell, Clock, Hammer, Zap } from "lucide-react";
import { CactusHardHat } from "@/components/icons/CactusHardHat";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { useGetCrewUnreadCount } from "@workspace/api-client-react";

function useStoredCrewId() {
  const [crewId, setCrewId] = useState<number | null>(() => {
    const v = localStorage.getItem("cc_crew_id");
    return v ? parseInt(v) : null;
  });
  useEffect(() => {
    const onStorage = () => {
      const v = localStorage.getItem("cc_crew_id");
      setCrewId(v ? parseInt(v) : null);
    };
    window.addEventListener("storage", onStorage);
    window.addEventListener("cc_crew_id_changed", onStorage);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("cc_crew_id_changed", onStorage);
    };
  }, []);
  return crewId;
}

function UnreadBadge({ crewId }: { crewId: number }) {
  const { data } = useGetCrewUnreadCount(crewId, {
    query: { refetchInterval: 30000, retry: false },
  });
  if (!data || data.unread === 0) return null;
  return (
    <Badge className="ml-auto h-5 px-1.5 min-w-[20px] text-xs bg-destructive text-destructive-foreground">
      {data.unread > 9 ? "9+" : data.unread}
    </Badge>
  );
}

const NavItems = () => {
  const [location] = useLocation();
  const crewId = useStoredCrewId();

  const navLinks = [
    { href: "/", label: "Dashboard", icon: Calendar },
    { href: "/jobs", label: "Jobs", icon: Hammer },
    { href: "/crew", label: "Crew", icon: Users },
    { href: "/locations", label: "Locations", icon: MapPin },
    { href: "/time-off", label: "Time Off", icon: CalendarOff },
    { href: "/time-clock", label: "Time Clock", icon: Clock },
    { href: "/notifications", label: "Notifications", icon: Bell },
    { href: "/quests", label: "Side Quests", icon: Zap },
  ];

  return (
    <nav className="flex flex-col gap-2 p-4">
      {navLinks.map((link) => {
        const isActive = location === link.href || (link.href !== "/" && location.startsWith(link.href));
        return (
          <Link
            key={link.href}
            href={link.href}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-md transition-colors text-sm font-medium ${isActive ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary hover:text-foreground"}`}
          >
            <link.icon className="h-4 w-4 shrink-0" />
            {link.label}
            {link.href === "/notifications" && crewId && <UnreadBadge crewId={crewId} />}
          </Link>
        );
      })}
    </nav>
  );
};

export const AppLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="flex min-h-[100dvh] w-full bg-background text-foreground">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 border-r border-border bg-card">
        <div className="p-6 border-b border-border flex items-center gap-2">
          <div className="bg-primary p-2 rounded-md">
            <CactusHardHat className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="font-bold tracking-tight">Saguaro</span>
        </div>
        <div className="flex-1 overflow-y-auto">
          <NavItems />
        </div>
        <div className="p-4 border-t border-border">
          <div className="flex items-center gap-3 px-3 py-2">
            <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-sm font-semibold">
              FM
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-medium">Foreman</span>
              <span className="text-xs text-muted-foreground">Admin</span>
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile Header & Main Content */}
      <div className="flex-1 flex flex-col max-w-full overflow-hidden">
        <header className="md:hidden flex items-center justify-between p-4 border-b border-border bg-card">
          <div className="flex items-center gap-2">
            <div className="bg-primary p-1.5 rounded-md">
              <CactusHardHat className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-bold tracking-tight">Saguaro</span>
          </div>
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 w-64">
              <div className="p-6 border-b border-border flex items-center gap-2">
                <div className="bg-primary p-2 rounded-md">
                  <CactusHardHat className="h-5 w-5 text-primary-foreground" />
                </div>
                <span className="font-bold tracking-tight">Saguaro</span>
              </div>
              <NavItems />
            </SheetContent>
          </Sheet>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-8">
          <div className="max-w-6xl mx-auto h-full">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};
