import React, { useEffect, useState } from "react";
import {
  View,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TextInput,
  BackHandler,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button, Field, Icon, Note, T } from "../components/ui";
import { MovingArt } from "../components/MovingArt";
import { useAuth, type AuthMode, type Challenge } from "../state/AuthContext";

export function AuthScreen() {
  const insets = useSafeAreaInsets();
  const { requestCode, verifyCode, storageWarning } = useAuth();
  const [mode, setMode] = useState<AuthMode>("login");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!challenge) return;
    const listener = BackHandler.addEventListener("hardwareBackPress", () => {
      if (!busy) {
        setChallenge(null);
        setError("");
        setCode("");
      }
      return true;
    });
    return () => listener.remove();
  }, [challenge, busy]);
  useEffect(() => {
    if (!challenge) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [challenge]);
  const sendCode = () => {
    setError("");
    try {
      setChallenge(requestCode(mode, email, name));
      setCode("");
      setNow(Date.now());
    } catch (e) {
      setError((e as Error).message);
    }
  };
  const verify = async () => {
    setError("");
    setBusy(true);
    try {
      await verifyCode(code);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const cooldown = Math.max(
    0,
    Math.ceil(((challenge?.resendAt ?? 0) - now) / 1000),
  );
  const expires = Math.max(
    0,
    Math.ceil(((challenge?.expiresAt ?? 0) - now) / 1000),
  );
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      className="flex-1 bg-canvas"
      style={{ paddingTop: insets.top }}
    >
      <ScrollView
        key={challenge ? "code" : mode}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          flexGrow: 1,
          paddingBottom: Math.max(insets.bottom, 20),
        }}
      >
        <View className="flex-row items-center justify-between px-6 py-4">
          <View className="flex-row items-center gap-2">
            <View className="h-9 w-9 items-center justify-center rounded-xl bg-brand">
              <Icon name="package" color="white" size={19} />
            </View>
            <T weight="heavy" className="text-lg">
              local
              <T weight="heavy" className="text-lg text-brand">
                movers.
              </T>
            </T>
          </View>
          <View className="rounded-full bg-lilac px-3 py-2">
            <T weight="bold" className="text-[10px] text-brand">
              LET’S GET MOVING
            </T>
          </View>
        </View>
        {!challenge ? (
          <>
            <View className="mx-5 overflow-hidden rounded-[28px] bg-brand px-6 pt-5">
              <View className="flex-row items-center gap-2">
                <View className="h-2 w-2 rounded-full bg-[#D2F29E]" />
                <T
                  weight="bold"
                  className="text-[10px] tracking-widest text-[#E3D5F8]"
                >
                  NEW HOME. FRESH START.
                </T>
              </View>
              <T
                weight="heavy"
                className="mt-3 text-[30px] leading-9 text-white"
              >
                Big moves.{"\n"}
                <T weight="heavy" className="text-[30px] text-[#D2F29E]">
                  Little worries.
                </T>
              </T>
              <MovingArt compact />
            </View>
            <View className="gap-5 px-6 pt-6">
              <View className="flex-row rounded-2xl bg-[#EFEAF5] p-1">
                {(["login", "register"] as const).map((item) => (
                  <Pressable
                    key={item}
                    accessibilityRole="button"
                    accessibilityLabel={
                      item === "login" ? "Log in" : "Register"
                    }
                    accessibilityState={{ selected: mode === item }}
                    onPress={() => {
                      setMode(item);
                      setError("");
                    }}
                    className={`min-h-11 flex-1 items-center justify-center rounded-xl ${mode === item ? "bg-white" : ""}`}
                  >
                    <T
                      weight="bold"
                      className={`text-sm ${mode === item ? "text-brand" : "text-muted"}`}
                    >
                      {item === "login" ? "Log in" : "Register"}
                    </T>
                  </Pressable>
                ))}
              </View>
              <View>
                <T weight="heavy" className="text-2xl">
                  {mode === "login"
                    ? "Welcome home."
                    : "Your next chapter starts here."}
                </T>
                <T className="mt-2 text-sm leading-5 text-muted">
                  {mode === "login"
                    ? "Your moving plans are right where you left them."
                    : "A little about you. Then let’s make your move."}
                </T>
              </View>
              {storageWarning && (
                <Note error>
                  Saved profiles could not be loaded. You can try again or
                  create a fresh local profile.
                </Note>
              )}
              {mode === "register" && (
                <Field
                  label="Your name"
                  placeholder="What should we call you?"
                  value={name}
                  onChangeText={setName}
                  autoComplete="name"
                  maxLength={60}
                />
              )}
              <Field
                label="Email address"
                placeholder="you@example.com"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoComplete="email"
                autoCapitalize="none"
                autoCorrect={false}
                maxLength={254}
                onSubmitEditing={sendCode}
              />
              {Boolean(error) && <Note error>{error}</Note>}
              <Button title="Continue with email" onPress={sendCode} />
              <View className="flex-row items-center justify-center gap-2">
                <Icon name="mail" size={14} color="#766D84" />
                <T className="text-xs text-muted">
                  Just email and a code. No password to remember.
                </T>
              </View>
            </View>
          </>
        ) : (
          <View className="flex-1 gap-6 px-6 pt-4">
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Change email"
              onPress={() => {
                setChallenge(null);
                setError("");
                setCode("");
              }}
              className="h-11 w-11 items-center justify-center rounded-full border border-line bg-white"
            >
              <Icon name="arrow-left" />
            </Pressable>
            <View className="items-center rounded-[28px] bg-lilac py-8">
              <View className="h-24 w-24 items-center justify-center rounded-[28px] bg-brand">
                <Icon name="mail" size={44} color="white" />
              </View>
              <View className="mt-4 flex-row items-center gap-2 rounded-full bg-white px-4 py-2">
                <Icon name="key" size={13} color="#6125C5" />
                <T weight="bold" className="text-[10px] text-brand">
                  ONE CODE. YOU’RE HOME.
                </T>
              </View>
            </View>
            <View>
              <T weight="heavy" className="text-[28px]">
                Enter your email code
              </T>
              <T className="mt-3 text-sm leading-6 text-muted">
                Continue with the email address
              </T>
              <T weight="bold" className="text-sm text-brand">
                {challenge.email}
              </T>
            </View>
            <View className="gap-3">
              <T weight="bold" className="text-xs text-muted">
                6-digit code
              </T>
              <TextInput
                accessibilityLabel="6-digit code"
                value={code}
                onChangeText={(value) => {
                  setCode(value.replace(/\D/g, "").slice(0, 6));
                  setError("");
                }}
                keyboardType="number-pad"
                autoComplete="one-time-code"
                textContentType="oneTimeCode"
                maxLength={6}
                placeholder="000000"
                placeholderTextColor="#C3B4D9"
                selectionColor="#6125C5"
                style={{
                  fontFamily: "Manrope_800ExtraBold",
                  letterSpacing: 12,
                }}
                className="h-20 rounded-2xl border border-brand bg-white px-4 text-center text-3xl text-brand"
                onSubmitEditing={() => {
                  if (code.length === 6) void verify();
                }}
              />
              <T className="text-xs text-muted">
                {expires
                  ? `Code expires in ${Math.floor(expires / 60)}:${String(expires % 60).padStart(2, "0")}`
                  : "Code expired. Request a new one below."}
              </T>
            </View>
            <Note>UI preview: enter 123456. No email is sent.</Note>
            {Boolean(error) && <Note error>{error}</Note>}
            <Button
              title={
                busy
                  ? "Saving…"
                  : mode === "register"
                    ? "Verify & create account"
                    : "Verify & log in"
              }
              onPress={() => void verify()}
              disabled={busy || code.length !== 6 || expires === 0}
            />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Resend code"
              accessibilityState={{ disabled: cooldown > 0 || busy }}
              disabled={cooldown > 0 || busy}
              onPress={sendCode}
              className="min-h-11 items-center justify-center"
            >
              <T
                weight="bold"
                className={
                  cooldown ? "text-sm text-muted" : "text-sm text-brand"
                }
              >
                {cooldown
                  ? `Request another code in ${cooldown}s`
                  : "Resend code"}
              </T>
            </Pressable>
          </View>
        )}
        <T className="mt-7 px-6 text-center text-[11px] leading-5 text-muted">
          Local UI preview · Your profile stays on this device.
        </T>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
