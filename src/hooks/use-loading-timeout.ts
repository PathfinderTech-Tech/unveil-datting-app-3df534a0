import { useEffect, useState } from "react";

export function useLoadingTimeout(isLoading: boolean, ms = 8000): boolean {
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    if (!isLoading) {
      setTimedOut(false);
      return;
    }

    const id = window.setTimeout(() => setTimedOut(true), ms);
    return () => window.clearTimeout(id);
  }, [isLoading, ms]);

  return timedOut;
}
