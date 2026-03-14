"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { sessionsAPI } from "@/app/lib/api";
import { getUser, isAuthenticated } from "@/app/lib/auth";
import { connectSocket, disconnectSocket } from "@/app/lib/socket";
import Canvas, { CanvasRef } from "@/app/components/whiteboard/Canvas";
import { Tool, Background } from "@/app/components/whiteboard/Toolbar";
import LeftPanel from "@/app/components/whiteboard/LeftPanel";
import RightPanel from "@/app/components/whiteboard/RightPanel";
import FloatingToolbar from "@/app/components/whiteboard/FloatingToolbar";

interface AIMessage {
  type: "auto_check" | "review" | "stuck" | "error" | "thinking";
  message: string;
  check_number?: number;
  timestamp: Date;
}

interface PartnerCursorData {
  x: number;
  y: number;
  color: string;
  username: string;
}

interface Problem {
  id: string;
  subject: string;
  title: string;
  description: string;
  difficulty: string;
}

interface Session {
  id: string;
  room_code: string;
  subject: string;
  status: string;
  problem: Problem | null;
}

export default function BoardPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session");
  const canvasRef = useRef<CanvasRef>(null);
  const user = getUser();

  const [session, setSession] = useState<Session | null>(null);
  const [activeTool, setActiveTool] = useState<Tool>("pen");
  const [activeColor, setActiveColor] = useState("#1a1a1a");
  const [strokeSize, setStrokeSize] = useState(4);
  const [activeBackground, setActiveBackground] = useState<Background>("dots");
  const [aiMessages, setAiMessages] = useState<AIMessage[]>([]);
  const [stuckVotes, setStuckVotes] = useState(0);
  const [hasVotedStuck, setHasVotedStuck] = useState(false);
  const [checksRemaining, setChecksRemaining] = useState(4);
  const [partnerCursor, setPartnerCursor] = useState<PartnerCursorData | null>(null);
  const [partnerConnected, setPartnerConnected] = useState(false);
  const [partnerName, setPartnerName] = useState("");
  const [partnerColor, setPartnerColor] = useState("#1D9E75");
  const [userColor] = useState("#7F77DD");
  const [sessionTimer, setSessionTimer] = useState(1200);
  const [notification, setNotification] = useState<string | null>(null);
  const [ending, setEnding] = useState(false);
  const [reactions, setReactions] = useState<{ id: number; emoji: string; x: number; y: number }[]>([]);
  const reactionIdRef = useRef(0);

  const showNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 4000);
  };

  const handleReaction = useCallback((emoji: string) => {
    if (!session) return;
    const socket = connectSocket();
    const x = 20 + Math.random() * 60;
    const y = 20 + Math.random() * 60;
    socket.emit("reaction", { room_code: session.room_code, emoji, x, y });
    const id = reactionIdRef.current++;
    setReactions((prev) => [...prev, { id, emoji, x, y }]);
    setTimeout(() => setReactions((prev) => prev.filter((r) => r.id !== id)), 3000);
  }, [session]);

  useEffect(() => {
    if (!isAuthenticated()) { router.push("/login"); return; }
    if (!sessionId) { router.push("/lobby"); return; }
    sessionsAPI.getSession(sessionId).then((res) => setSession(res.data));
  }, [sessionId, router]);

  useEffect(() => {
    if (!session || !user) return;
    const socket = connectSocket();

    socket.on("connect", () => {
      socket.emit("join_room", {
        room_code: session.room_code,
        username: user.username,
        color: userColor,
        problem_description: session.problem?.description || "No problem loaded",
      });
    });

    socket.on("room_joined", ({ canvas_data }: { canvas_data: string }) => {
      if (canvas_data && canvasRef.current) canvasRef.current.loadFromDataUrl(canvas_data);
    });

    socket.on("partner_joined", ({ username, color }: { username: string; color: string }) => {
      setPartnerConnected(true);
      setPartnerName(username);
      setPartnerColor(color);
      showNotification(`${username} joined the board`);
    });

    socket.on("partner_disconnected", ({ username }: { username: string }) => {
      setPartnerConnected(false);
      showNotification(`${username} disconnected`);
    });

    socket.on("receive_stroke", (data: any) => {
      if (canvasRef.current) canvasRef.current.applyRemoteStroke(data.stroke);
    });

    socket.on("partner_cursor", (data: any) => {
      setPartnerCursor({ x: data.x, y: data.y, color: data.color, username: data.username });
    });

    socket.on("canvas_cleared", () => {
      if (canvasRef.current) canvasRef.current.clearCanvas();
      showNotification("Canvas cleared");
    });

    socket.on("reaction", (data: any) => {
      const id = reactionIdRef.current++;
      setReactions((prev) => [...prev, { id, emoji: data.emoji, x: data.x, y: data.y }]);
      setTimeout(() => setReactions((prev) => prev.filter((r) => r.id !== id)), 3000);
    });

    socket.on("ai_thinking", ({ type }: { type: string }) => {
      setAiMessages((prev) => [
        ...prev,
        {
          type: "thinking",
          message: type === "stuck" ? "Thinking of a hint..." : "Reviewing your work...",
          timestamp: new Date(),
        },
      ]);
    });

    socket.on("ai_feedback", (data: any) => {
      setAiMessages((prev) => {
        const filtered = prev.filter((m) => m.type !== "thinking");
        if (data.type === "auto_check" && data.message === "NO_ERROR") return filtered;
        if (data.type === "auto_check") {
          setChecksRemaining((c) => Math.max(0, c - 1));
          showNotification("AI tutor has a note for you");
        }
        return [...filtered, { type: data.type, message: data.message, check_number: data.check_number, timestamp: new Date() }];
      });
    });

    socket.on("stuck_vote_update", ({ votes }: { votes: number }) => setStuckVotes(votes));

    return () => {
      socket.off("connect");
      socket.off("room_joined");
      socket.off("partner_joined");
      socket.off("partner_disconnected");
      socket.off("receive_stroke");
      socket.off("partner_cursor");
      socket.off("canvas_cleared");
      socket.off("reaction");
      socket.off("ai_thinking");
      socket.off("ai_feedback");
      socket.off("stuck_vote_update");
      disconnectSocket();
    };
  }, [session, user, userColor]);

  useEffect(() => {
    const timer = setInterval(() => {
      setSessionTimer((t) => { if (t <= 1) { clearInterval(timer); return 0; } return t - 1; });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleStroke = useCallback((stroke: any) => {
    if (!session) return;
    const socket = connectSocket();
    socket.emit("draw_stroke", {
      room_code: session.room_code,
      stroke: { ...stroke, color: stroke.tool === "eraser" ? "#FFFFFF" : userColor },
    });
  }, [session, userColor]);

  const handleCursorMove = useCallback((x: number, y: number) => {
    if (!session || !user) return;
    const socket = connectSocket();
    socket.emit("cursor_move", { room_code: session.room_code, x, y, color: userColor, username: user.username });
  }, [session, user, userColor]);

  const handleCanvasUpdate = useCallback((dataUrl: string) => {
    if (!session) return;
    const socket = connectSocket();
    const base64 = dataUrl.replace(/^data:image\/png;base64,/, "");
    socket.emit("canvas_update", { room_code: session.room_code, canvas_data: base64 });
  }, [session]);

  const handleClear = useCallback(() => {
    if (!session) return;
    canvasRef.current?.clearCanvas();
    const socket = connectSocket();
    socket.emit("clear_canvas", { room_code: session.room_code });
  }, [session]);

  const handleUndo = useCallback(() => { canvasRef.current?.undo(); }, []);

  const handleExport = useCallback(() => {
    const dataUrl = canvasRef.current?.getDataUrl() || "";
    if (!dataUrl) return;
    const link = document.createElement("a");
    link.download = `2buddy-session-${session?.room_code || "board"}.png`;
    link.href = dataUrl;
    link.click();
  }, [session]);

  const handleImageUpload = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      const canvas = canvasRef.current;
      if (!canvas) return;
      canvas.drawImage(dataUrl);
    };
    reader.readAsDataURL(file);
  }, []);

  const handleRequestReview = useCallback(() => {
    if (!session) return;
    const socket = connectSocket();
    const dataUrl = canvasRef.current?.getDataUrl() || "";
    const base64 = dataUrl.replace(/^data:image\/png;base64,/, "");
    socket.emit("request_review", { room_code: session.room_code, canvas_data: base64, problem_description: session.problem?.description || "" });
  }, [session]);

  const handleVoteStuck = useCallback(() => {
    if (!session || hasVotedStuck) return;
    setHasVotedStuck(true);
    const socket = connectSocket();
    const dataUrl = canvasRef.current?.getDataUrl() || "";
    const base64 = dataUrl.replace(/^data:image\/png;base64,/, "");
    socket.emit("vote_stuck", { room_code: session.room_code, username: user?.username, canvas_data: base64, problem_description: session.problem?.description || "" });
  }, [session, hasVotedStuck, user]);

  const handleEndSession = async () => {
    if (!session) return;
    setEnding(true);
    try {
      await sessionsAPI.endSession(session.id);
      disconnectSocket();
      router.push("/lobby");
    } catch { setEnding(false); }
  };

  if (!session) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "#f0f4ff" }}>
        <p style={{ fontSize: 14, color: "#6b7280" }}>Loading session...</p>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", backgroundColor: "#f0f4ff", overflow: "hidden" }}>
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0 20px", height: 56, backgroundColor: "#1e3a5f",
        flexShrink: 0, boxShadow: "0 2px 8px rgba(0,0,0,0.15)"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 32, height: 32, backgroundColor: "#2563eb", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, color: "#fff", fontSize: 16 }}>
              2
            </div>
            <span style={{ color: "#ffffff", fontWeight: 700, fontSize: 18 }}>2Buddy</span>
          </div>
          <div style={{ width: 1, height: 24, backgroundColor: "rgba(255,255,255,0.2)" }} />
          <span style={{ color: "#ffffff", fontWeight: 600, fontSize: 14, textTransform: "uppercase", letterSpacing: "0.08em" }}>
            {session.subject}
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8, backgroundColor: "#22c55e", padding: "6px 16px", borderRadius: 20 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
            <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" />
          </svg>
          <span style={{ color: "#ffffff", fontWeight: 600, fontSize: 13 }}>
            {user?.username} {partnerConnected ? `& ${partnerName}` : "& waiting..."}
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          {notification && (
            <span style={{ fontSize: 12, backgroundColor: "rgba(255,255,255,0.15)", color: "#ffffff", padding: "4px 12px", borderRadius: 20 }}>
              {notification}
            </span>
          )}
          <button
            onClick={handleEndSession}
            style={{ padding: "6px 16px", backgroundColor: "#ef4444", color: "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer" }}
          >
            {ending ? "Ending..." : "End Session"}
          </button>
          <div style={{ width: 32, height: 32, borderRadius: "50%", backgroundColor: userColor, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 700, fontSize: 14 }}>
            {user?.username?.[0]?.toUpperCase()}
          </div>
        </div>
      </div>

      <div style={{ display: "flex", flex: 1, overflow: "hidden", gap: 0 }}>
        <LeftPanel
          problem={session.problem}
          sessionTimer={sessionTimer}
          aiMessages={aiMessages}
          onRequestReview={handleRequestReview}
          onVoteStuck={handleVoteStuck}
          hasVotedStuck={hasVotedStuck}
          stuckVotes={stuckVotes}
          checksRemaining={checksRemaining}
          canvasRef={canvasRef}
        />

        <div style={{ flex: 1, position: "relative", overflow: "hidden", display: "flex", flexDirection: "column" }}>
          <FloatingToolbar
            activeTool={activeTool}
            activeBackground={activeBackground}
            onToolChange={setActiveTool}
            onBackgroundChange={setActiveBackground}
            onClear={handleClear}
            onUndo={handleUndo}
            onExport={handleExport}
          />

          <div style={{ flex: 1, margin: 12, borderRadius: 16, overflow: "hidden", boxShadow: "0 2px 16px rgba(0,0,0,0.1)", position: "relative", display: "flex" }}>
            <Canvas
              ref={canvasRef}
              activeTool={activeTool}
              activeColor={activeColor}
              strokeSize={strokeSize}
              activeBackground={activeBackground}
              partnerCursor={partnerCursor}
              onStroke={handleStroke}
              onCursorMove={handleCursorMove}
              onCanvasUpdate={handleCanvasUpdate}
            />

            {reactions.map((r) => (
              <div
                key={r.id}
                style={{
                  position: "absolute",
                  left: `${r.x}%`,
                  top: `${r.y}%`,
                  fontSize: 32,
                  pointerEvents: "none",
                  zIndex: 100,
                  animation: "floatUp 3s ease-out forwards",
                }}
              >
                {r.emoji}
              </div>
            ))}
          </div>
        </div>

        <RightPanel
          userColor={userColor}
          userName={user?.username || ""}
          partnerColor={partnerColor}
          partnerName={partnerName}
          partnerConnected={partnerConnected}
          activeTool={activeTool}
          activeColor={activeColor}
          strokeSize={strokeSize}
          activeBackground={activeBackground}
          onToolChange={setActiveTool}
          onColorChange={setActiveColor}
          onStrokeSizeChange={setStrokeSize}
          onBackgroundChange={setActiveBackground}
          onReaction={handleReaction}
          onImageUpload={handleImageUpload}
        />
      </div>

      <style>{`
        @keyframes floatUp {
          0% { transform: translateY(0) scale(1); opacity: 1; }
          100% { transform: translateY(-120px) scale(1.4); opacity: 0; }
        }
      `}</style>
    </div>
  );
}