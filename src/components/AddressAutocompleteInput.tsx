import { useEffect, useRef } from "react";
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

  useEffect(() => {
    if (!apiKey || !inputRef.current) return;

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

        listener = autocomplete.addListener("place_changed", () => {
          const place = autocomplete.getPlace?.();
          const nextValue = place?.formatted_address || place?.name || inputRef.current?.value || "";
          onChange(nextValue);
        });
      })
      .catch(() => {
        // Fallback to normal text input if Google Places is unavailable.
      });

    return () => {
      cancelled = true;
      if (listener && (window as any).google?.maps?.event) {
        (window as any).google.maps.event.removeListener(listener);
      }
    };
  }, [apiKey, onChange]);

  return (
    <Input
      ref={inputRef}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      className={className}
      autoComplete="street-address"
    />
  );
}
