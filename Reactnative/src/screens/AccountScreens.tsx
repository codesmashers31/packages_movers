import React, { useState } from "react";
import { View, Pressable } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "../types";
import { Page, T, Button, Icon, Note, type IconName } from "../components/ui";
import { useMove } from "../state/MoveContext";
import { useAuth } from "../state/AuthContext";

function useAppNavigation() {
  return useNavigation<NativeStackNavigationProp<RootStackParamList>>();
}
export function MovesScreen() {
  const navigation = useAppNavigation();
  const { booking, draft, storageError } = useMove();
  return (
    <Page
      title="My moves"
      subtitle="Every new beginning, in one place"
      back={false}
    >
      {storageError && (
        <Note error>
          Device storage is unavailable. Changes may be lost when you close the
          app.
        </Note>
      )}
      {booking ? (
        <Pressable
          accessibilityRole="button"
          onPress={() => navigation.navigate("Booking")}
          className="gap-4 rounded-[24px] border border-line bg-white p-5"
        >
          <View className="flex-row items-center justify-between">
            <View className="rounded-full bg-lilac px-3 py-2">
              <T weight="bold" className="text-[10px] text-brand">
                SAVED DEMO PLAN
              </T>
            </View>
            <Icon name="arrow-up-right" color="#6125C5" />
          </View>
          <T weight="heavy" className="text-xl">
            {booking.draft.homeSize} home move
          </T>
          <T className="text-sm text-muted">
            {booking.draft.preferredDate} · {booking.quote.name}
          </T>
          <View className="h-px bg-line" />
          <T className="text-xs leading-6 text-muted">
            {booking.draft.pickupAddress}
            {"\n"}↓{"\n"}
            {booking.draft.destinationAddress}
          </T>
        </Pressable>
      ) : (
        <View className="items-center rounded-[24px] bg-lilac px-6 py-10">
          <View className="mb-5 h-20 w-20 items-center justify-center rounded-full bg-white">
            <Icon name="truck" size={36} color="#6125C5" />
          </View>
          <T weight="heavy" className="text-2xl">
            Your next chapter awaits.
          </T>
          <T className="mt-3 text-center text-sm leading-6 text-muted">
            Plan your first move, compare what’s included, and keep everything
            together.
          </T>
        </View>
      )}
      <Button
        title={draft.pickupAddress ? "Continue your draft" : "Plan a move"}
        onPress={() => navigation.navigate("Customer")}
      />
      <Note>
        Demo plans are saved locally for this profile. Live booking history
        needs backend integration.
      </Note>
    </Page>
  );
}
export function UpdatesScreen() {
  const { booking } = useMove();
  const navigation = useAppNavigation();
  return (
    <Page
      title="Updates"
      subtitle="A little peace of mind, at every step"
      back={false}
    >
      {booking ? (
        <Pressable
          accessibilityRole="button"
          onPress={() => navigation.navigate("Booking")}
          className="flex-row gap-4 rounded-2xl border border-line bg-white p-5"
        >
          <View className="h-11 w-11 items-center justify-center rounded-full bg-mint">
            <Icon name="check" color="#27745B" />
          </View>
          <View className="flex-1">
            <T weight="bold">Demo plan saved</T>
            <T className="mt-2 text-sm leading-6 text-muted">
              Your {booking.draft.homeSize} moving plan is ready to revisit. No
              live booking has been created.
            </T>
            <T className="mt-3 text-xs text-muted">
              {new Date(booking.createdAt).toLocaleString()}
            </T>
          </View>
        </Pressable>
      ) : (
        <View className="items-center py-16">
          <View className="mb-6 h-20 w-20 items-center justify-center rounded-full bg-lilac">
            <Icon name="bell" color="#6125C5" size={32} />
          </View>
          <T weight="heavy" className="text-xl">
            You’re all caught up.
          </T>
          <T className="mt-3 text-center text-sm leading-6 text-muted">
            Quote and moving updates will have a home here.
          </T>
        </View>
      )}
    </Page>
  );
}
export function ProfileScreen() {
  const navigation = useAppNavigation();
  const { locality } = useMove();
  const { user, logout } = useAuth();
  const [error, setError] = useState("");
  const [leaving, setLeaving] = useState(false);
  const signOut = async () => {
    setLeaving(true);
    setError("");
    try {
      await logout();
    } catch (e) {
      setError((e as Error).message);
      setLeaving(false);
    }
  };
  return (
    <Page
      title="Your space"
      subtitle="Let’s make moving feel easy"
      back={false}
    >
      <View className="flex-row items-center gap-4 rounded-[24px] bg-brand p-5">
        <View className="h-16 w-16 items-center justify-center rounded-full bg-[#8450D4]">
          <Icon name="user" size={30} color="white" />
        </View>
        <View className="flex-1">
          <T weight="heavy" className="text-xl text-white">
            Hello, {user?.name}.
          </T>
          <T className="mt-2 text-xs text-[#E0CFF8]">
            {locality} · Local profile
          </T>
          <T className="mt-2 text-xs text-white">{user?.email}</T>
        </View>
      </View>
      <Note>
        Your email profile is saved on this device for the UI preview. Real
        vendor quotes, payments and support messages are not connected yet.
      </Note>
      <View className="overflow-hidden rounded-2xl border border-line bg-white">
        {(
          [
            {
              title: "My moving plans",
              detail: "Your saved demo booking",
              icon: "truck",
              action: () => navigation.navigate("Main", { screen: "Moves" }),
            },
            {
              title: "Moving guide & help",
              detail: "A calmer moving day starts here",
              icon: "help-circle",
              action: () => navigation.navigate("Help"),
            },
            {
              title: "Explore worker view",
              detail: "Preview the assignment experience",
              icon: "briefcase",
              action: () => navigation.navigate("Worker"),
            },
          ] satisfies {
            title: string;
            detail: string;
            icon: IconName;
            action: () => void;
          }[]
        ).map((item, i) => (
          <Pressable
            accessibilityRole="button"
            key={item.title}
            onPress={item.action}
            className={`flex-row items-center gap-3 p-4 ${i ? "border-t border-line" : ""}`}
          >
            <Icon name={item.icon} color="#6125C5" />
            <View className="flex-1">
              <T weight="bold" className="text-sm">
                {item.title}
              </T>
              <T className="mt-1 text-xs text-muted">{item.detail}</T>
            </View>
            <Icon name="chevron-right" size={16} />
          </Pressable>
        ))}
      </View>
      {Boolean(error) && <Note error>{error}</Note>}
      <Button
        title={leaving ? "Signing out…" : "Log out"}
        icon="log-out"
        secondary
        disabled={leaving}
        onPress={() => void signOut()}
      />
      <T className="text-center text-xs text-muted">
        Local Movers · Made for your next chapter.
      </T>
    </Page>
  );
}
const checklist = [
  "Sort the things you want to take",
  "Label boxes by room",
  "Set aside documents and valuables",
  "Check parking and lift access",
  "Keep an overnight essentials bag",
  "Check your items before confirming delivery",
];
export function HelpScreen() {
  const [checked, setChecked] = useState<string[]>([]);
  return (
    <Page
      title="A smoother moving day"
      subtitle="Your little guide to a big change"
    >
      <View className="rounded-[24px] bg-[#FFF2EA] p-5">
        <T weight="heavy" className="text-2xl">
          A little prep. A lot less stress.
        </T>
        <T className="mt-2 text-sm leading-6 text-muted">
          Tick these off as you get ready. This checklist resets when you leave
          the guide.
        </T>
        <T weight="bold" className="mt-4 text-sm text-[#AB5540]">
          {checked.length} of {checklist.length} ready
        </T>
      </View>
      <View className="rounded-2xl border border-line bg-white">
        {checklist.map((item, i) => (
          <Pressable
            accessibilityRole="checkbox"
            accessibilityState={{ checked: checked.includes(item) }}
            key={item}
            onPress={() =>
              setChecked((previous) =>
                previous.includes(item)
                  ? previous.filter((value) => value !== item)
                  : [...previous, item],
              )
            }
            className={`min-h-16 flex-row items-center gap-3 p-4 ${i ? "border-t border-line" : ""}`}
          >
            <Icon
              name={checked.includes(item) ? "check-square" : "square"}
              color="#6125C5"
            />
            <T className="flex-1 text-sm leading-6">{item}</T>
          </Pressable>
        ))}
      </View>
      <View className="gap-3 rounded-2xl border border-line bg-white p-5">
        <T weight="heavy" className="text-lg">
          Before you accept a quote
        </T>
        <T className="text-sm leading-6 text-muted">
          Compare the complete scope, exclusions, moving window and price. Tell
          your mover about fragile items, stairs and parking access. Any
          additional charge should be agreed before the work is done.
        </T>
      </View>
      <Note>
        Live support is not connected in this preview. In the finished app, help
        requests will be linked to your booking.
      </Note>
    </Page>
  );
}
