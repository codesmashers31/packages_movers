import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ActivityIndicator, View } from "react-native";

export type LocalProfile = { email: string; name: string };
export type AuthMode = "login" | "register";
type SavedAuth = {
  version: 1;
  profiles: LocalProfile[];
  activeEmail: string | null;
};
export type Challenge = LocalProfile & {
  mode: AuthMode;
  expiresAt: number;
  resendAt: number;
};
type AuthStore = {
  user: LocalProfile | null;
  requestCode: (mode: AuthMode, email: string, name: string) => Challenge;
  verifyCode: (code: string) => Promise<void>;
  logout: () => Promise<void>;
  storageWarning: boolean;
};
const KEY = "local-movers-auth-preview-v1";
const Context = createContext<AuthStore | null>(null);
const empty: SavedAuth = { version: 1, profiles: [], activeEmail: null };

// A device-local UI prototype only: this code does not verify email ownership.
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [saved, setSaved] = useState<SavedAuth>(empty);
  const [ready, setReady] = useState(false);
  const [storageWarning, setStorageWarning] = useState(false);
  const pending = useRef<(Challenge & { attempts: number }) | null>(null);
  const busy = useRef(false);
  useEffect(() => {
    AsyncStorage.getItem(KEY)
      .then((raw) => {
        if (!raw) return;
        const value = JSON.parse(raw);
        if (
          value.version !== 1 ||
          !Array.isArray(value.profiles) ||
          !value.profiles.every(
            (p: LocalProfile) =>
              typeof p?.email === "string" && typeof p?.name === "string",
          ) ||
          !(value.activeEmail === null || typeof value.activeEmail === "string")
        )
          throw new Error("Invalid local profile");
        setSaved(value);
      })
      .catch(() => setStorageWarning(true))
      .finally(() => setReady(true));
  }, []);
  const persist = async (next: SavedAuth) => {
    try {
      await AsyncStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      throw new Error(
        "Could not save on this device. Free some storage and try again.",
      );
    }
    setSaved(next);
    setStorageWarning(false);
  };
  const requestCode = (
    mode: AuthMode,
    rawEmail: string,
    rawName: string,
  ): Challenge => {
    const email = rawEmail.trim().toLowerCase();
    const name = rawName.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254)
      throw new Error("Enter a valid email address.");
    const existing = saved.profiles.find((p) => p.email === email);
    if (mode === "register" && (name.length < 2 || name.length > 60))
      throw new Error("Enter your name (2–60 characters).");
    if (mode === "register" && existing)
      throw new Error(
        "This email is already registered on this device. Log in instead.",
      );
    if (mode === "login" && !existing)
      throw new Error("No local account found. Create an account first.");
    if (
      pending.current?.email === email &&
      Date.now() < pending.current.resendAt
    )
      throw new Error("Please wait before requesting another code.");
    const challenge = {
      email,
      name: existing?.name ?? name,
      mode,
      expiresAt: Date.now() + 300_000,
      resendAt: Date.now() + 30_000,
    };
    pending.current = { ...challenge, attempts: 0 };
    return challenge;
  };
  const verifyCode = async (code: string) => {
    if (busy.current) return;
    const challenge = pending.current;
    if (!challenge || Date.now() >= challenge.expiresAt)
      throw new Error("This code has expired. Request a new code.");
    if (challenge.attempts >= 5)
      throw new Error("Too many attempts. Request a new code.");
    challenge.attempts += 1;
    if (code !== "123456")
      throw new Error("That code does not match. Use the preview code 123456.");
    busy.current = true;
    try {
      const profile = { email: challenge.email, name: challenge.name };
      await persist({
        version: 1,
        profiles:
          challenge.mode === "register"
            ? [...saved.profiles, profile]
            : saved.profiles,
        activeEmail: profile.email,
      });
      pending.current = null;
    } finally {
      busy.current = false;
    }
  };
  const logout = async () => {
    await persist({ ...saved, activeEmail: null });
    pending.current = null;
  };
  if (!ready)
    return (
      <View className="flex-1 items-center justify-center bg-canvas">
        <ActivityIndicator color="#6125C5" />
      </View>
    );
  return (
    <Context.Provider
      value={{
        user: saved.profiles.find((p) => p.email === saved.activeEmail) ?? null,
        requestCode,
        verifyCode,
        logout,
        storageWarning,
      }}
    >
      {children}
    </Context.Provider>
  );
}
export function useAuth() {
  const context = useContext(Context);
  if (!context) throw new Error("AuthProvider is required");
  return context;
}
