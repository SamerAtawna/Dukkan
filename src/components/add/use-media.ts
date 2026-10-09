"use client";

import { useEffect, useState } from "react";

/** True when the viewport matches the query. Starts false on the server and before mount. */
export function useMedia(query: string) {
  const [matches, setMatches] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const update = () => setMatches(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, [query]);
  return matches;
}

export const DESKTOP = "(min-width: 768px)";
