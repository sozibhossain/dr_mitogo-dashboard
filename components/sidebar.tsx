"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Users2,
  Bell,
  Zap,
  Wind,
  Eye,
  Settings,
  Ticket,
  BarChart3,
  Shield,
  CheckCircle,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import Image from "next/image";
import { signOut } from "next-auth/react";

const navigation = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/users", label: "User Management", icon: Users },
  { href: "/groups", label: "Groups", icon: Users2 },
  { href: "/notifications", label: "Push Notifications", icon: Bell },
  { href: "/ghost-system", label: "Ghost System", icon: Zap },
  { href: "/fomo-windows", label: "FOMO Windows", icon: Wind },
  { href: "/content", label: "Content Moderation", icon: Eye },
  { href: "/ai-settings", label: "AI & Automation", icon: Settings },
  { href: "/verification", label: "Verification", icon: CheckCircle },
  { href: "/support", label: "Support Tickets", icon: Ticket },
  { href: "/ads", label: "Ad Campaigns", icon: BarChart3 },
  { href: "/security", label: "Security", icon: Shield },
];

export default function Sidebar() {
  const pathname = usePathname();

  const handleLogout = async () => {
    // Redirect user after logout (change to your login route)
    await signOut({ callbackUrl: "/login" });
  };

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 bg-white border-r border-border overflow-y-auto shadow-md flex flex-col">
      <div className="p-2 border-b border-border">
        <div className="flex justify-center items-center">
          <Image
            src="/logo-mitago.png"
            alt="Logo"
            width={100}
            height={100}
            className="w-24 h-24"
          />
        </div>
      </div>

      <nav className="px-3 py-6 space-y-2 flex-1">
        {navigation.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all duration-200 font-medium text-sm",
                isActive
                  ? "bg-primary text-primary-foreground shadow-md scale-[1.02]"
                  : "text-foreground hover:bg-secondary/80 hover:text-primary"
              )}
            >
              <Icon className="w-5 h-5" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Logout pinned at bottom */}
      <div className="px-3 pb-6">
        <button
          onClick={handleLogout}
          className={cn(
            "w-full flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all duration-200 font-medium text-sm",
            "text-foreground hover:bg-secondary/80 hover:text-primary"
          )}
        >
          <LogOut className="w-5 h-5" />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
}
