"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { sessionsAPI } from "@/app/lib/api";
import { getUser, isAuthenticated } from "@/app/lib/auth";
import { connectSocket, disconnectSocket } from "@/app/lib/socket";
import Canvas, { CanvasRef } from "@/app/components/whiteboard/Canvas";
import Toolbar, { Tool, Background } from "@/app/components/whiteboard/Toolbar";
import AIPanel from "@/app/components/whiteboard/AIPanel";
import ProblemPanel from "@/app/components/whiteboard/ProblemPanel";
import Button from "@/app/components/ui/Button";

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

  const showNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 4000);
  };

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
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "#f9fafb" }}>
        <p style={{ fontSize: 14, color: "#6b7280" }}>Loading session...</p>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", backgroundColor: "#f3f4f6", overflow: "hidden" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 16px", backgroundColor: "#ffffff", borderBottom: "1px solid #e5e7eb", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 16, fontWeight: 700, color: "#111827" }}>2buddy</span>
          <span style={{ fontSize: 11, color: "#9ca3af", fontFamily: "monospace", backgroundColor: "#f3f4f6", padding: "2px 8px", borderRadius: 6 }}>
            {session.room_code}
          </span>
          <span style={{ fontSize: 12, color: "#6b7280", textTransform: "capitalize" }}>{session.subject}</span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {notification && (
            <span style={{ fontSize: 12, backgroundColor: "#f5f3ff", color: "#6d28d9", padding: "4px 12px", borderRadius: 20, border: "1px solid #ddd6fe" }}>
              {notification}
            </span>
          )}
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{ width: 10, height: 10, borderRadius: "50%", backgroundColor: userColor }} />
            <span style={{ fontSize: 12, color: "#6b7280" }}>{user?.username} (you)</span>
          </div>
          {partnerConnected && (
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <div style={{ width: 10, height: 10, borderRadius: "50%", backgroundColor: partnerColor }} />
              <span style={{ fontSize: 12, color: "#6b7280" }}>{partnerName}</span>
            </div>
          )}
          <Button variant="danger" size="sm" loading={ending} onClick={handleEndSession}>
            End session
          </Button>
        </div>
      </div>

      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        <ProblemPanel
          problem={session.problem}
          sessionTimer={sessionTimer}
          partnerConnected={partnerConnected}
          partnerName={partnerName}
          partnerColor={partnerColor}
          userName={user?.username || ""}
          userColor={userColor}
        />

        <div style={{ display: "flex", flex: 1, overflow: "hidden", position: "relative" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: 12, backgroundColor: "#f3f4f6" }}>
            <Toolbar
              activeTool={activeTool}
              activeColor={activeColor}
              strokeSize={strokeSize}
              activeBackground={activeBackground}
              onToolChange={setActiveTool}
              onColorChange={setActiveColor}
              onStrokeSizeChange={setStrokeSize}
              onBackgroundChange={setActiveBackground}
              onClear={handleClear}
              onUndo={handleUndo}
            />
          </div>

          <div style={{ flex: 1, padding: 12, overflow: "hidden", display: "flex" }}>
            <div style={{ width: "100%", height: "100%", borderRadius: 16, overflow: "hidden", boxShadow: "0 1px 8px rgba(0,0,0,0.08)", border: "1px solid #e5e7eb", position: "relative", display: "flex" }}>
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
            </div>
          </div>
        </div>

        <AIPanel
          messages={aiMessages}
          stuckVotes={stuckVotes}
          onRequestReview={handleRequestReview}
          onVoteStuck={handleVoteStuck}
          hasVotedStuck={hasVotedStuck}
          checksRemaining={checksRemaining}
        />
      </div>
    </div>
  );
}