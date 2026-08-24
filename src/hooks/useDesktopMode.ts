import { useState, useEffect } from "react";

const STORAGE_KEY = "sf_force_desktop";

export function useDesktopMode() {
  const [isDesktopMode, setIsDesktopMode] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem(STORAGE_KEY) === "true";
    }
    return false;
  });

  useEffect(() => {
    // Apply or remove the class on the html element
    if (isDesktopMode) {
      document.documentElement.classList.add("force-desktop");
    } else {
      document.documentElement.classList.remove("force-desktop");
    }
  }, [isDesktopMode]);

  const toggleDesktopMode = () => {
    const newValue = !isDesktopMode;
    setIsDesktopMode(newValue);
    localStorage.setItem(STORAGE_KEY, String(newValue));
  };

  const enableDesktopMode = () => {
    setIsDesktopMode(true);
    localStorage.setItem(STORAGE_KEY, "true");
  };

  const disableDesktopMode = () => {
    setIsDesktopMode(false);
    localStorage.setItem(STORAGE_KEY, "false");
  };

  return { isDesktopMode, toggleDesktopMode, enableDesktopMode, disableDesktopMode };
}
