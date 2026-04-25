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
  primaryText: string;
  secondaryText: string;
  description: string;
};

let googleMapsPromise: Promise<void> | null = null;

function loadGoogleMapsPlaces(apiKey: string) {
  if (typeof window === "undefined") {
    return Promise.resolve();
  }

  if ((window as any).google?.maps?.places) {
    return Promise.resolve();
  }

  if (googleMapsPromise) {
    return googleMapsPromise;
  }

  googleMapsPromise = new Promise<void>((resolve, reject) => {
    const existingScript = document.querySelector<HTMLScriptElement>(
      'script[data-google-maps-places="true"]',
    );

    if (existingScript) {
      existingScript.addEventListener("load", () => resolve(), { once: true });
      existingScript.addEventListener("error", () => reject(new Error("Failed to load Google Maps")), {
        once: true,
      });
      return;
    }

    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&loading=async`;
    script.async = true;
    script.defer = true;
    script.dataset.googleMapsPlaces = "true";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Google Maps"));
    document.head.appendChild(script);
  });

  return googleMapsPromise;
}

function normalizePrediction(prediction: any): Suggestion {
  return {
    placeId: prediction.place_id,
    description: prediction.description,
    primaryText:
      prediction.structured_formatting?.main_text ||
      prediction.description ||
      "",
    secondaryText:
      prediction.structured_formatting?.secondary_text ||
      "",
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

  const trimmedValue = inputValue.trim();
  const canQuery = useMemo(() => trimmedValue.length >= 3 && status === "ready", [trimmedValue, status]);

  useEffect(() => {
    setInputValue(value);
  }, [value]);

  useEffect(() => {
    if (!apiKey) {
      console.warn("Google address autocomplete is disabled: missing VITE_GOOGLE_MAPS_API_KEY.");
      setStatus("missing-key");
      return;
    }

    let cancelled = false;

    loadGoogleMapsPlaces(apiKey)
      .then(() => {
        if (cancelled) return;
        if (!(window as any).google?.maps?.places?.AutocompleteService) {
          setStatus("error");
          return;
        }
        setStatus("ready");
      })
      .catch((error) => {
        console.warn(
          "Google address autocomplete could not load. Check that Maps JavaScript API and Places are enabled for the key.",
          error,
        );
        if (!cancelled) setStatus("error");
      });

    return () => {
      cancelled = true;
    };
  }, [apiKey]);

  useEffect(() => {
    if (!canQuery) {
      setSuggestions([]);
      setHighlightedIndex(-1);
      return;
    }

    let cancelled = false;
    const service = new (window as any).google.maps.places.AutocompleteService();
    const timeout = window.setTimeout(() => {
      service.getPlacePredictions(
        {
          input: trimmedValue,
          types: ["address"],
        },
        (predictions: any[] | null, predictionStatus: any) => {
          if (cancelled) return;

          const statusOk =
            predictionStatus === (window as any).google.maps.places.PlacesServiceStatus.OK;
          if (!statusOk || !predictions?.length) {
            setSuggestions([]);
            setHighlightedIndex(-1);
            return;
          }

          setSuggestions(predictions.slice(0, 6).map(normalizePrediction));
          setHighlightedIndex(0);
          setIsOpen(true);
        },
      );
    }, 180);

    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
    };
  }, [canQuery, trimmedValue]);

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
          Google autofill could not load. Check your API key restrictions and that Maps JavaScript API plus Places are enabled.
        </p>
      )}
    </div>
  );
}
