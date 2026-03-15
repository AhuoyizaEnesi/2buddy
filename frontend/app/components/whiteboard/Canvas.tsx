"use client";

import React, {
  useRef,
  useEffect,
  useState,
  useCallback,
  forwardRef,
  useImperativeHandle,
} from "react";
import { Tool, Background } from "./Toolbar";
import PartnerCursor from "./PartnerCursor";
import { on } from "events";

interface Point {
  x: number;
  y: number;
}

interface Stroke {
  tool: Tool;
  color: string;
  size: number;
  points: Point[];
  text?: string;
}

interface StickyNote {
  id: string;
  x: number;
  y: number;
  text: string;
  color: string;
}

interface LaserDot {
  x: number;
  y: number;
  id: number;
}

interface PartnerCursorData {
  x: number;
  y: number;
  color: string;
  username: string;
}

interface CanvasProps {
  activeTool: Tool;
  activeColor: string;
  strokeSize: number;
  activeBackground: Background;
  partnerCursor: PartnerCursorData | null;
  onStroke: (stroke: Stroke) => void;
  onCursorMove: (x: number, y: number) => void;
  onCanvasUpdate: (dataUrl: string) => void;
}

export interface CanvasRef {
  clearCanvas: () => void;
  undo: () => void;
  getDataUrl: () => string;
  loadFromDataUrl: (dataUrl: string) => void;
  applyRemoteStroke: (stroke: Stroke) => void;
  drawImage: (dataUrl: string) => void;
  insertText: (text: string) => void;
}

const STICKY_COLORS = ["#fef08a", "#bbf7d0", "#bfdbfe", "#fecaca", "#e9d5ff"];

const getBackgroundStyle = (bg: Background): React.CSSProperties => {
  switch (bg) {
    case "dots":
      return {
        backgroundColor: "#f0f9ff",
        backgroundImage: "radial-gradient(circle, #93c5fd 1px, transparent 1px)",
        backgroundSize: "24px 24px",
      };
    case "grid":
      return {
        backgroundColor: "#f0fdf4",
        backgroundImage:
          "linear-gradient(#bbf7d0 1px, transparent 1px), linear-gradient(90deg, #bbf7d0 1px, transparent 1px)",
        backgroundSize: "40px 40px",
      };
    case "lined":
      return {
        backgroundColor: "#fefce8",
        backgroundImage: "linear-gradient(#fde68a 1px, transparent 1px)",
        backgroundSize: "100% 32px",
      };
    case "isometric":
      return {
        backgroundColor: "#faf5ff",
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='56' height='100'%3E%3Cpath d='M28 66L0 50V16L28 0l28 16v34L28 66zm0 0v34M0 50l28 16 28-16' fill='none' stroke='%23e9d5ff' stroke-width='1'/%3E%3C/svg%3E")`,
        backgroundSize: "56px 100px",
      };
    case "chalkboard":
      return {
        backgroundColor: "#1a3a2a",
      };
    default:
      return {
        backgroundColor: "#ffffff",
      };
  }
};

const getBgFillColor = (bg: Background): string | null => {
  if (bg === "chalkboard") return "#1a3a2a";
  if (bg === "white") return "#ffffff";
  return null;
};

const getEraserColor = (bg: Background): string => {
  if (bg === "chalkboard") return "#1a3a2a";
  return "#ffffff";
};

