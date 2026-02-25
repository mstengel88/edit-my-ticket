import { useRef, useCallback, useState } from "react";
import { CanvasElement as CanvasElementType } from "@/types/template";
import { TicketData } from "@/types/ticket";
import companyLogo from "@/assets/Greenhillssupply_logo.png";

interface Props {
  element: CanvasElementType;
  scale: number;
  selected: boolean;
  ticket?: TicketData;
  editMode: boolean;
  onSelect: (id: string) => void;
  onMove: (id: string, x: number, y: number) => void;
  onResize: (id: string, width: number, height: number) => void;
}

export function CanvasElementComponent({
  element,
  scale,
  selected,
  ticket,
  editMode,
  onSelect,
  onMove,
  onResize,
}: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);
  const [resizing, setResizing] = useState(false);
  const startRef = useRef({ x: 0, y: 0, elX: 0, elY: 0, elW: 0, elH: 0 });

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (!editMode) return;
      e.stopPropagation();
      onSelect(element.id);
      setDragging(true);
      startRef.current = { x: e.clientX, y: e.clientY, elX: element.x, elY: element.y, elW: element.width, elH: element.height };

      const onMouseMove = (ev: MouseEvent) => {
        const dx = (ev.clientX - startRef.current.x) / scale;
        const dy = (ev.clientY - startRef.current.y) / scale;
        onMove(element.id, Math.round(startRef.current.elX + dx), Math.round(startRef.current.elY + dy));
      };
      const onMouseUp = () => {
        setDragging(false);
        window.removeEventListener("mousemove", onMouseMove);
        window.removeEventListener("mouseup", onMouseUp);
      };
      window.addEventListener("mousemove", onMouseMove);
      window.addEventListener("mouseup", onMouseUp);
    },
    [editMode, element, scale, onSelect, onMove]
  );

  const handleResizeMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      e.preventDefault();
      setResizing(true);
      startRef.current = { x: e.clientX, y: e.clientY, elX: element.x, elY: element.y, elW: element.width, elH: element.height };

      const onMouseMove = (ev: MouseEvent) => {
        const dx = (ev.clientX - startRef.current.x) / scale;
        const dy = (ev.clientY - startRef.current.y) / scale;
        onResize(element.id, Math.max(30, Math.round(startRef.current.elW + dx)), Math.max(14, Math.round(startRef.current.elH + dy)));
      };
      const onMouseUp = () => {
        setResizing(false);
        window.removeEventListener("mousemove", onMouseMove);
        window.removeEventListener("mouseup", onMouseUp);
      };
      window.addEventListener("mousemove", onMouseMove);
      window.addEventListener("mouseup", onMouseUp);
    },
    [element, scale, onResize]
  );

  const getValue = () => {
    if (!ticket || !element.key) return element.label;
    return (ticket as any)[element.key] || "—";
  };

  const renderContent = () => {
    if (element.type === "logo") {
      return <img src={companyLogo} alt="Logo" className="h-full w-auto object-contain" />;
    }
    if (element.type === "divider") {
      return <div className="w-full border-t border-black/30" style={{ marginTop: element.height / 2 }} />;
    }
    if (element.type === "label") {
      return (
        <span style={{ fontSize: element.fontSize, fontWeight: element.fontWeight, textAlign: element.textAlign, display: "block", color: "#000" }}>
          {element.content || element.label}
        </span>
      );
    }
    // field type
    const value = getValue();
    return (
      <span style={{ fontSize: element.fontSize, fontWeight: element.fontWeight, textAlign: element.textAlign, display: "block", color: "#000" }}>
        {element.showLabel && <span style={{ fontWeight: "normal", fontSize: Math.max(10, element.fontSize - 2), color: "rgba(0,0,0,0.55)", marginRight: 4 }}>{element.label}:</span>}
        {value}
      </span>
    );
  };

  return (
    <div
      ref={ref}
      onMouseDown={handleMouseDown}
      className={`absolute ${editMode ? "cursor-move" : ""} ${selected && editMode ? "ring-2 ring-blue-500 ring-offset-1" : ""} ${dragging ? "opacity-80" : ""}`}
      style={{
        left: element.x,
        top: element.y,
        width: element.width,
        height: element.height,
        overflow: "hidden",
        textAlign: element.textAlign as any,
        lineHeight: element.type === "divider" ? `${element.height}px` : undefined,
      }}
    >
      {renderContent()}
      {/* Resize handle */}
      {selected && editMode && (
        <div
          onMouseDown={handleResizeMouseDown}
          className="absolute bottom-0 right-0 w-3 h-3 bg-blue-500 cursor-se-resize rounded-tl-sm"
          style={{ zIndex: 10 }}
        />
      )}
    </div>
  );
}
