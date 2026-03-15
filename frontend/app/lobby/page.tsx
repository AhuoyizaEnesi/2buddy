"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { sessionsAPI } from "@/app/lib/api";
import { getUser, isAuthenticated, clearAuth } from "@/app/lib/auth";
import { connectSocket, disconnectSocket } from "@/app/lib/socket";

interface User {
  id: string;
  username: string;
  email: string;
  created_at: string;
}

interface LobbyUser {
  sid: string;
  username: string;
  joined_at: number;
}

interface PairRequest {
  from_sid: string;
  from_username: string;
  subject: string;
}

const subjects = [
  { id: "mathematics", label: "Mathematics", description: "Algebra, calculus, geometry", color: "#7F77DD", bg: "#f5f3ff", activeBorder: "#7F77DD" },
  { id: "physics", label: "Physics", description: "Mechanics, electricity, waves", color: "#3b82f6", bg: "#eff6ff", activeBorder: "#3b82f6" },
  { id: "computer science", label: "Computer Science", description: "Algorithms, data structures", color: "#1D9E75", bg: "#f0fdf4", activeBorder: "#1D9E75" },
  { id: "chemistry", label: "Chemistry", description: "Reactions, equations, periodic table", color: "#f97316", bg: "#fff7ed", activeBorder: "#f97316" },
];

