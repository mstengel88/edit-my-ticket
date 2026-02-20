import { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface ComboInputProps {
  value: string;
  onChange: (value: string) => void;
  options: string[];
  placeholder?: string;
  className?: string;
}

export function ComboInput({ value, onChange, options, placeholder, className }: ComboInputProps) {
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState("");
  const wrapperRef = useRef<HTMLDivElement>(null);

  const filtered = options.filter((o) =>
    o.toLowerCase().includes((filter || value).toLowerCase())
  );

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div ref={wrapperRef} className="relative">
      <Input
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setFilter(e.target.value);
          setOpen(true);
        }}
        onFocus={() => {
          setFilter("");
          setOpen(true);
        }}
        placeholder={placeholder}
        className={className}
        autoComplete="off"
      />
      {open && filtered.length > 0 && (
        <div className="absolute z-50 mt-1 w-full max-h-48 overflow-auto rounded-md border bg-popover text-popover-foreground shadow-md">
          {filtered.map((item) => (
            <button
              key={item}
              type="button"
              className={cn(
                "w-full text-left px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground",
                item === value && "bg-accent text-accent-foreground font-medium"
              )}
              onMouseDown={(e) => {
                e.preventDefault();
                onChange(item);
                setOpen(false);
              }}
            >
              {item}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
