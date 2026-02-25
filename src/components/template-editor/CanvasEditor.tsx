import { useState, useRef, useCallback, useEffect } from "react";
import { CanvasElement as CanvasElementType, CANVAS_WIDTH, CANVAS_HEIGHT } from "@/types/template";
import { TicketData } from "@/types/ticket";
import { CanvasElementComponent } from "./CanvasElement";
import { ElementToolbar } from "./ElementToolbar";
import { PropertyPanel } from "./PropertyPanel";

interface Props {
  elements: CanvasElementType[];
  onChange: (elements: CanvasElementType[]) => void;
  sampleTicket: TicketData;
}

export function CanvasEditor({ elements, onChange, sampleTicket }: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  const selectedElement = elements.find((e) => e.id === selectedId) || null;

  // Calculate scale to fit canvas in container
  useEffect(() => {
    const updateScale = () => {
      if (containerRef.current) {
        const containerWidth = containerRef.current.clientWidth;
        setScale(Math.min(1, containerWidth / CANVAS_WIDTH));
      }
    };
    updateScale();
    window.addEventListener("resize", updateScale);
    return () => window.removeEventListener("resize", updateScale);
  }, []);

  const handleMove = useCallback(
    (id: string, x: number, y: number) => {
      onChange(elements.map((e) => (e.id === id ? { ...e, x: Math.max(0, x), y: Math.max(0, y) } : e)));
    },
    [elements, onChange]
  );

  const handleResize = useCallback(
    (id: string, width: number, height: number) => {
      onChange(elements.map((e) => (e.id === id ? { ...e, width, height } : e)));
    },
    [elements, onChange]
  );

  const handleUpdate = useCallback(
    (id: string, updates: Partial<CanvasElementType>) => {
      onChange(elements.map((e) => (e.id === id ? { ...e, ...updates } : e)));
    },
    [elements, onChange]
  );

  const handleDelete = useCallback(
    (id: string) => {
      onChange(elements.filter((e) => e.id !== id));
      setSelectedId(null);
    },
    [elements, onChange]
  );

  const handleAdd = useCallback(
    (element: CanvasElementType) => {
      onChange([...elements, element]);
      setSelectedId(element.id);
    },
    [elements, onChange]
  );

  const handleCanvasClick = () => setSelectedId(null);

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <ElementToolbar elements={elements} onAdd={handleAdd} />

      <div className="flex gap-4">
        {/* Canvas */}
        <div className="flex-1" ref={containerRef}>
          <div
            className="relative bg-white border-2 border-black/80 mx-auto"
            style={{
              width: CANVAS_WIDTH,
              height: CANVAS_HEIGHT,
              transform: `scale(${scale})`,
              transformOrigin: "top left",
            }}
            onClick={handleCanvasClick}
          >
            {elements.map((el) => (
              <CanvasElementComponent
                key={el.id}
                element={el}
                scale={scale}
                selected={el.id === selectedId}
                ticket={sampleTicket}
                editMode={true}
                onSelect={setSelectedId}
                onMove={handleMove}
                onResize={handleResize}
              />
            ))}
          </div>
          {/* Spacer for scaled canvas */}
          <div style={{ height: CANVAS_HEIGHT * scale - CANVAS_HEIGHT * scale + 8 }} />
        </div>

        {/* Property Panel */}
        <div className="w-56 shrink-0">
          {selectedElement ? (
            <div className="rounded-lg border bg-card p-3">
              <PropertyPanel element={selectedElement} onUpdate={handleUpdate} onDelete={handleDelete} />
            </div>
          ) : (
            <div className="rounded-lg border bg-card p-3 text-sm text-muted-foreground">
              Click an element on the canvas to edit its properties
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
