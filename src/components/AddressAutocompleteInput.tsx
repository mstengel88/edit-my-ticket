import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";

interface AddressAutocompleteInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

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
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
    script.async = true;
    script.defer = true;
    script.dataset.googleMapsPlaces = "true";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Google Maps"));
    document.head.appendChild(script);
  });

  return googleMapsPromise;
}

export function AddressAutocompleteInput({
  value,
  onChange,
  placeholder,
  className,
}: AddressAutocompleteInputProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  const [status, setStatus] = useState<"idle" | "ready" | "missing-key" | "error">("idle");
  const [inputValue, setInputValue] = useState(value);

  useEffect(() => {
    setInputValue(value);
  }, [value]);

  useEffect(() => {
    if (!apiKey) {
      console.warn("Google address autocomplete is disabled: missing VITE_GOOGLE_MAPS_API_KEY.");
      setStatus("missing-key");
      return;
    }

    if (!inputRef.current) return;

    let autocomplete: any;
    let cancelled = false;
    let listener: any;

    loadGoogleMapsPlaces(apiKey)
      .then(() => {
        if (cancelled || !inputRef.current || !(window as any).google?.maps?.places) return;

        autocomplete = new (window as any).google.maps.places.Autocomplete(inputRef.current, {
          fields: ["formatted_address", "name"],
          types: ["address"],
        });
        setStatus("ready");

        listener = autocomplete.addListener("place_changed", () => {
          const place = autocomplete.getPlace?.();
          const nextValue = place?.formatted_address || place?.name || inputRef.current?.value || "";
          setInputValue(nextValue);
          onChange(nextValue);
        });
      })
      .catch((error) => {
        console.warn(
          "Google address autocomplete could not load. Check that Maps JavaScript API and Places are enabled for the key.",
          error,
        );
        setStatus("error");
      });

    return () => {
      cancelled = true;
      if (listener && (window as any).google?.maps?.event) {
        (window as any).google.maps.event.removeListener(listener);
      }
    };
  }, [apiKey, onChange]);

  return (
    <div className="space-y-1.5">
      <Input
        ref={inputRef}
        value={inputValue}
        onChange={(event) => {
          const nextValue = event.target.value;
          setInputValue(nextValue);
          onChange(nextValue);
        }}
        placeholder={placeholder}
        className={className}
        autoComplete="off"
        spellCheck={false}
        autoCorrect="off"
        autoCapitalize="words"
      />
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
