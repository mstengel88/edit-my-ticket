import { useEffect, useMemo, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { MapPin } from "lucide-react";

interface AddressAutocompleteInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

type Suggestion = {
  placeId: string;
  description: string;
  primaryText: string;
  secondaryText: string;
};

function splitAddress(description: string) {
  const [primaryText, ...rest] = description.split(",").map((part) => part.trim());
  return {
    primaryText: primaryText || description,
    secondaryText: rest.join(", "),
  };
}

export function AddressAutocompleteInput({
  value,
  onChange,
  placeholder,
  className,
}: AddressAutocompleteInputProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

  const [status, setStatus] = useState<"idle" | "ready" | "missing-key" | "error">("idle");
  const [inputValue, setInputValue] = useState(value);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [debugMessage, setDebugMessage] = useState("Waiting for Google Places...");

  const trimmedValue = inputValue.trim();
  const canQuery = useMemo(() => trimmedValue.length >= 3 && status === "ready", [trimmedValue, status]);

  useEffect(() => {
    setInputValue(value);
  }, [value]);

  useEffect(() => {
    if (!apiKey) {
      setStatus("missing-key");
      setDebugMessage("Missing Google API key.");
      return;
    }

    setStatus("ready");
    setDebugMessage("Google autocomplete ready (REST API). Type at least 3 characters.");
  }, [apiKey]);

  useEffect(() => {
    if (!canQuery) {
      setSuggestions([]);
      setHighlightedIndex(-1);
      if (status === "ready") {
        setDebugMessage(
          trimmedValue.length === 0
            ? "Google autocomplete ready (REST API). Type at least 3 characters."
            : "Keep typing to get address suggestions.",
        );
      }
      return;
    }

    const controller = new AbortController();
    const timeout = window.setTimeout(() => {
      const run = async () => {
        try {
          const response = await fetch("https://places.googleapis.com/v1/places:autocomplete", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-Goog-Api-Key": apiKey,
              "X-Goog-FieldMask": "suggestions.placePrediction.placeId,suggestions.placePrediction.text.text",
            },
            body: JSON.stringify({
              input: trimmedValue,
              includedPrimaryTypes: ["street_address"],
              regionCode: "us",
            }),
            signal: controller.signal,
          });

          if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`HTTP ${response.status}: ${errorText}`);
          }

          const payload = await response.json();
          const predictions = (payload?.suggestions ?? [])
            .map((item: any) => item.placePrediction)
            .filter(Boolean)
            .map((prediction: any) => {
              const description = prediction.text?.text ?? "";
              const split = splitAddress(description);
              return {
                placeId: prediction.placeId ?? description,
                description,
                primaryText: split.primaryText,
                secondaryText: split.secondaryText,
              } satisfies Suggestion;
            })
            .filter((prediction: Suggestion) => prediction.description);

          if (!predictions.length) {
            setSuggestions([]);
            setHighlightedIndex(-1);
            setDebugMessage(`No suggestions returned for "${trimmedValue}".`);
            return;
          }

          setSuggestions(predictions.slice(0, 6));
          setHighlightedIndex(0);
          setIsOpen(true);
          setDebugMessage(
            `Loaded ${Math.min(predictions.length, 6)} suggestion${predictions.length === 1 ? "" : "s"} for "${trimmedValue}" using the REST API.`,
          );
        } catch (error) {
          if (controller.signal.aborted) return;
          console.warn("Address suggestion request failed.", error);
          setSuggestions([]);
          setHighlightedIndex(-1);
          const detail =
            error instanceof Error
              ? error.message
              : "Unknown error from Google autocomplete.";
          setDebugMessage(`REST autocomplete request failed: ${detail}`);
          setStatus("error");
        }
      };

      void run();
    }, 180);

    return () => {
      controller.abort();
      window.clearTimeout(timeout);
    };
  }, [apiKey, canQuery, status, trimmedValue]);

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, []);

  const commitValue = (nextValue: string) => {
    setInputValue(nextValue);
    onChange(nextValue);
    setIsOpen(false);
    setDebugMessage(`Selected address: ${nextValue}`);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen || !suggestions.length) {
      if (event.key === "Enter") {
        onChange(inputValue);
      }
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setHighlightedIndex((current) => (current < suggestions.length - 1 ? current + 1 : 0));
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setHighlightedIndex((current) => (current > 0 ? current - 1 : suggestions.length - 1));
      return;
    }

    if (event.key === "Enter") {
      event.preventDefault();
      const suggestion = suggestions[highlightedIndex] ?? suggestions[0];
      if (suggestion) {
        commitValue(suggestion.description);
      } else {
        onChange(inputValue);
      }
      return;
    }

    if (event.key === "Escape") {
      setIsOpen(false);
    }
  };

  return (
    <div ref={rootRef} className="space-y-1.5">
      <div className="relative">
        <Input
          value={inputValue}
          onChange={(event) => {
            setInputValue(event.target.value);
            setIsOpen(true);
            if (status === "error" && apiKey) {
              setStatus("ready");
            }
          }}
          onFocus={() => {
            if (suggestions.length) setIsOpen(true);
          }}
          onBlur={() => {
            window.setTimeout(() => {
              onChange(inputValue);
            }, 120);
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className={className}
          autoComplete="off"
          spellCheck={false}
          autoCorrect="off"
          autoCapitalize="words"
        />

        {isOpen && suggestions.length > 0 && (
          <div className="absolute z-[100000] mt-2 w-full overflow-hidden rounded-2xl border border-white/10 bg-[#132135] shadow-2xl shadow-black/40">
            {suggestions.map((suggestion, index) => (
              <button
                key={suggestion.placeId}
                type="button"
                className={`flex w-full items-start gap-3 border-t border-white/5 px-4 py-3 text-left first:border-t-0 ${
                  index === highlightedIndex ? "bg-cyan-400/10" : "bg-transparent hover:bg-cyan-400/8"
                }`}
                onMouseDown={(event) => {
                  event.preventDefault();
                  commitValue(suggestion.description);
                }}
              >
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-cyan-300" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-white">{suggestion.primaryText}</p>
                  {suggestion.secondaryText && (
                    <p className="truncate text-xs text-slate-400">{suggestion.secondaryText}</p>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {status === "missing-key" && (
        <p className="text-xs text-amber-300/90">
          Google autofill is off. Add <code>VITE_GOOGLE_MAPS_API_KEY</code> and rebuild the app.
        </p>
      )}
      {status === "error" && (
        <p className="text-xs text-amber-300/90">
          Google autofill could not load. Check that <code>Places API (New)</code> is enabled and allowed for this key.
        </p>
      )}
      <p className="text-[11px] text-slate-500">{debugMessage}</p>
    </div>
  );
}
