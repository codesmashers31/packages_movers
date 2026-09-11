"use client";

import { useEffect } from "react";

export default function ClientErrorHandler() {
  useEffect(() => {
    const handleRejection = (event: PromiseRejectionEvent) => {
      if (
        event.reason instanceof Event ||
        (event.reason && typeof event.reason === "object" && event.reason.toString() === "[object Event]") ||
        (event.reason && typeof event.reason === "object" && "isTrusted" in event.reason)
      ) {
        event.preventDefault();
      }
    };

    window.addEventListener("unhandledrejection", handleRejection);
    return () => {
      window.removeEventListener("unhandledrejection", handleRejection);
    };
  }, []);

  return null;
}
