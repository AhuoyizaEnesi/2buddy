"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { sessionsAPI } from "@/app/lib/api";
import { getUser, isAuthenticated, clearAuth } from "@/app/lib/auth";
import { connectSocket, disconnectSocket } from "@/app/lib/socket";

interface User { id: string; username: string; email: string; created_at: string; }
interface LobbyUser { sid: string; username: string; joined_at: number; }
interface PairRequest { from_sid: string; from_username: string; subject: string; }

const subjects = [
  { id: "mathematics", label: "Mathematics", description: "Algebra, calculus, geometry", color: "#b85c2a" },
  { id: "physics", label: "Physics", description: "Mechanics, electricity, waves", color: "#3a5a8a" },
  { id: "computer science", label: "Computer Science", description: "Algorithms, data structures", color: "#5a8a5a" },
  { id: "chemistry", label: "Chemistry", description: "Reactions, equations, periodic table", color: "#8a5a2a" },
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
      subjects.forEach((s) => socket.emit("join_lobby", { subject: s.id, username: user.username }));
    };
    if (socket.connected) handleConnect();
    socket.on("connect", handleConnect);
    socket.on("lobby_update", (data: { subject: string; users: LobbyUser[]; count: number }) => {
      setLobbyCounts((prev) => ({ ...prev, [data.subject]: data.count }));
      setSelectedSubject((current) => {
        if (data.subject === current) setLobbyUsers(data.users);
        return current;
      });
    });
    socket.on("pair_request", (data: PairRequest) => setPairRequest(data));
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

  const handleAcceptRequest = async () => {
    if (!pairRequest || !user) return;
    const socket = connectSocket();
    try {
      setLoading(true);
      const res = await sessionsAPI.createDirect(pairRequest.subject);
      socket.emit("accept_pair_request", {
        from_sid: pairRequest.from_sid,
        username: user.username,
        subject: pairRequest.subject,
        session_id: res.data.id,
      });
      subjects.forEach((s) => socket.emit("leave_lobby", { subject: s.id }));
      setPairRequest(null);
      router.push(`/board?session=${res.data.id}`);
    } catch {
      showNotification("Failed to create session. Try again.");
      setLoading(false);
    }
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

  const otherUsers = lobbyUsers.filter((u) => u.sid !== mySid);
  const selectedSubjectData = subjects.find((s) => s.id === selectedSubject);

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
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          {notification && (
            <span style={{
              fontFamily: "'Caveat', cursive", fontSize: 14,
              backgroundColor: "rgba(255,255,255,0.15)", color: "#fdf8f0", padding: "4px 12px",
            }}>
              {notification}
            </span>
          )}
          <span style={{ fontFamily: "'Caveat', cursive", fontSize: 14, color: "#c4b898" }}>
            {user?.username}
          </span>
          <button
            onClick={() => router.push("/history")}
            style={{
              padding: "5px 14px", backgroundColor: "transparent",
              border: "1.5px solid #c4b898", color: "#fdf8f0",
              fontFamily: "'Caveat', cursive", fontSize: 14, cursor: "pointer", borderRadius: 0,
            }}
          >
            History
          </button>
          <button
            onClick={handleLogout}
            style={{
              padding: "5px 14px", backgroundColor: "transparent",
              border: "1.5px solid #c4b898", color: "#fdf8f0",
              fontFamily: "'Caveat', cursive", fontSize: 14, cursor: "pointer", borderRadius: 0,
            }}
          >
            Sign out
          </button>
        </div>
      </div>

      {pairRequest && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.5)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ backgroundColor: "#faf7f0", padding: 32, width: 380, border: "1px solid #c4b898", boxShadow: "0 8px 32px rgba(60,40,10,0.2)" }}>
            <div style={{ fontFamily: "'Caveat', cursive", fontSize: 20, fontWeight: 700, color: "#3d2f1a", marginBottom: 8 }}>
              Study request
            </div>
            <p style={{ fontFamily: "'Crimson Pro', serif", fontSize: 15, color: "#5c4d37", marginBottom: 24, lineHeight: 1.6 }}>
              <strong>{pairRequest.from_username}</strong> wants to study{" "}
              <strong style={{ textTransform: "capitalize" }}>{pairRequest.subject}</strong> with you.
            </p>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={handleAcceptRequest} disabled={loading} style={{ flex: 1, padding: "10px 0", backgroundColor: "#b85c2a", color: "#fdf8f0", border: "none", fontFamily: "'Caveat', cursive", fontSize: 16, fontWeight: 700, cursor: "pointer", borderRadius: 0 }}>
                {loading ? "Creating..." : "Accept"}
              </button>
              <button onClick={() => {
                const socket = connectSocket();
                socket.emit("decline_pair_request", { from_sid: pairRequest.from_sid, username: user?.username });
                setPairRequest(null);
              }} style={{ flex: 1, padding: "10px 0", backgroundColor: "#e8e0cc", color: "#3d2f1a", border: "1.5px solid #c4b898", fontFamily: "'Caveat', cursive", fontSize: 16, fontWeight: 700, cursor: "pointer", borderRadius: 0 }}>
                Decline
              </button>
            </div>
          </div>
        </div>
      )}

      <div style={{ maxWidth: 900, margin: "0 auto", padding: "40px 24px" }}>
        <div style={{ marginBottom: 32 }}>
          <h1 style={{ fontFamily: "'Caveat', cursive", fontSize: 32, fontWeight: 700, color: "#3d2f1a", marginBottom: 4 }}>
            Find a study partner
          </h1>
          <p style={{ fontFamily: "'Crimson Pro', serif", fontSize: 15, color: "#7a6a52" }}>
            Pick a subject, see who is waiting, and start a session together.
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 28 }}>
          {subjects.map((subject) => {
            const count = lobbyCounts[subject.id] || 0;
            const isSelected = selectedSubject === subject.id;
            return (
              <button
                key={subject.id}
                onClick={() => { setSelectedSubject(subject.id); setLobbyUsers([]); setPendingRequest(null); }}
                style={{
                  padding: "16px", textAlign: "left", cursor: "pointer",
                  backgroundColor: isSelected ? "#e8d8b8" : "#faf7f0",
                  border: `2px solid ${isSelected ? subject.color : "#c4b898"}`,
                  borderRadius: 0, transition: "all 0.15s",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                  <div style={{ width: 10, height: 10, backgroundColor: subject.color, borderRadius: "50%" }} />
                  {count > 0 && (
                    <span style={{ fontFamily: "'Caveat', cursive", fontSize: 11, fontWeight: 700, padding: "2px 6px", backgroundColor: subject.color, color: "#fff" }}>
                      {count} waiting
                    </span>
                  )}
                </div>
                <div style={{ fontFamily: "'Caveat', cursive", fontSize: 15, fontWeight: 700, color: "#3d2f1a", marginBottom: 3 }}>{subject.label}</div>
                <div style={{ fontFamily: "'Crimson Pro', serif", fontSize: 12, color: "#7a6a52" }}>{subject.description}</div>
              </button>
            );
          })}
        </div>

        {selectedSubject && (
          <div style={{ backgroundColor: "#faf7f0", border: "1px solid #c4b898" }}>
            <div style={{ padding: "14px 20px", borderBottom: "1px dashed #c4b898", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <span style={{ fontFamily: "'Caveat', cursive", fontSize: 16, fontWeight: 700, color: "#3d2f1a", textTransform: "capitalize" }}>
                  {selectedSubject} room
                </span>
                <span style={{ fontFamily: "'Crimson Pro', serif", fontSize: 13, color: "#7a6a52", marginLeft: 10 }}>
                  {otherUsers.length} {otherUsers.length === 1 ? "person" : "people"} waiting
                </span>
              </div>
              <button onClick={handleSolo} disabled={loading} style={{ padding: "7px 16px", backgroundColor: "#e8e0cc", border: "1.5px solid #c4b898", color: "#3d2f1a", fontFamily: "'Caveat', cursive", fontSize: 14, fontWeight: 600, cursor: "pointer", borderRadius: 0 }}>
                Practice solo
              </button>
            </div>
            <div style={{ padding: "16px 20px" }}>
              {otherUsers.length === 0 ? (
                <div style={{ textAlign: "center", padding: "32px 0", color: "#7a6a52", fontFamily: "'Crimson Pro', serif", fontSize: 14 }}>
                  <div style={{ fontSize: 32, marginBottom: 8 }}>👥</div>
                  No one is here yet. Your name is now visible to others joining this room.
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {otherUsers.map((lobbyUser) => (
                    <div key={lobbyUser.sid} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", backgroundColor: "#f0ebe0", border: "1px solid #c4b898" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{ width: 32, height: 32, backgroundColor: selectedSubjectData?.color || "#7a6a52", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontFamily: "'Caveat', cursive", fontWeight: 700, fontSize: 16 }}>
                          {lobbyUser.username[0]?.toUpperCase()}
                        </div>
                        <div>
                          <div style={{ fontFamily: "'Caveat', cursive", fontSize: 15, fontWeight: 600, color: "#3d2f1a" }}>{lobbyUser.username}</div>
                          <div style={{ fontFamily: "'Crimson Pro', serif", fontSize: 12, color: "#7a6a52" }}>Waiting in {selectedSubject}</div>
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          if (!user || !selectedSubject) return;
                          const socket = connectSocket();
                          setPendingRequest(lobbyUser.username);
                          socket.emit("send_pair_request", { target_sid: lobbyUser.sid, username: user.username, subject: selectedSubject });
                          showNotification(`Request sent to ${lobbyUser.username}`);
                        }}
                        disabled={pendingRequest === lobbyUser.username || loading}
                        style={{
                          padding: "7px 16px",
                          backgroundColor: pendingRequest === lobbyUser.username ? "#e8e0cc" : "#b85c2a",
                          border: "none", color: pendingRequest === lobbyUser.username ? "#7a6a52" : "#fdf8f0",
                          fontFamily: "'Caveat', cursive", fontSize: 14, fontWeight: 700,
                          cursor: pendingRequest === lobbyUser.username ? "not-allowed" : "pointer", borderRadius: 0,
                        }}
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