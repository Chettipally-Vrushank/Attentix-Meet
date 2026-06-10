"use client";
import { useState }     from "react";
import { useRouter }    from "next/navigation";
import { useMeetingStore } from "@/lib/store";

const SIGNAL_URL = process.env.NEXT_PUBLIC_SIGNAL_URL ?? "http://localhost:3001";

export default function LoginPage() {
  const router   = useRouter();
  const setAuth  = useMeetingStore(s => s.setAuth);
  const [email,  setEmail]  = useState("");
  const [pass,   setPass]   = useState("");
  const [error,  setError]  = useState("");
  const [loading,setLoading]= useState(false);

  const handleLogin = async () => {
    setLoading(true); setError("");
    try {
      const res  = await fetch(`${SIGNAL_URL}/api/auth/login`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ email, password: pass }),
      });
      if (!res.ok) throw new Error("Invalid credentials");
      const { token, user } = await res.json();
      setAuth(token, user.id, user.name);
      router.push("/");
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight:      "100vh",
      display:        "flex",
      alignItems:     "center",
      justifyContent: "center",
      background:     "var(--bg-base)",
    }}>
      <div style={{
        width:        380,
        background:   "var(--bg-surface)",
        border:       "1px solid var(--border)",
        borderRadius: 16,
        padding:      40,
      }}>
        <div style={{ marginBottom: 32 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 10,
            background: "var(--accent)", marginBottom: 20,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <span style={{ fontSize: 20 }}>⬡</span>
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 600, marginBottom: 6 }}>Sign in</h1>
          <p style={{ color: "var(--text-secondary)", fontSize: 14 }}>
            Access is by invitation only
          </p>
        </div>

        {error && (
          <div style={{
            background: "var(--danger-soft)", border: "1px solid var(--danger)",
            borderRadius: 8, padding: "10px 14px",
            fontSize: 13, color: "var(--danger)", marginBottom: 16,
          }}>
            {error}
          </div>
        )}

        {[
          { label: "Email", value: email, set: setEmail, type: "email" },
          { label: "Password", value: pass, set: setPass, type: "password" },
        ].map(({ label, value, set, type }) => (
          <div key={label} style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 12, color: "var(--text-secondary)", display: "block", marginBottom: 6 }}>
              {label}
            </label>
            <input
              type={type} value={value}
              onChange={e => set(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleLogin()}
              style={{
                width: "100%", padding: "10px 14px",
                background: "var(--bg-raised)", border: "1px solid var(--border)",
                borderRadius: 8, color: "var(--text-primary)",
                fontSize: 14, outline: "none",
                fontFamily: "var(--font-sans)",
              }}
            />
          </div>
        ))}

        <button
          onClick={handleLogin}
          disabled={loading}
          style={{
            width: "100%", padding: "11px",
            background: loading ? "var(--accent-soft)" : "var(--accent)",
            border: "none", borderRadius: 8,
            color: "#fff", fontSize: 14, fontWeight: 600,
            cursor: loading ? "not-allowed" : "pointer",
            marginTop: 8, transition: "background 0.15s",
          }}
        >
          {loading ? "Signing in..." : "Sign in →"}
        </button>
      </div>
    </div>
  );
}
