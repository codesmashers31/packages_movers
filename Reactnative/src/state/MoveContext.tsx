import React, { createContext, useContext, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { initialDraft } from "../data/moving";
import type { DemoBooking, MoveRequestDraft, Quote } from "../types";

type Store = {
  draft: MoveRequestDraft;
  updateDraft: (patch: Partial<MoveRequestDraft>) => void;
  booking: DemoBooking | null;
  bookDemo: (quote: Quote) => void;
  locality: string;
  setLocality: (value: string) => void;
  storageError: boolean;
};
const Context = createContext<Store | null>(null);
const KEY = "local-movers-design-v1";
export function MoveProvider({ children }: { children: React.ReactNode }) {
  const [draft, setDraft] = useState(initialDraft);
  const [booking, setBooking] = useState<DemoBooking | null>(null);
  const [locality, setLocality] = useState("Chennai");
  const [ready, setReady] = useState(false);
  const [storageError, setStorageError] = useState(false);
  useEffect(() => {
    AsyncStorage.getItem(KEY)
      .then((raw) => {
        if (!raw) return;
        const saved = JSON.parse(raw);
        // Only restore this version of the design preview's storage schema.
        if (saved.version !== 1) return;
        if (
          saved.draft &&
          typeof saved.draft.pickupAddress === "string" &&
          Array.isArray(saved.draft.services) &&
          typeof saved.draft.inventory === "object"
        )
          setDraft({ ...initialDraft, ...saved.draft });
        if (saved.booking?.quote?.lines && saved.booking?.draft?.services)
          setBooking(saved.booking);
        if (typeof saved.locality === "string") setLocality(saved.locality);
      })
      .catch(() => setStorageError(true))
      .finally(() => setReady(true));
  }, []);
  useEffect(() => {
    if (!ready) return;
    const timer = setTimeout(() => {
      AsyncStorage.setItem(
        KEY,
        JSON.stringify({ version: 1, draft, booking, locality }),
      )
        .then(() => setStorageError(false))
        .catch(() => setStorageError(true));
    }, 250);
    return () => clearTimeout(timer);
  }, [draft, booking, locality, ready]);
  const bookDemo = (quote: Quote) =>
    setBooking({
      id: `DEMO-${Date.now().toString().slice(-6)}`,
      quote,
      draft: JSON.parse(JSON.stringify(draft)),
      createdAt: new Date().toISOString(),
    });
  if (!ready) return null;
  return (
    <Context.Provider
      value={{
        draft,
        updateDraft: (patch) =>
          setDraft((previous) => ({ ...previous, ...patch })),
        booking,
        bookDemo,
        locality,
        setLocality,
        storageError,
      }}
    >
      {children}
    </Context.Provider>
  );
}
export function useMove() {
  const context = useContext(Context);
  if (!context) throw new Error("MoveProvider is required");
  return context;
}
