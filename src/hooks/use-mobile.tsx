import * as React from "react";

const MOBILE_BREAKPOINT = 1024;
const TABLET_BREAKPOINT = 768;

function useMediaQuery(query: string, getValue: () => boolean) {
  const [matches, setMatches] = React.useState<boolean | undefined>(undefined);

  React.useEffect(() => {
    const mql = window.matchMedia(query);
    const onChange = () => {
      setMatches(getValue());
    };

    mql.addEventListener("change", onChange);
    setMatches(getValue());

    return () => mql.removeEventListener("change", onChange);
  }, [getValue, query]);

  return !!matches;
}

export function useIsMobile() {
  return useMediaQuery(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`, () => window.innerWidth < MOBILE_BREAKPOINT);
}

export function useIsTablet() {
  return useMediaQuery(
    `(min-width: ${TABLET_BREAKPOINT}px) and (max-width: ${MOBILE_BREAKPOINT - 1}px)`,
    () => window.innerWidth >= TABLET_BREAKPOINT && window.innerWidth < MOBILE_BREAKPOINT,
  );
}
