import { useState, useEffect } from "react";
import { useTicketTemplate } from "@/hooks/useTicketTemplate";
import { TemplateField } from "@/types/template";
import { TicketData, sampleTickets } from "@/types/ticket";
import { TicketPreview } from "@/components/TicketPreview";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ArrowLeft, Save, GripVertical, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

function SortableFieldItem({
  field,
  onToggle,
}: {
  field: TemplateField;
  onToggle: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: field.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-3 rounded-md border bg-card px-3 py-2.5"
    >
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab text-muted-foreground hover:text-foreground touch-none"
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <span className="flex-1 text-sm font-medium text-foreground">{field.label}</span>
      <span className="text-xs text-muted-foreground mr-2">{field.section}</span>
      <Switch
        checked={field.visible}
        onCheckedChange={() => onToggle(field.id)}
      />
    </div>
  );
}

const Settings = () => {
  const navigate = useNavigate();
  const { fields, copiesPerPage, loading, saveTemplate } = useTicketTemplate();
  const [localFields, setLocalFields] = useState<TemplateField[]>([]);
  const [localCopies, setLocalCopies] = useState(2);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    setLocalFields(fields);
    setLocalCopies(copiesPerPage);
  }, [fields, copiesPerPage]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setLocalFields((prev) => {
        const oldIndex = prev.findIndex((f) => f.id === active.id);
        const newIndex = prev.findIndex((f) => f.id === over.id);
        return arrayMove(prev, oldIndex, newIndex);
      });
      setDirty(true);
    }
  };

  const handleToggle = (id: string) => {
    setLocalFields((prev) =>
      prev.map((f) => (f.id === id ? { ...f, visible: !f.visible } : f))
    );
    setDirty(true);
  };

  const handleSave = async () => {
    await saveTemplate(localFields, localCopies);
    setDirty(false);
    toast.success("Template saved!");
  };

  const handleCopiesChange = (value: string) => {
    setLocalCopies(Number(value));
    setDirty(true);
  };

  const sampleTicket: TicketData = sampleTickets[0];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 border-b bg-card/80 backdrop-blur-sm">
        <div className="container mx-auto flex items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-lg font-bold tracking-tight text-foreground">
              Template Settings
            </h1>
          </div>
          <Button onClick={handleSave} disabled={!dirty} size="sm" className="gap-1.5">
            <Save className="h-4 w-4" /> Save Template
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 sm:px-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Field list */}
          <div>
            <h2 className="text-sm font-semibold text-foreground mb-3">
              Drag to reorder · Toggle to show/hide
            </h2>
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={localFields.map((f) => f.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-1.5">
                  {localFields.map((field) => (
                    <SortableFieldItem
                      key={field.id}
                      field={field}
                      onToggle={handleToggle}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>

            {/* Copies per page */}
            <div className="mt-4 flex items-center gap-3">
              <Label className="text-sm font-medium text-foreground whitespace-nowrap">Tickets per page</Label>
              <Select value={String(localCopies)} onValueChange={handleCopiesChange}>
                <SelectTrigger className="w-20 bg-card">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-popover z-50">
                  <SelectItem value="1">1</SelectItem>
                  <SelectItem value="2">2</SelectItem>
                  <SelectItem value="3">3</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Live preview */}
          <div>
            <h2 className="text-sm font-semibold text-foreground mb-3">Live Preview</h2>
            <div className="pointer-events-none">
              <TicketPreview ticket={sampleTicket} templateFields={localFields} />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Settings;
