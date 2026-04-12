import * as React from "react";

const MOBILE_BREAKPOINT = 768;
const TABLET_BREAKPOINT = 768;
const DESKTOP_BREAKPOINT = 1280;

function getViewportState() {
  if (typeof window === "undefined") {
    return {
      width: 0,
      isPortrait: true,
    };
  }

  return {
    width: window.innerWidth,
    isPortrait: window.matchMedia("(orientation: portrait)").matches,
  };
}

function useViewportState() {
  const [viewport, setViewport] = React.useState(getViewportState);

  React.useEffect(() => {
    const updateViewport = () => {
      setViewport(getViewportState());
    };

    window.addEventListener("resize", updateViewport);
    window.addEventListener("orientationchange", updateViewport);
    window.visualViewport?.addEventListener("resize", updateViewport);
    updateViewport();

    return () => {
      window.removeEventListener("resize", updateViewport);
      window.removeEventListener("orientationchange", updateViewport);
      window.visualViewport?.removeEventListener("resize", updateViewport);
    };
  }, []);

  return viewport;
}

export function useIsMobile() {
  const { width } = useViewportState();
  return width < MOBILE_BREAKPOINT;
}

export function useIsTablet() {
  const { width } = useViewportState();
  return width >= TABLET_BREAKPOINT && width < DESKTOP_BREAKPOINT;
}

export function useIsPortrait() {
  const { isPortrait } = useViewportState();
  return isPortrait;
}
