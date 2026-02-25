import { CanvasElement } from "@/types/template";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";

interface Props {
  element: CanvasElement;
  onUpdate: (id: string, updates: Partial<CanvasElement>) => void;
  onDelete: (id: string) => void;
}

export function PropertyPanel({ element, onUpdate, onDelete }: Props) {
  return (
    <div className="space-y-3 text-sm">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-foreground">Properties</h3>
        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => onDelete(element.id)}>
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      <div className="text-xs text-muted-foreground capitalize">{element.type} element</div>

      {/* Label */}
      {element.type === "label" && (
        <div>
          <Label className="text-xs">Text Content</Label>
          <Input
            value={element.content || ""}
            onChange={(e) => onUpdate(element.id, { content: e.target.value })}
            className="h-8 text-sm bg-card"
          />
        </div>
      )}

      {element.type === "field" && (
        <div>
          <Label className="text-xs">Label Text</Label>
          <Input
            value={element.label}
            onChange={(e) => onUpdate(element.id, { label: e.target.value })}
            className="h-8 text-sm bg-card"
          />
        </div>
      )}

      {/* Position */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label className="text-xs">X</Label>
          <Input type="number" value={element.x} onChange={(e) => onUpdate(element.id, { x: Number(e.target.value) })} className="h-8 text-sm bg-card" />
        </div>
        <div>
          <Label className="text-xs">Y</Label>
          <Input type="number" value={element.y} onChange={(e) => onUpdate(element.id, { y: Number(e.target.value) })} className="h-8 text-sm bg-card" />
        </div>
        <div>
          <Label className="text-xs">Width</Label>
          <Input type="number" value={element.width} onChange={(e) => onUpdate(element.id, { width: Math.max(20, Number(e.target.value)) })} className="h-8 text-sm bg-card" />
        </div>
        <div>
          <Label className="text-xs">Height</Label>
          <Input type="number" value={element.height} onChange={(e) => onUpdate(element.id, { height: Math.max(10, Number(e.target.value)) })} className="h-8 text-sm bg-card" />
        </div>
      </div>

      {element.type !== "divider" && element.type !== "logo" && (
        <>
          {/* Font size */}
          <div>
            <Label className="text-xs">Font Size</Label>
            <Input type="number" value={element.fontSize} onChange={(e) => onUpdate(element.id, { fontSize: Math.max(8, Number(e.target.value)) })} className="h-8 text-sm bg-card" />
          </div>

          {/* Font weight */}
          <div>
            <Label className="text-xs">Font Weight</Label>
            <Select value={element.fontWeight} onValueChange={(v) => onUpdate(element.id, { fontWeight: v as "normal" | "bold" })}>
              <SelectTrigger className="h-8 bg-card"><SelectValue /></SelectTrigger>
              <SelectContent className="bg-popover z-50">
                <SelectItem value="normal">Normal</SelectItem>
                <SelectItem value="bold">Bold</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Text align */}
          <div>
            <Label className="text-xs">Alignment</Label>
            <Select value={element.textAlign} onValueChange={(v) => onUpdate(element.id, { textAlign: v as "left" | "center" | "right" })}>
              <SelectTrigger className="h-8 bg-card"><SelectValue /></SelectTrigger>
              <SelectContent className="bg-popover z-50">
                <SelectItem value="left">Left</SelectItem>
                <SelectItem value="center">Center</SelectItem>
                <SelectItem value="right">Right</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Show label toggle (field type only) */}
          {element.type === "field" && (
            <div className="flex items-center justify-between">
              <Label className="text-xs">Show Label Prefix</Label>
              <Switch checked={element.showLabel} onCheckedChange={(v) => onUpdate(element.id, { showLabel: v })} />
            </div>
          )}
        </>
      )}
    </div>
  );
}