export default function LobbyPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [selectedSubject, setSelectedSubject] = useState("");
  const [lobbyUsers, setLobbyUsers] = useState<LobbyUser[]>([]);
  const [lobbyCounts, setLobbyCounts] = useState<Record<string, number>>({});
  const [pairRequest, setPairRequest] = useState<PairRequest | null>(null);
  const [pendingRequest, setPendingRequest] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);
  const [mySid, setMySid] = useState<string | null>(null);

  const showNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 4000);
  };

  useEffect(() => {
    if (!isAuthenticated()) { router.push("/login"); return; }
    setUser(getUser());
  }, [router]);

  useEffect(() => {
    if (!user) return;
    const socket = connectSocket();

    const handleConnect = () => {
      setMySid(socket.id || null);
      subjects.forEach((s) => {
        socket.emit("join_lobby", { subject: s.id, username: user.username });
      });
    };

    if (socket.connected) {
      handleConnect();
    }
    socket.on("connect", handleConnect);

    socket.on("lobby_update", (data: { subject: string; users: LobbyUser[]; count: number }) => {
      setLobbyCounts((prev) => ({ ...prev, [data.subject]: data.count }));
      setSelectedSubject((current) => {
        if (data.subject === current) {
          setLobbyUsers(data.users);
        }
        return current;
      });
    });

    socket.on("pair_request", (data: PairRequest) => {
      setPairRequest(data);
    });

    socket.on("pair_accepted", async (data: { accepted_by: string; subject: string; session_id: string }) => {
      setPendingRequest(null);
      showNotification(`${data.accepted_by} accepted. Joining session...`);
      subjects.forEach((s) => socket.emit("leave_lobby", { subject: s.id }));
      router.push(`/board?session=${data.session_id}`);
    });

    socket.on("pair_declined", (data: { declined_by: string }) => {
      setPendingRequest(null);
      showNotification(`${data.declined_by} declined your request.`);
    });

    socket.on("pair_confirmed", (data: { session_id: string }) => {
      subjects.forEach((s) => socket.emit("leave_lobby", { subject: s.id }));
      router.push(`/board?session=${data.session_id}`);
    });

    return () => {
      socket.off("connect", handleConnect);
      socket.off("lobby_update");
      socket.off("pair_request");
      socket.off("pair_accepted");
      socket.off("pair_declined");
      socket.off("pair_confirmed");
      subjects.forEach((s) => socket.emit("leave_lobby", { subject: s.id }));
      disconnectSocket();
    };
  }, [user, router]);

  const handleSelectSubject = (subjectId: string) => {
    setSelectedSubject(subjectId);
    setLobbyUsers([]);
    setPendingRequest(null);
  };

  const handleSendRequest = (targetSid: string, targetUsername: string) => {
    if (!user || !selectedSubject) return;
    const socket = connectSocket();
    setPendingRequest(targetUsername);
    socket.emit("send_pair_request", {
      target_sid: targetSid,
      username: user.username,
      subject: selectedSubject,
    });
    showNotification(`Request sent to ${targetUsername}`);
  };

  const handleAcceptRequest = async () => {
    if (!pairRequest || !user) return;
    const socket = connectSocket();
    try {
      setLoading(true);
      const res = await sessionsAPI.createDirect(pairRequest.subject);
      const session = res.data;

      socket.emit("accept_pair_request", {
        from_sid: pairRequest.from_sid,
        username: user.username,
        subject: pairRequest.subject,
        session_id: session.id,
      });

      subjects.forEach((s) => socket.emit("leave_lobby", { subject: s.id }));
      setPairRequest(null);
      router.push(`/board?session=${session.id}`);
    } catch {
      showNotification("Failed to create session. Try again.");
      setLoading(false);
    }
  };

  const handleDeclineRequest = () => {
    if (!pairRequest || !user) return;
    const socket = connectSocket();
    socket.emit("decline_pair_request", {
      from_sid: pairRequest.from_sid,
      username: user.username,
    });
    setPairRequest(null);
  };

  const handleSolo = async () => {
    if (!selectedSubject) return;
    setLoading(true);
    try {
      const res = await sessionsAPI.createDirect(selectedSubject);
      const socket = connectSocket();
      subjects.forEach((s) => socket.emit("leave_lobby", { subject: s.id }));
      router.push(`/board?session=${res.data.id}`);
    } catch {
      showNotification("Failed to create session.");
      setLoading(false);
    }
  };

  const handleLogout = () => {
    const socket = connectSocket();
    subjects.forEach((s) => socket.emit("leave_lobby", { subject: s.id }));
    disconnectSocket();
    clearAuth();
    router.push("/login");
  };

  const selectedSubjectData = subjects.find((s) => s.id === selectedSubject);
  const otherUsers = lobbyUsers.filter((u) => u.sid !== mySid);

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#f8fafc", display: "flex", flexDirection: "column" }}>
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0 24px", height: 56, backgroundColor: "#1e3a5f",
        boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 32, height: 32, backgroundColor: "#2563eb", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, color: "#fff", fontSize: 16 }}>
            2
          </div>
          <span style={{ color: "#ffffff", fontWeight: 700, fontSize: 18 }}>2Buddy</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          {notification && (
            <span style={{ fontSize: 12, backgroundColor: "rgba(255,255,255,0.15)", color: "#ffffff", padding: "4px 12px" }}>
              {notification}
            </span>
          )}
          <span style={{ fontSize: 13, color: "rgba(255,255,255,0.7)" }}>{user?.username}</span>
          <button onClick={() => router.push("/history")} style={{ padding: "5px 12px", backgroundColor: "transparent", border: "1px solid rgba(255,255,255,0.3)", color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer", borderRadius: 0 }}>
            History
          </button>
          <button onClick={handleLogout} style={{ padding: "5px 12px", backgroundColor: "transparent", border: "1px solid rgba(255,255,255,0.3)", color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer", borderRadius: 0 }}>
            Sign out
          </button>
        </div>
      </div>

      {pairRequest && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.5)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ backgroundColor: "#ffffff", padding: 32, width: 380, border: "1px solid #e5e7eb", boxShadow: "0 8px 32px rgba(0,0,0,0.2)" }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: "#1e3a5f", marginBottom: 8 }}>Study request</div>
            <p style={{ fontSize: 14, color: "#374151", marginBottom: 24, lineHeight: 1.6 }}>
              <strong>{pairRequest.from_username}</strong> wants to study{" "}
              <strong style={{ textTransform: "capitalize" }}>{pairRequest.subject}</strong> with you.
            </p>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={handleAcceptRequest} disabled={loading} style={{ flex: 1, padding: "10px 0", backgroundColor: "#1e3a5f", color: "#fff", border: "none", fontSize: 13, fontWeight: 700, cursor: "pointer", borderRadius: 0 }}>
                {loading ? "Creating session..." : "Accept"}
              </button>
              <button onClick={handleDeclineRequest} style={{ flex: 1, padding: "10px 0", backgroundColor: "#f3f4f6", color: "#374151", border: "1px solid #e5e7eb", fontSize: 13, fontWeight: 700, cursor: "pointer", borderRadius: 0 }}>
                Decline
              </button>
            </div>
          </div>
        </div>
      )}

      <div style={{ flex: 1, maxWidth: 900, margin: "0 auto", padding: "32px 24px", width: "100%" }}>
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: "#1e3a5f", marginBottom: 4 }}>Find a study partner</h1>
          <p style={{ fontSize: 14, color: "#6b7280" }}>Pick a subject, see who is waiting, and start a session together.</p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 28 }}>
          {subjects.map((subject) => {
            const count = lobbyCounts[subject.id] || 0;
            const isSelected = selectedSubject === subject.id;
            return (
              <button key={subject.id} onClick={() => handleSelectSubject(subject.id)} style={{ padding: "16px", textAlign: "left", cursor: "pointer", backgroundColor: isSelected ? subject.bg : "#ffffff", border: `2px solid ${isSelected ? subject.activeBorder : "#e5e7eb"}`, borderRadius: 0, transition: "all 0.15s" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                  <div style={{ width: 10, height: 10, backgroundColor: subject.color }} />
                  {count > 0 && (
                    <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 6px", backgroundColor: subject.color, color: "#fff" }}>
                      {count} waiting
                    </span>
                  )}
                </div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#1e3a5f", marginBottom: 3 }}>{subject.label}</div>
                <div style={{ fontSize: 11, color: "#9ca3af" }}>{subject.description}</div>
              </button>
            );
          })}
        </div>

        {selectedSubject && (
          <div style={{ backgroundColor: "#ffffff", border: "1px solid #e5e7eb" }}>
            <div style={{ padding: "14px 20px", borderBottom: "1px solid #f3f4f6", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <span style={{ fontSize: 14, fontWeight: 700, color: "#1e3a5f", textTransform: "capitalize" }}>{selectedSubject} room</span>
                <span style={{ fontSize: 12, color: "#9ca3af", marginLeft: 10 }}>
                  {otherUsers.length} {otherUsers.length === 1 ? "person" : "people"} waiting
                </span>
              </div>
              <button onClick={handleSolo} disabled={loading} style={{ padding: "7px 16px", backgroundColor: "#f3f4f6", border: "1px solid #e5e7eb", color: "#374151", fontSize: 12, fontWeight: 600, cursor: "pointer", borderRadius: 0 }}>
                Practice solo
              </button>
            </div>

            <div style={{ padding: "16px 20px" }}>
              {otherUsers.length === 0 ? (
                <div style={{ textAlign: "center", padding: "32px 0", color: "#9ca3af", fontSize: 13 }}>
                  <div style={{ fontSize: 32, marginBottom: 8 }}>👥</div>
                  No one is here yet. Your name is now visible to others joining this room.
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {otherUsers.map((lobbyUser) => (
                    <div key={lobbyUser.sid} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", backgroundColor: "#f9fafb", border: "1px solid #f3f4f6" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{ width: 32, height: 32, backgroundColor: selectedSubjectData?.color || "#6b7280", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 700, fontSize: 14 }}>
                          {lobbyUser.username[0]?.toUpperCase()}
                        </div>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 600, color: "#1e3a5f" }}>{lobbyUser.username}</div>
                          <div style={{ fontSize: 11, color: "#9ca3af" }}>Waiting in {selectedSubject}</div>
                        </div>
                      </div>
                      <button
                        onClick={() => handleSendRequest(lobbyUser.sid, lobbyUser.username)}
                        disabled={pendingRequest === lobbyUser.username || loading}
                        style={{ padding: "7px 16px", backgroundColor: pendingRequest === lobbyUser.username ? "#f3f4f6" : "#1e3a5f", border: "none", color: pendingRequest === lobbyUser.username ? "#9ca3af" : "#fff", fontSize: 12, fontWeight: 700, cursor: pendingRequest === lobbyUser.username ? "not-allowed" : "pointer", borderRadius: 0 }}
                      >
                        {pendingRequest === lobbyUser.username ? "Request sent..." : "Study together"}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}