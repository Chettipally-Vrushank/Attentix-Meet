interface Props {
  label:    string;
  value:    string | number;
  sub?:     string;
  accent?:  string;
  icon?:    React.ReactNode;
}

export function StatCard({ label, value, sub, accent = "var(--accent)", icon }: Props) {
  return (
    <div style={{
      background:   "var(--bg-surface)",
      border:       "1px solid var(--border)",
      borderRadius: 12,
      padding:      "22px 24px",
      position:     "relative",
      overflow:     "hidden",
    }}>
      {/* Accent strip */}
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0,
        height: 2, background: accent,
      }}/>

      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
        <div>
          <p style={{ fontSize: 11, color: "var(--text-muted)", letterSpacing: "0.08em",
            textTransform: "uppercase", marginBottom: 8, fontFamily: "var(--font-mono)" }}>
            {label}
          </p>
          <p style={{ fontSize: 32, fontWeight: 600, lineHeight: 1,
            fontFamily: "var(--font-mono)", color: "var(--text-primary)" }}>
            {value}
          </p>
          {sub && (
            <p style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 6 }}>
              {sub}
            </p>
          )}
        </div>
        {icon && (
          <div style={{
            padding: 10, borderRadius: 8,
            background: `${accent}18`,
            color: accent,
          }}>
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}
