import { useState, useRef, useEffect, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface ComboInputProps {
  value: string;
  onChange: (value: string) => void;
  options: string[];
  placeholder?: string;
  className?: string;
}

const MAX_VISIBLE_RESULTS = 50;

export function ComboInput({ value, onChange, options, placeholder, className }: ComboInputProps) {
  const [open, setOpen] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const searchTerm = value.trim().toLowerCase();
  const matchingOptions = searchTerm
    ? options.filter((o) => o.toLowerCase().includes(searchTerm))
    : options;
  const filtered = matchingOptions.slice(0, MAX_VISIBLE_RESULTS);
  const hasMoreMatches = matchingOptions.length > filtered.length;

  const openList = useCallback(() => {
    setOpen(true);
  }, []);

  useEffect(() => {
    function handlePointerDown(e: MouseEvent | TouchEvent | PointerEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }

    if (typeof window !== "undefined" && "PointerEvent" in window) {
      document.addEventListener("pointerdown", handlePointerDown);
      return () => {
        document.removeEventListener("pointerdown", handlePointerDown);
      };
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("touchstart", handlePointerDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("touchstart", handlePointerDown);
    };
  }, []);

  useEffect(() => {
    setHighlightIndex(-1);
  }, [value, open]);

  useEffect(() => {
    if (highlightIndex >= 0 && listRef.current) {
      const items = listRef.current.querySelectorAll("[data-combo-item]");
      items[highlightIndex]?.scrollIntoView({ block: "nearest" });
    }
  }, [highlightIndex]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!open || filtered.length === 0) {
        if (e.key === "ArrowDown" || e.key === "ArrowUp") {
          setOpen(true);
          e.preventDefault();
        }
        return;
      }

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setHighlightIndex((prev) => (prev < filtered.length - 1 ? prev + 1 : 0));
          break;
        case "ArrowUp":
          e.preventDefault();
          setHighlightIndex((prev) => (prev > 0 ? prev - 1 : filtered.length - 1));
          break;
        case "Enter":
          e.preventDefault();
          if (highlightIndex >= 0 && highlightIndex < filtered.length) {
            onChange(filtered[highlightIndex]);
            setOpen(false);
          }
          break;
        case "Escape":
          setOpen(false);
          break;
      }
    },
    [open, filtered, highlightIndex, onChange]
  );

  const selectItem = useCallback((item: string) => {
    onChange(item);
    setOpen(false);
  }, [onChange]);

  return (
    <div ref={wrapperRef} className="relative">
      <Input
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => {
          openList();
        }}
        onClick={openList}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className={className}
        autoComplete="off"
      />
      {open && (
        <div
          ref={listRef}
          className="absolute z-50 mt-1 max-h-48 w-full overflow-auto rounded-xl border border-white/10 bg-[#132135] text-slate-100 shadow-2xl shadow-black/30"
        >
          {filtered.length > 0 ? (
            <>
              {filtered.map((item, i) => (
                <button
                  key={item}
                  type="button"
                  data-combo-item
                  className={cn(
                    "w-full touch-manipulation px-3 py-2.5 text-left text-sm hover:bg-white/8 hover:text-white",
                    item === value && "font-medium",
                    i === highlightIndex && "bg-cyan-400/10 text-white"
                  )}
                  onClick={() => selectItem(item)}
                >
                  {item}
                </button>
              ))}
              {hasMoreMatches && (
                <div className="border-t border-white/8 px-3 py-2 text-xs text-slate-400">
                  Showing first {MAX_VISIBLE_RESULTS} matches — keep typing to narrow the list.
                </div>
              )}
            </>
          ) : (
            <div className="px-3 py-2 text-sm text-slate-400">No matching results found.</div>
          )}
        </div>
      )}
    </div>
  );
}
