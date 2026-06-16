"use client";
import { useRouter, usePathname } from "next/navigation";
import { useMeetingStore } from "@/lib/store";
import Link from "next/link";
import { Video, BarChart2, User, LogOut } from "lucide-react";

export function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const { userName, setAuth } = useMeetingStore();

  const handleLogout = () => {
    setAuth("", "", "");
    router.push("/login");
  };

  const navItems = [
    { label: "Create Meeting", path: "/meeting/create", icon: <Video size={16} /> },
    { label: "Analytics", path: "/analytics", icon: <BarChart2 size={16} /> },
    { label: "Profile", path: "/profile", icon: <User size={16} /> },
  ];

  return (
    <header style={{
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      padding: "14px 32px",
      borderBottom: "1px solid var(--border)",
      background: "rgba(17, 17, 24, 0.8)",
      backdropFilter: "blur(12px)",
      position: "sticky",
      top: 0,
      zIndex: 100,
    }}>
      {/* Brand Logo */}
      <Link href="/meeting/create" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none", color: "inherit" }}>
        <div style={{
          width: 28,
          height: 28,
          borderRadius: 6,
          background: "linear-gradient(135deg, var(--accent), #a855f7)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontWeight: "bold",
          boxShadow: "0 2px 8px var(--accent-glow)",
        }}>
          ⬡
        </div>
        <span style={{ fontWeight: 700, fontSize: 16, letterSpacing: "-0.5px" }}>NexusMeet</span>
      </Link>

      {/* Nav Links */}
      <nav style={{ display: "flex", gap: 8 }}>
        {navItems.map((item) => {
          const isActive = pathname === item.path;
          return (
            <Link
              key={item.path}
              href={item.path}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "8px 16px",
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 500,
                textDecoration: "none",
                transition: "all 0.15s ease",
                background: isActive ? "var(--bg-overlay)" : "transparent",
                border: isActive ? "1px solid var(--border-bright)" : "1px solid transparent",
                color: isActive ? "#fff" : "var(--text-secondary)",
              }}
            >
              {item.icon}
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* User Actions */}
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        {/* User initials bubble */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 30,
            height: 30,
            borderRadius: "50%",
            background: "var(--bg-raised)",
            border: "1px solid var(--border)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 13,
            fontWeight: 600,
            color: "var(--accent)",
          }}>
            {userName?.charAt(0).toUpperCase()}
          </div>
          <span style={{ fontSize: 13, fontWeight: 500, color: "var(--text-primary)" }}>{userName}</span>
        </div>

        {/* Separator */}
        <div style={{ width: 1, height: 16, background: "var(--border)" }} />

        {/* Logout Button */}
        <button
          onClick={handleLogout}
          style={{
            background: "transparent",
            border: "none",
            color: "var(--text-secondary)",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 6,
            fontSize: 13,
            fontWeight: 500,
            padding: "6px 10px",
            borderRadius: 6,
            transition: "all 0.15s ease",
          }}
        >
          <LogOut size={14} />
          Logout
        </button>
      </div>
    </header>
  );
}
