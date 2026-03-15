"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { sessionsAPI } from "@/app/lib/api";
import { isAuthenticated } from "@/app/lib/auth";

interface Session {
  id: string;
  room_code: string;
  subject: string;
  status: string;
  created_at: string;
  ended_at: string | null;
  problem: { title: string; description: string; difficulty: string; } | null;
  hints: { id: string; trigger_type: string; hint_text: string; created_at: string; }[];
}

export default function HistoryPage() {
  const router = useRouter();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated()) { router.push("/login"); return; }
    sessionsAPI.getHistory().then((res) => { setSessions(res.data); setLoading(false); });
  }, [router]);

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" });

  const getDifficultyColor = (d: string) => {
    if (d === "easy") return { bg: "#dcfce7", text: "#166534" };
    if (d === "hard") return { bg: "#fee2e2", text: "#991b1b" };
    return { bg: "#fef9c3", text: "#854d0e" };
  };

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#f0ebe0" }}>
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0 24px", height: 56,
        backgroundColor: "#3d2f1a", borderBottom: "2px solid #c4b898",
      }}>
        <div style={{ fontFamily: "'Caveat', cursive", fontSize: 24, fontWeight: 700, color: "#fdf8f0" }}>
          2<span style={{ color: "#b85c2a" }}>Buddy</span>
        </div>
        <button
          onClick={() => router.push("/lobby")}
          style={{ padding: "5px 14px", backgroundColor: "transparent", border: "1.5px solid #c4b898", color: "#fdf8f0", fontFamily: "'Caveat', cursive", fontSize: 14, cursor: "pointer", borderRadius: 0 }}
        >
          Back to lobby
        </button>
      </div>

      <div style={{ maxWidth: 700, margin: "0 auto", padding: "40px 24px" }}>
        <div style={{ marginBottom: 32 }}>
          <h1 style={{ fontFamily: "'Caveat', cursive", fontSize: 32, fontWeight: 700, color: "#3d2f1a", marginBottom: 4 }}>
            Session history
          </h1>
          <p style={{ fontFamily: "'Crimson Pro', serif", fontSize: 15, color: "#7a6a52" }}>
            Your past study sessions
          </p>
        </div>

        {loading ? (
          <div style={{ textAlign: "center", padding: "48px 0", fontFamily: "'Caveat', cursive", fontSize: 18, color: "#7a6a52" }}>
            Loading...
          </div>
        ) : sessions.length === 0 ? (
          <div style={{ backgroundColor: "#faf7f0", border: "1px solid #c4b898", padding: 40, textAlign: "center" }}>
            <p style={{ fontFamily: "'Crimson Pro', serif", fontSize: 15, color: "#7a6a52", marginBottom: 16 }}>
              No completed sessions yet.
            </p>
            <button
              onClick={() => router.push("/lobby")}
              style={{ padding: "10px 24px", backgroundColor: "#b85c2a", border: "none", color: "#fdf8f0", fontFamily: "'Caveat', cursive", fontSize: 16, cursor: "pointer", borderRadius: 0 }}
            >
              Start your first session
            </button>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {sessions.map((session) => (
              <div key={session.id} style={{ backgroundColor: "#faf7f0", border: "1px solid #c4b898" }}>
                <button
                  onClick={() => setExpanded(expanded === session.id ? null : session.id)}
                  style={{ width: "100%", textAlign: "left", padding: "16px 20px", background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16 }}
                >
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                      <span style={{ fontFamily: "'Caveat', cursive", fontSize: 16, fontWeight: 700, color: "#3d2f1a", textTransform: "capitalize" }}>
                        {session.subject}
                      </span>
                      <span style={{ fontFamily: "'Caveat', cursive", fontSize: 12, color: "#7a6a52", backgroundColor: "#e8e0cc", padding: "1px 8px" }}>
                        {session.room_code}
                      </span>
                      {session.problem && (() => {
                        const dc = getDifficultyColor(session.problem.difficulty);
                        return (
                          <span style={{ fontFamily: "'Caveat', cursive", fontSize: 12, padding: "1px 8px", backgroundColor: dc.bg, color: dc.text }}>
                            {session.problem.difficulty}
                          </span>
                        );
                      })()}
                    </div>
                    {session.problem && (
                      <p style={{ fontFamily: "'Crimson Pro', serif", fontSize: 14, color: "#5c4d37", marginBottom: 2 }}>
                        {session.problem.title}
                      </p>
                    )}
                    <p style={{ fontFamily: "'Crimson Pro', serif", fontSize: 12, color: "#7a6a52" }}>
                      {formatDate(session.created_at)}
                    </p>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                    <span style={{ fontFamily: "'Caveat', cursive", fontSize: 13, color: "#7a6a52" }}>
                      {session.hints.length} hints
                    </span>
                    <span style={{ color: "#7a6a52", fontSize: 18 }}>{expanded === session.id ? "▲" : "▼"}</span>
                  </div>
                </button>

                {expanded === session.id && (
                  <div style={{ padding: "16px 20px", borderTop: "1px dashed #c4b898", display: "flex", flexDirection: "column", gap: 12 }}>
                    {session.problem && (
                      <div style={{ fontFamily: "'Crimson Pro', serif", fontSize: 14, color: "#5c4d37", backgroundColor: "#f0ebe0", padding: "10px 14px", lineHeight: 1.6 }}>
                        {session.problem.description}
                      </div>
                    )}
                    {session.hints.length > 0 && (
                      <div>
                        <p style={{ fontFamily: "'Caveat', cursive", fontSize: 12, color: "#7a6a52", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 8 }}>
                          AI hints received
                        </p>
                        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                          {session.hints.map((hint) => (
                            <div key={hint.id} style={{ borderLeft: "3px solid #b85c2a", backgroundColor: "#fdf3ec", padding: "8px 12px", fontFamily: "'Crimson Pro', serif", fontSize: 14, color: "#5c4d37", lineHeight: 1.6 }}>
                              <p style={{ fontFamily: "'Caveat', cursive", fontSize: 12, color: "#b85c2a", marginBottom: 3, textTransform: "capitalize" }}>
                                {hint.trigger_type.replace("_", " ")}
                              </p>
                              {hint.hint_text}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}