"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useMeetingStore } from "@/lib/store";

export default function HomePage() {
  const router = useRouter();
  const { token } = useMeetingStore();

  useEffect(() => {
    if (!token) {
      router.push("/login");
    } else {
      router.push("/meeting/create");
    }
  }, [token, router]);

  return (
    <div style={{
      minHeight: "100vh",
      background: "var(--bg-base)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center"
    }}>
      <div style={{
        width: 32,
        height: 32,
        border: "2px solid var(--accent)",
        borderTopColor: "transparent",
        borderRadius: "50%",
        animation: "spin 0.8s linear infinite",
      }}/>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
