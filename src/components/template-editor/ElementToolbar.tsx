import { CanvasElement, AVAILABLE_FIELDS, CANVAS_WIDTH, CANVAS_HEIGHT } from "@/types/template";
import { Button } from "@/components/ui/button";
import { Plus, Type, Minus, Image } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";

interface Props {
  elements: CanvasElement[];
  onAdd: (element: CanvasElement) => void;
}

export function ElementToolbar({ elements, onAdd }: Props) {
  const existingKeys = new Set(elements.filter((e) => e.type === "field").map((e) => e.key));

  const addField = (key: string, label: string) => {
    onAdd({
      id: `field_${key}_${Date.now()}`,
      type: "field",
      key,
      label,
      x: 20,
      y: Math.min(300, 20 + elements.length * 30),
      width: 250,
      height: 22,
      fontSize: 13,
      fontWeight: "bold",
      textAlign: "left",
      showLabel: true,
    });
  };

  const addLabel = () => {
    onAdd({
      id: `label_${Date.now()}`,
      type: "label",
      label: "Text",
      content: "Custom Text",
      x: 20,
      y: Math.min(300, 20 + elements.length * 30),
      width: 200,
      height: 22,
      fontSize: 13,
      fontWeight: "normal",
      textAlign: "left",
      showLabel: false,
    });
  };

  const addDivider = () => {
    onAdd({
      id: `divider_${Date.now()}`,
      type: "divider",
      label: "Divider",
      x: 20,
      y: Math.min(400, 20 + elements.length * 30),
      width: CANVAS_WIDTH - 40,
      height: 2,
      fontSize: 14,
      fontWeight: "normal",
      textAlign: "left",
      showLabel: false,
    });
  };

  const addLogo = () => {
    if (elements.some((e) => e.type === "logo")) return;
    onAdd({
      id: `logo_${Date.now()}`,
      type: "logo",
      label: "Logo",
      x: 20,
      y: 15,
      width: 80,
      height: 60,
      fontSize: 14,
      fontWeight: "normal",
      textAlign: "left",
      showLabel: false,
    });
  };

  return (
    <div className="flex gap-2 flex-wrap">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="gap-1.5">
            <Plus className="h-4 w-4" /> Data Field
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="max-h-64 overflow-y-auto bg-popover z-50">
          <DropdownMenuLabel>Ticket Fields</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {AVAILABLE_FIELDS.map((f) => (
            <DropdownMenuItem
              key={f.key}
              onClick={() => addField(f.key, f.label)}
              className={existingKeys.has(f.key) ? "opacity-50" : ""}
            >
              {f.label}
              {existingKeys.has(f.key) && <span className="text-xs text-muted-foreground ml-2">(added)</span>}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <Button variant="outline" size="sm" className="gap-1.5" onClick={addLabel}>
        <Type className="h-4 w-4" /> Text Label
      </Button>

      <Button variant="outline" size="sm" className="gap-1.5" onClick={addDivider}>
        <Minus className="h-4 w-4" /> Divider
      </Button>

      <Button
        variant="outline"
        size="sm"
        className="gap-1.5"
        onClick={addLogo}
        disabled={elements.some((e) => e.type === "logo")}
      >
        <Image className="h-4 w-4" /> Logo
      </Button>
    </div>
  );
}