const Canvas = forwardRef<CanvasRef, CanvasProps>(
  (
    {
      activeTool,
      activeColor,
      strokeSize,
      activeBackground,
      partnerCursor,
      onStroke,
      onCursorMove,
      onCanvasUpdate,
    },
    ref
  ) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const isDrawing = useRef(false);
    const currentStroke = useRef<Stroke | null>(null);
    const snapshotRef = useRef<ImageData | null>(null);
    const historyRef = useRef<ImageData[]>([]);
    const activeToolRef = useRef<Tool>(activeTool);
    const activeColorRef = useRef<string>(activeColor);
    const strokeSizeRef = useRef<number>(strokeSize);
    const activeBackgroundRef = useRef<Background>(activeBackground);
    const laserTimersRef = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());
    const laserIdRef = useRef(0);

    const onStrokeRef = useRef(onStroke);
    const onCursorMoveRef = useRef(onCursorMove);
    const onCanvasUpdateRef = useRef(onCanvasUpdate);

    const [textInput, setTextInput] = useState<{
      x: number;
      y: number;
      visible: boolean;
      value: string;
    }>({ x: 0, y: 0, visible: false, value: "" });

    const [stickyNotes, setStickyNotes] = useState<StickyNote[]>([]);
    const [editingSticky, setEditingSticky] = useState<string | null>(null);
    const [laserDots, setLaserDots] = useState<LaserDot[]>([]);

    useEffect(() => { activeToolRef.current = activeTool; }, [activeTool]);
    useEffect(() => { activeColorRef.current = activeColor; }, [activeColor]);
    useEffect(() => { strokeSizeRef.current = strokeSize; }, [strokeSize]);
    useEffect(() => { activeBackgroundRef.current = activeBackground; }, [activeBackground]);
    useEffect(() => { onStrokeRef.current = onStroke; }, [onStroke]);
    useEffect(() => { onCursorMoveRef.current = onCursorMove; }, [onCursorMove]);
    useEffect(() => { onCanvasUpdateRef.current = onCanvasUpdate; }, [onCanvasUpdate]);

    const getCtx = () => {
      const canvas = canvasRef.current;
      if (!canvas) return null;
      return canvas.getContext("2d");
    };

    const getPos = (e: MouseEvent): Point => {
      const canvas = canvasRef.current;
      if (!canvas) return { x: 0, y: 0 };
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      return {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY,
      };
    };

    const saveHistory = () => {
      const canvas = canvasRef.current;
      const ctx = getCtx();
      if (!canvas || !ctx || canvas.width === 0 || canvas.height === 0) return;
      historyRef.current.push(ctx.getImageData(0, 0, canvas.width, canvas.height));
      if (historyRef.current.length > 50) historyRef.current.shift();
    };

    const drawStroke = useCallback((ctx: CanvasRenderingContext2D, stroke: Stroke) => {
      ctx.save();

      if (stroke.tool === "eraser") {
        ctx.globalCompositeOperation = "source-over";
        ctx.strokeStyle = getEraserColor(activeBackgroundRef.current);
        ctx.fillStyle = getEraserColor(activeBackgroundRef.current);
      } else {
        ctx.globalCompositeOperation = "source-over";
        ctx.strokeStyle = stroke.color;
        ctx.fillStyle = stroke.color;
      }

      ctx.lineWidth = stroke.tool === "eraser" ? stroke.size * 3 : stroke.size;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      if (stroke.tool === "pen" || stroke.tool === "eraser") {
        if (stroke.points.length < 2) {
          ctx.beginPath();
          ctx.arc(stroke.points[0].x, stroke.points[0].y, stroke.size / 2, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.beginPath();
          ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
          for (let i = 1; i < stroke.points.length; i++) {
            const midX = (stroke.points[i - 1].x + stroke.points[i].x) / 2;
            const midY = (stroke.points[i - 1].y + stroke.points[i].y) / 2;
            ctx.quadraticCurveTo(stroke.points[i - 1].x, stroke.points[i - 1].y, midX, midY);
          }
          ctx.stroke();
        }
      } else if (stroke.tool === "line") {
        const first = stroke.points[0];
        const last = stroke.points[stroke.points.length - 1];
        ctx.beginPath();
        ctx.moveTo(first.x, first.y);
        ctx.lineTo(last.x, last.y);
        ctx.stroke();
      } else if (stroke.tool === "rectangle") {
        const first = stroke.points[0];
        const last = stroke.points[stroke.points.length - 1];
        ctx.strokeRect(first.x, first.y, last.x - first.x, last.y - first.y);
      } else if (stroke.tool === "circle") {
        const first = stroke.points[0];
        const last = stroke.points[stroke.points.length - 1];
        const radiusX = Math.abs(last.x - first.x) / 2;
        const radiusY = Math.abs(last.y - first.y) / 2;
        const centerX = first.x + (last.x - first.x) / 2;
        const centerY = first.y + (last.y - first.y) / 2;
        ctx.beginPath();
        ctx.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, 2 * Math.PI);
        ctx.stroke();
      } else if (stroke.tool === "text" && stroke.text) {
        ctx.globalCompositeOperation = "source-over";
        ctx.fillStyle = stroke.color;
        ctx.font = `${stroke.size * 4 + 12}px sans-serif`;
        ctx.fillText(stroke.text, stroke.points[0].x, stroke.points[0].y);
      }

      ctx.restore();
    }, []);

    useImperativeHandle(ref, () => ({
      clearCanvas: () => {
        const canvas = canvasRef.current;
        const ctx = getCtx();
        if (!canvas || !ctx) return;
        saveHistory();
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        const bgFill = getBgFillColor(activeBackgroundRef.current);
        if (bgFill) {
          ctx.save();
          ctx.globalCompositeOperation = "source-over";
          ctx.fillStyle = bgFill;
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.restore();
        }
        setStickyNotes([]);
      },
      undo: () => {
        const canvas = canvasRef.current;
        const ctx = getCtx();
        if (!canvas || !ctx || historyRef.current.length === 0) return;
        const prev = historyRef.current.pop()!;
        ctx.putImageData(prev, 0, 0);
      },
      getDataUrl: () => canvasRef.current?.toDataURL("image/png") || "",
      loadFromDataUrl: (dataUrl: string) => {
        if (!dataUrl || dataUrl.length < 100) return;
        const canvas = canvasRef.current;
        const ctx = getCtx();
        if (!canvas || !ctx) return;
        const img = new Image();
        img.onload = () => {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          const bgFill = getBgFillColor(activeBackgroundRef.current);
          if (bgFill) {
            ctx.save();
            ctx.globalCompositeOperation = "source-over";
            ctx.fillStyle = bgFill;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.restore();
          }
          ctx.drawImage(img, 0, 0);
        };
        img.src = dataUrl;
      },
      applyRemoteStroke: (stroke: Stroke) => {
        const ctx = getCtx();
        if (!ctx) return;
        drawStroke(ctx, stroke);
      },
      drawImage: (dataUrl: string) => {
        const canvas = canvasRef.current;
        const ctx = getCtx();
        if (!canvas || !ctx) return;
        const img = new Image();
        img.onload = () => {
          saveHistory();
          const scale = Math.min(canvas.width / img.width, canvas.height / img.height, 1);
          const x = (canvas.width - img.width * scale) / 2;
          const y = (canvas.height - img.height * scale) / 2;
          ctx.drawImage(img, x, y, img.width * scale, img.height * scale);
        };
        img.src = dataUrl;
      },
      insertText: (text: string) => {
        const canvas = canvasRef.current;
        const ctx = getCtx();
        if (!canvas || !ctx) return;
        saveHistory();
        const stroke: Stroke = {
          tool: "text",
          color: activeColorRef.current,
          size: strokeSizeRef.current,
          points: [{ x: canvas.width / 2 - 20, y: canvas.height / 2 }],
          text,
        };
        drawStroke(ctx, stroke);
        onStrokeRef.current(stroke);
      },
    }));

    useEffect(() => {
      const canvas = canvasRef.current;
      const container = containerRef.current;
      if (!canvas || !container) return;

      canvas.width = container.clientWidth;
      canvas.height = container.clientHeight;
      const initCtx = canvas.getContext("2d");
      if (initCtx) {
        const bgFill = getBgFillColor(activeBackgroundRef.current);
        if (bgFill) {
          initCtx.fillStyle = bgFill;
          initCtx.fillRect(0, 0, canvas.width, canvas.height);
        }
      }

      const onMouseDown = (e: MouseEvent) => {
        e.preventDefault();
        const tool = activeToolRef.current;
        const color = activeColorRef.current;
        const size = strokeSizeRef.current;
        const pos = getPos(e);

        if (tool === "laser") return;

        if (tool === "sticky") {
          const rect = canvas.getBoundingClientRect();
          const newSticky: StickyNote = {
            id: Date.now().toString(),
            x: e.clientX - rect.left,
            y: e.clientY - rect.top,
            text: "",
            color: STICKY_COLORS[Math.floor(Math.random() * STICKY_COLORS.length)],
          };
          setStickyNotes((prev) => [...prev, newSticky]);
          setEditingSticky(newSticky.id);
          return;
        }

        if (tool === "text") {
          const rect = canvas.getBoundingClientRect();
          setTextInput({
            x: e.clientX - rect.left,
            y: e.clientY - rect.top,
            visible: true,
            value: "",
          });
          return;
        }

        saveHistory();
        isDrawing.current = true;
        currentStroke.current = { tool, color, size, points: [pos] };

        if (tool === "pen" || tool === "eraser") {
          snapshotRef.current = null;
          const ctx = canvas.getContext("2d");
          if (ctx) {
            ctx.save();
            ctx.globalCompositeOperation = "source-over";
            ctx.fillStyle = tool === "eraser"
              ? getEraserColor(activeBackgroundRef.current)
              : color;
            ctx.beginPath();
            ctx.arc(pos.x, pos.y, size / 2, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
          }
        } else {
          if (canvas.width > 0 && canvas.height > 0) {
            const ctx = canvas.getContext("2d");
            if (ctx)
              snapshotRef.current = ctx.getImageData(0, 0, canvas.width, canvas.height);
          }
        }
      };

      const onMouseMove = (e: MouseEvent) => {
        e.preventDefault();
        onCursorMoveRef.current(e.clientX, e.clientY);

        const tool = activeToolRef.current;

        if (tool === "laser") {
          const rect = canvas.getBoundingClientRect();
          const x = e.clientX - rect.left;
          const y = e.clientY - rect.top;
          const id = laserIdRef.current++;
          setLaserDots((prev) => [...prev.slice(-20), { x, y, id }]);
          const timer = setTimeout(() => {
            setLaserDots((prev) => prev.filter((d) => d.id !== id));
            laserTimersRef.current.delete(id);
          }, 600);
          laserTimersRef.current.set(id, timer);
          return;
        }

        if (!isDrawing.current || !currentStroke.current) return;

        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        const pos = getPos(e);
        currentStroke.current.points.push(pos);
        const stroke = currentStroke.current;

        if (stroke.tool === "pen" || stroke.tool === "eraser") {
          const points = stroke.points;
          const len = points.length;
          if (len < 2) return;

          ctx.save();
          ctx.globalCompositeOperation = "source-over";
          ctx.strokeStyle = stroke.tool === "eraser"
            ? getEraserColor(activeBackgroundRef.current)
            : stroke.color;
          ctx.lineWidth = stroke.tool === "eraser" ? stroke.size * 3 : stroke.size;
          ctx.lineCap = "round";
          ctx.lineJoin = "round";
          ctx.beginPath();

          const p1 = points[len - 2];
          const p2 = points[len - 1];
          const midX = (p1.x + p2.x) / 2;
          const midY = (p1.y + p2.y) / 2;

          if (len === 2) {
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(midX, midY);
          } else {
            const prevMidX = (points[len - 3].x + p1.x) / 2;
            const prevMidY = (points[len - 3].y + p1.y) / 2;
            ctx.moveTo(prevMidX, prevMidY);
            ctx.quadraticCurveTo(p1.x, p1.y, midX, midY);
          }
          ctx.stroke();
          ctx.restore();
        } else {
          if (snapshotRef.current) ctx.putImageData(snapshotRef.current, 0, 0);
          drawStroke(ctx, stroke);
        }
      };

      const onMouseUp = (e: MouseEvent) => {
        e.preventDefault();
        if (!isDrawing.current || !currentStroke.current) return;
        isDrawing.current = false;
        onStrokeRef.current(currentStroke.current);
        currentStroke.current = null;
      };

      const onMouseLeave = (e: MouseEvent) => {
        if (isDrawing.current) onMouseUp(e);
      };

      canvas.addEventListener("mousedown", onMouseDown);
      canvas.addEventListener("mousemove", onMouseMove);
      canvas.addEventListener("mouseup", onMouseUp);
      canvas.addEventListener("mouseleave", onMouseLeave);

      const onTouchStart = (e: TouchEvent) => {
        e.preventDefault();
        const touch = e.touches[0];
        const mouseEvent = new MouseEvent("mousedown", {
          clientX: touch.clientX,
          clientY: touch.clientY,
          bubbles: true,
        });
        onMouseDown(mouseEvent);
      };

      const onTouchMove = (e: TouchEvent) => {
        e.preventDefault();
        const touch = e.touches[0];
        const mouseEvent = new MouseEvent("mousemove", {
          clientX: touch.clientX,
          clientY: touch.clientY,
          bubbles: true,
        });
        onMouseMove(mouseEvent);
      };

      const onTouchEnd = (e: TouchEvent) => {
        e.preventDefault();
        const touch = e.changedTouches[0];
        const mouseEvent = new MouseEvent("mouseup", {
          clientX: Touch.clientX,
          clientY: Touch.clientY,
          bubbles: true,
        });
        onMouseUp(mouseEvent);
      };





      canvas.addEventListener("touchstart", onTouchStart, { passive: false});
      canvas.addEventListener("touchmove", onTouchMove, { passive: false });
      canvas.addEventListener("touchend", onTouchEnd, { passive: false });


      const observer = new ResizeObserver(() => {
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        let imageData: ImageData | null = null;
        if (canvas.width > 0 && canvas.height > 0) {
          imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        }
        canvas.width = container.clientWidth;
        canvas.height = container.clientHeight;
        const bgFill = getBgFillColor(activeBackgroundRef.current);
        if (bgFill) {
          ctx.save();
          ctx.globalCompositeOperation = "source-over";
          ctx.fillStyle = bgFill;
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.restore();
        }
        if (imageData) ctx.putImageData(imageData, 0, 0);
      });

      observer.observe(container);

      return () => {
        canvas.removeEventListener("mousedown", onMouseDown);
        canvas.removeEventListener("mousemove", onMouseMove);
        canvas.removeEventListener("mouseup", onMouseUp);
        canvas.removeEventListener("mouseleave", onMouseLeave);
        canvas.removeEventListener("touchstart", onTouchStart);
        canvas.removeEventListener("touchmove", onTouchMove);
        canvas.removeEventListener("touchend", onTouchEnd);
        observer.disconnect();
        laserTimersRef.current.forEach((t) => clearTimeout(t));
      };
    }, []);

    const handleTextSubmit = () => {
      if (!textInput.value.trim()) {
        setTextInput((t) => ({ ...t, visible: false }));
        return;
      }
      const canvas = canvasRef.current;
      const ctx = getCtx();
      if (!canvas || !ctx) return;
      saveHistory();
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      const stroke: Stroke = {
        tool: "text",
        color: activeColorRef.current,
        size: strokeSizeRef.current,
        points: [{ x: textInput.x * scaleX, y: textInput.y * scaleY }],
        text: textInput.value,
      };
      drawStroke(ctx, stroke);
      onStrokeRef.current(stroke);
      setTextInput({ x: 0, y: 0, visible: false, value: "" });
    };

    const bgStyle = getBackgroundStyle(activeBackground);
    const isChalkboard = activeBackground === "chalkboard";

    const cursorMap: Record<Tool, string> = {
      pen: "crosshair",
      eraser: "cell",
      text: "text",
      line: "crosshair",
      rectangle: "crosshair",
      circle: "crosshair",
      laser: "none",
      sticky: "copy",
    };

    return (
      <div
        ref={containerRef}
        style={{
          position: "relative",
          flex: 1,
          width: "100%",
          height: "100%",
          overflow: "hidden",
          ...bgStyle,
        }}
      >
        <canvas
          ref={canvasRef}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            display: "block",
            cursor: cursorMap[activeTool] || "crosshair",
          }}
        />

        {laserDots.map((dot) => (
          <div
            key={dot.id}
            style={{
              position: "absolute",
              left: dot.x - 8,
              top: dot.y - 8,
              width: 16,
              height: 16,
              borderRadius: "50%",
              backgroundColor: "rgba(239, 68, 68, 0.85)",
              boxShadow: "0 0 8px 4px rgba(239, 68, 68, 0.4)",
              pointerEvents: "none",
              zIndex: 30,
            }}
          />
        ))}

        {stickyNotes.map((note) => (
          <div
            key={note.id}
            style={{
              position: "absolute",
              left: note.x,
              top: note.y,
              width: 160,
              minHeight: 120,
              backgroundColor: note.color,
              borderRadius: 4,
              boxShadow: "2px 2px 8px rgba(0,0,0,0.15)",
              padding: 10,
              zIndex: 25,
              cursor: "move",
            }}
          >
            {editingSticky === note.id ? (
              <textarea
                autoFocus
                value={note.text}
                onChange={(e) => {
                  const val = e.target.value;
                  setStickyNotes((prev) =>
                    prev.map((n) => (n.id === note.id ? { ...n, text: val } : n))
                  );
                }}
                onBlur={() => setEditingSticky(null)}
                style={{
                  width: "100%", minHeight: 80, border: "none",
                  background: "transparent", outline: "none",
                  fontSize: 13, resize: "none", fontFamily: "sans-serif",
                  color: "#1a1a1a",
                }}
                placeholder="Type your note..."
              />
            ) : (
              <div
                onClick={() => setEditingSticky(note.id)}
                style={{
                  fontSize: 13, color: "#1a1a1a", minHeight: 80,
                  whiteSpace: "pre-wrap", wordBreak: "break-word",
                }}
              >
                {note.text || (
                  <span style={{ color: "#9ca3af", fontStyle: "italic" }}>
                    Click to edit
                  </span>
                )}
              </div>
            )}
            <button
              onClick={() =>
                setStickyNotes((prev) => prev.filter((n) => n.id !== note.id))
              }
              style={{
                position: "absolute", top: 4, right: 6,
                background: "none", border: "none", cursor: "pointer",
                fontSize: 14, color: "#6b7280", lineHeight: 1,
              }}
            >
              x
            </button>
          </div>
        ))}

        {partnerCursor && (
          <div style={{ position: "absolute", zIndex: 20, pointerEvents: "none" }}>
            <PartnerCursor
              x={partnerCursor.x}
              y={partnerCursor.y}
              color={partnerCursor.color}
              username={partnerCursor.username}
            />
          </div>
        )}

        {textInput.visible && (
          <div
            style={{
              position: "absolute",
              zIndex: 40,
              left: textInput.x,
              top: textInput.y,
            }}
          >
            <input
              autoFocus
              type="text"
              value={textInput.value}
              onChange={(e) =>
                setTextInput((t) => ({ ...t, value: e.target.value }))
              }
              onKeyDown={(e) => {
                if (e.key === "Enter") handleTextSubmit();
                if (e.key === "Escape")
                  setTextInput((t) => ({ ...t, visible: false }));
              }}
              onBlur={handleTextSubmit}
              style={{
                border: "none",
                borderBottom: `2px solid ${isChalkboard ? "#ffffff" : "#2563eb"}`,
                outline: "none",
                background: "transparent",
                fontSize: 14,
                color: isChalkboard ? "#ffffff" : activeColorRef.current,
                minWidth: 120,
                padding: "2px 4px",
              }}
              placeholder="Type and press Enter"
            />
          </div>
        )}
      </div>
    );
  }
);

Canvas.displayName = "Canvas";
export default Canvas;