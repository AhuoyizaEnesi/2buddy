"use client";

import React, {
  useRef,
  useEffect,
  useState,
  useCallback,
  forwardRef,
  useImperativeHandle,
} from "react";
import { Tool } from "./Toolbar";
import PartnerCursor from "./PartnerCursor";

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
}

const Canvas = forwardRef<CanvasRef, CanvasProps>(
  (
    {
      activeTool,
      activeColor,
      strokeSize,
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
    const startPoint = useRef<Point | null>(null);
    const snapshotRef = useRef<ImageData | null>(null);
    const historyRef = useRef<ImageData[]>([]);
    const [textInput, setTextInput] = useState<{
      x: number;
      y: number;
      visible: boolean;
      value: string;
    }>({ x: 0, y: 0, visible: false, value: "" });

    const getCtx = () => {
      const canvas = canvasRef.current;
      if (!canvas) return null;
      return canvas.getContext("2d");
    };

    const getPos = (e: React.MouseEvent | React.TouchEvent): Point => {
      const canvas = canvasRef.current;
      if (!canvas) return { x: 0, y: 0 };
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;

      if ("touches" in e) {
        const touch = e.touches[0];
        return {
          x: (touch.clientX - rect.left) * scaleX,
          y: (touch.clientY - rect.top) * scaleY,
        };
      }
      return {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY,
      };
    };

    const saveHistory = () => {
      const canvas = canvasRef.current;
      const ctx = getCtx();
      if (!canvas || !ctx) return;
      historyRef.current.push(ctx.getImageData(0, 0, canvas.width, canvas.height));
      if (historyRef.current.length > 50) historyRef.current.shift();
    };

    const drawStroke = useCallback((ctx: CanvasRenderingContext2D, stroke: Stroke) => {
      ctx.save();
      ctx.strokeStyle = stroke.tool === "eraser" ? "#FFFFFF" : stroke.color;
      ctx.lineWidth = stroke.tool === "eraser" ? stroke.size * 3 : stroke.size;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      if (stroke.tool === "pen" || stroke.tool === "eraser") {
        if (stroke.points.length < 2) return;
        ctx.beginPath();
        ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
        for (let i = 1; i < stroke.points.length; i++) {
          const midX = (stroke.points[i - 1].x + stroke.points[i].x) / 2;
          const midY = (stroke.points[i - 1].y + stroke.points[i].y) / 2;
          ctx.quadraticCurveTo(stroke.points[i - 1].x, stroke.points[i - 1].y, midX, midY);
        }
        ctx.stroke();
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
        ctx.fillStyle = "#FFFFFF";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        onCanvasUpdate(canvas.toDataURL("image/png"));
      },
      undo: () => {
        const canvas = canvasRef.current;
        const ctx = getCtx();
        if (!canvas || !ctx || historyRef.current.length === 0) return;
        const prev = historyRef.current.pop()!;
        ctx.putImageData(prev, 0, 0);
        onCanvasUpdate(canvas.toDataURL("image/png"));
      },
      getDataUrl: () => {
        return canvasRef.current?.toDataURL("image/png") || "";
      },
      loadFromDataUrl: (dataUrl: string) => {
        if (!dataUrl) return;
        const canvas = canvasRef.current;
        const ctx = getCtx();
        if (!canvas || !ctx) return;
        const img = new Image();
        img.onload = () => {
          ctx.fillStyle = "#FFFFFF";
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0);
        };
        img.src = dataUrl;
      },
      applyRemoteStroke: (stroke: Stroke) => {
        const ctx = getCtx();
        if (!ctx) return;
        drawStroke(ctx, stroke);
        const canvas = canvasRef.current;
        if (canvas) onCanvasUpdate(canvas.toDataURL("image/png"));
      },
    }));

    useEffect(() => {
      const canvas = canvasRef.current;
      const container = containerRef.current;
      if (!canvas || !container) return;

      const resize = () => {
        const ctx = getCtx();
        if (!ctx) return;
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        canvas.width = container.clientWidth;
        canvas.height = container.clientHeight;
        ctx.fillStyle = "#FFFFFF";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.putImageData(imageData, 0, 0);
      };

      canvas.width = container.clientWidth;
      canvas.height = container.clientHeight;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.fillStyle = "#FFFFFF";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      const observer = new ResizeObserver(resize);
      observer.observe(container);
      return () => observer.disconnect();
    }, []);

    const handleMouseDown = (e: React.MouseEvent) => {
      const pos = getPos(e);

      if (activeTool === "text") {
        const canvas = canvasRef.current;
        if (!canvas) return;
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
      startPoint.current = pos;
      currentStroke.current = {
        tool: activeTool,
        color: activeColor,
        size: strokeSize,
        points: [pos],
      };

      if (activeTool === "pen" || activeTool === "eraser") {
        const ctx = getCtx();
        if (!ctx) return;
        snapshotRef.current = null;
      } else {
        const canvas = canvasRef.current;
        const ctx = getCtx();
        if (!canvas || !ctx) return;
        snapshotRef.current = ctx.getImageData(0, 0, canvas.width, canvas.height);
      }
    };

    const handleMouseMove = (e: React.MouseEvent) => {
      const pos = getPos(e);
      onCursorMove(e.clientX, e.clientY);

      if (!isDrawing.current || !currentStroke.current) return;

      const ctx = getCtx();
      const canvas = canvasRef.current;
      if (!ctx || !canvas) return;

      currentStroke.current.points.push(pos);

      if (activeTool === "pen" || activeTool === "eraser") {
        drawStroke(ctx, {
          ...currentStroke.current,
          points: currentStroke.current.points.slice(-3),
        });
      } else {
        if (snapshotRef.current) {
          ctx.putImageData(snapshotRef.current, 0, 0);
        }
        drawStroke(ctx, currentStroke.current);
      }
    };

    const handleMouseUp = () => {
      if (!isDrawing.current || !currentStroke.current) return;
      isDrawing.current = false;

      const canvas = canvasRef.current;
      if (canvas) {
        onStroke(currentStroke.current);
        onCanvasUpdate(canvas.toDataURL("image/png"));
      }

      currentStroke.current = null;
    };

    const handleTextSubmit = () => {
      if (!textInput.value.trim()) {
        setTextInput((t) => ({ ...t, visible: false }));
        return;
      }

      const canvas = canvasRef.current;
      const ctx = getCtx();
      if (!canvas || !ctx) return;

      saveHistory();
      const scaleX = canvas.width / canvas.getBoundingClientRect().width;
      const scaleY = canvas.height / canvas.getBoundingClientRect().height;

      const stroke: Stroke = {
        tool: "text",
        color: activeColor,
        size: strokeSize,
        points: [{ x: textInput.x * scaleX, y: textInput.y * scaleY }],
        text: textInput.value,
      };

      drawStroke(ctx, stroke);
      onStroke(stroke);
      onCanvasUpdate(canvas.toDataURL("image/png"));
      setTextInput({ x: 0, y: 0, visible: false, value: "" });
    };

    const cursorStyle =
      activeTool === "eraser"
        ? "cursor-cell"
        : activeTool === "text"
        ? "cursor-text"
        : "cursor-crosshair";

    return (
      <div ref={containerRef} className="relative flex-1 overflow-hidden bg-white">
        <canvas
          ref={canvasRef}
          className={`absolute inset-0 w-full h-full ${cursorStyle}`}
          style={{
            backgroundImage:
              "radial-gradient(circle, #d1d5db 1px, transparent 1px)",
            backgroundSize: "24px 24px",
          }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        />

        {partnerCursor && (
          <PartnerCursor
            x={partnerCursor.x}
            y={partnerCursor.y}
            color={partnerCursor.color}
            username={partnerCursor.username}
          />
        )}

        {textInput.visible && (
          <div
            className="absolute z-40"
            style={{ left: textInput.x, top: textInput.y }}
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
              className="border-b-2 border-violet-500 outline-none bg-transparent text-sm px-1"
              style={{ color: activeColor, minWidth: 120 }}
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