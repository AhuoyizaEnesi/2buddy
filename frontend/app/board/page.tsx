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
import MathKeyboard from "@/app/components/whiteboard/MathKeyboard";

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
  const socketRef = useRef<any>(null);
  const user = getUser();

  const [session, setSession] = useState<Session | null>(null);
  const [activeTool, setActiveTool] = useState<Tool>("pen");
  const [activeColor, setActiveColor] = useState("#2d1f0a");
  const [strokeSize, setStrokeSize] = useState(4);
  const [activeBackground, setActiveBackground] = useState<Background>("lined");
  const [aiMessages, setAiMessages] = useState<AIMessage[]>([]);
  const [stuckVotes, setStuckVotes] = useState(0);
  const [hasVotedStuck, setHasVotedStuck] = useState(false);
  const [partnerVotedStuck, setPartnerVotedStuck] = useState(false);
  const [checksRemaining, setChecksRemaining] = useState(4);
  const [partnerCursor, setPartnerCursor] = useState<PartnerCursorData | null>(null);
  const [partnerConnected, setPartnerConnected] = useState(false);
  const [partnerName, setPartnerName] = useState("");
  const [partnerColor, setPartnerColor] = useState("#5a8a5a");
  const [userColor] = useState("#b85c2a");
  const [sessionTimer, setSessionTimer] = useState(1200);
  const [notification, setNotification] = useState<string | null>(null);
  const [ending, setEnding] = useState(false);
  const [socket, setSocket] = useState<any>(null);
  const [mathKeyboardOpen, setMathKeyboardOpen] = useState(false);
  const [reactions, setReactions] = useState<{ id: number; emoji: string; x: number; y: number }[]>([]);
  const reactionIdRef = useRef(0);

  const showNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 4000);
  };

  const handleReaction = useCallback((emoji: string) => {
    if (!session || !socketRef.current) return;
    const x = 20 + Math.random() * 60;
    const y = 20 + Math.random() * 60;
    socketRef.current.emit("reaction", { room_code: session.room_code, emoji, x, y });
    const id = reactionIdRef.current++;
    setReactions((prev) => [...prev, { id, emoji, x, y }]);
    setTimeout(() => setReactions((prev) => prev.filter((r) => r.id !== id)), 3000);
  }, [session]);

  const handleMathInsert = useCallback((symbol: string) => {
    if (!canvasRef.current) return;
    canvasRef.current.insertText(symbol);
  }, []);

  useEffect(() => {
    if (!isAuthenticated()) { router.push("/login"); return; }
    if (!sessionId) { router.push("/lobby"); return; }
    sessionsAPI.getSession(sessionId).then((res) => {
      setSession(res.data);
      socketRef.current = connectSocket();
      setSocket(socketRef.current);
    });
  }, [sessionId, router]);

  useEffect(() => {
    if (!session || !user || !socketRef.current) return;

    const socket = socketRef.current;

    const handleConnect = () => {
      socket.emit("join_room", {
        room_code: session.room_code,
        username: user.username,
        color: userColor,
        problem_description: session.problem?.description || "No problem loaded",
      });
    };

    if (socket.connected) handleConnect();
    socket.on("connect", handleConnect);

    socket.on("room_joined", ({ canvas_data }: { canvas_data: string }) => {
      if (canvas_data && canvas_data.length > 100 && canvasRef.current) {
        canvasRef.current.loadFromDataUrl(canvas_data);
      }
    });

    socket.on("partner_joined", ({ username, color }: { username: string; color: string }) => {
      setPartnerConnected(true);
      setPartnerName(username);
      setPartnerColor(color);
      showNotification(`${username} joined the board`);
    });

    socket.on("partner_disconnected", ({ username }: { username: string }) => {
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
        return [...filtered, {
          type: data.type,
          message: data.message,
          check_number: data.check_number,
          timestamp: new Date(),
        }];
      });
    });

    socket.on("partner_voted_stuck", (data: { username: string; votes: number }) => {
      showNotification(`${data.username} voted we are stuck. Vote too to get a hint.`);
      setPartnerVotedStuck(true);
    });

    socket.on("stuck_vote_update", ({ votes }: { votes: number }) => {
      setStuckVotes(votes);
      if (votes === 0) {
        setHasVotedStuck(false);
        setPartnerVotedStuck(false);
      }
    });

    return () => {
      socket.off("connect", handleConnect);
      socket.off("room_joined");
      socket.off("partner_joined");
      socket.off("partner_disconnected");
      socket.off("receive_stroke");
      socket.off("partner_cursor");
      socket.off("canvas_cleared");
      socket.off("reaction");
      socket.off("ai_thinking");
      socket.off("ai_feedback");
      socket.off("partner_voted_stuck");
      socket.off("stuck_vote_update");
    };
  }, [session, user, userColor]);

  useEffect(() => {
    const timer = setInterval(() => {
      setSessionTimer((t) => {
        if (t <= 1) { clearInterval(timer); return 0; }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleStroke = useCallback((stroke: any) => {
    if (!session || !socketRef.current) return;
    socketRef.current.emit("draw_stroke", {
      room_code: session.room_code,
      stroke: { ...stroke, color: stroke.tool === "eraser" ? "#faf7f0" : userColor },
    });
  }, [session, userColor]);

  const handleCursorMove = useCallback((x: number, y: number) => {
    if (!session || !user || !socketRef.current) return;
    socketRef.current.emit("cursor_move", {
      room_code: session.room_code, x, y,
      color: userColor, username: user.username,
    });
  }, [session, user, userColor]);

  const handleCanvasUpdate = useCallback((dataUrl: string) => {
    if (!session || !socketRef.current) return;
    if (!dataUrl || dataUrl === "data:," || dataUrl.length < 100) return;
    const base64 = dataUrl.replace(/^data:image\/png;base64,/, "");
    if (!base64 || base64.length < 100) return;
    socketRef.current.emit("canvas_update", { room_code: session.room_code, canvas_data: base64 });
  }, [session]);

  const handleClear = useCallback(() => {
    if (!session || !socketRef.current) return;
    canvasRef.current?.clearCanvas();
    socketRef.current.emit("clear_canvas", { room_code: session.room_code });
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
      if (canvasRef.current) canvasRef.current.drawImage(dataUrl);
    };
    reader.readAsDataURL(file);
  }, []);

  const handleRequestReview = useCallback(() => {
    if (!session || !socketRef.current) return;
    socketRef.current.emit("request_review", {
      room_code: session.room_code,
      canvas_data: "",
      problem_description: session.problem?.description || "",
    });
  }, [session]);

  const handleCheckAnswer = useCallback(() => {
    if (!session || !socketRef.current) return;
    socketRef.current.emit("check_answer", {
      room_code: session.room_code,
      problem_description: session.problem?.description || "",
    });
  }, [session]);

  const handleVoteStuck = useCallback(() => {
    if (!session || hasVotedStuck || !socketRef.current) return;
    setHasVotedStuck(true);
    socketRef.current.emit("vote_stuck", {
      room_code: session.room_code,
      username: user?.username,
      canvas_data: "",
      problem_description: session.problem?.description || "",
    });
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
      <div style={{
        minHeight: "100vh", display: "flex", alignItems: "center",
        justifyContent: "center", backgroundColor: "#f0ebe0",
      }}>
        <p style={{ fontFamily: "'Caveat', cursive", fontSize: 18, color: "#7a6a52" }}>
          Loading session...
        </p>
      </div>
    );
  }

  return (
    <div style={{
      display: "flex", flexDirection: "column",
      height: "100vh", backgroundColor: "#f0ebe0", overflow: "hidden",
    }}>
      {/* Navbar */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0 20px", height: 48, backgroundColor: "#3d2f1a",
        flexShrink: 0, borderBottom: "2px solid #c4b898",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ fontFamily: "'Caveat', cursive", fontSize: 22, fontWeight: 700, color: "#fdf8f0" }}>
            2<span style={{ color: "#b85c2a" }}>Buddy</span>
          </div>
          <div style={{ width: 1, height: 20, backgroundColor: "#c4b898" }} />
          <span style={{
            fontFamily: "'Caveat', cursive", fontSize: 16, color: "#c4b898",
            textTransform: "uppercase", letterSpacing: "0.08em",
          }}>
            {session.subject}
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          {notification && (
            <span style={{
              fontFamily: "'Caveat', cursive", fontSize: 13,
              backgroundColor: "rgba(255,255,255,0.15)", color: "#fdf8f0", padding: "4px 12px",
            }}>
              {notification}
            </span>
          )}
          <button
            onClick={handleEndSession}
            style={{
              padding: "5px 16px", backgroundColor: "#b85c2a",
              color: "#fdf8f0", border: "none",
              fontFamily: "'Caveat', cursive", fontSize: 14, fontWeight: 600,
              cursor: "pointer", borderRadius: 0,
            }}
          >
            {ending ? "Ending..." : "End Session"}
          </button>
          <div style={{
            width: 28, height: 28, backgroundColor: userColor, borderRadius: "50%",
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "#fff", fontFamily: "'Caveat', cursive", fontWeight: 700, fontSize: 14,
          }}>
            {user?.username?.[0]?.toUpperCase()}
          </div>
        </div>
      </div>

      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        <LeftPanel
          problem={session.problem}
          sessionTimer={sessionTimer}
          aiMessages={aiMessages}
          onRequestReview={handleRequestReview}
          onVoteStuck={handleVoteStuck}
          onCheckAnswer={handleCheckAnswer}
          hasVotedStuck={hasVotedStuck}
          stuckVotes={stuckVotes}
          checksRemaining={checksRemaining}
          canvasRef={canvasRef}
          partnerVotedStuck={partnerVotedStuck}
        />

        <div style={{
          flex: 1, position: "relative",
          overflow: "hidden", display: "flex", flexDirection: "column",
        }}>
          <FloatingToolbar
            activeTool={activeTool}
            activeBackground={activeBackground}
            onToolChange={setActiveTool}
            onBackgroundChange={setActiveBackground}
            onClear={handleClear}
            onUndo={handleUndo}
            onExport={handleExport}
          />

          <div style={{
            flex: 1,
            margin: "58px 0 0 0",
            overflow: "hidden",
            position: "relative",
            display: "flex",
            border: "none",
          }}>
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

            <div style={{
              position: "absolute", bottom: 16,
              left: "50%", transform: "translateX(-50%)", zIndex: 100,
            }}>
              <button
                onClick={() => setMathKeyboardOpen((v) => !v)}
                style={{
                  padding: "6px 18px", backgroundColor: "#faf7f0",
                  border: "1.5px solid #c4b898",
                  fontFamily: "'Caveat', cursive", fontSize: 14,
                  color: "#3d2f1a", cursor: "pointer", borderRadius: 3,
                  boxShadow: "0 2px 8px rgba(60,40,10,0.10)",
                }}
              >
                ∑ Math
              </button>
              {mathKeyboardOpen && (
                <MathKeyboard
                  onInsert={handleMathInsert}
                  onClose={() => setMathKeyboardOpen(false)}
                />
              )}
            </div>
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
          roomCode={session.room_code}
          socket={socket}
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