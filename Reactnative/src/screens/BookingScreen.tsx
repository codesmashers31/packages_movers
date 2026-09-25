import React from "react";
import { View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../types";
import { Page, T, Button, Icon, Note, Row } from "../components/ui";
import { money, total } from "../data/moving";
import { useMove } from "../state/MoveContext";

export function BookingScreen({
  navigation,
}: NativeStackScreenProps<RootStackParamList, "Booking">) {
  const { booking } = useMove();
  if (!booking)
    return (
      <Page title="Your move">
        <T>No demo booking saved yet.</T>
        <Button
          title="Plan a move"
          onPress={() => navigation.replace("Customer")}
        />
      </Page>
    );
  return (
    <Page
      title="Your moving plan"
      subtitle={booking.id}
      footer={
        <Button
          title="Back to My Moves"
          onPress={() => navigation.popTo("Main", { screen: "Moves" })}
        />
      }
    >
      <View className="items-center rounded-[24px] bg-lilac p-6">
        <View className="mb-4 h-16 w-16 items-center justify-center rounded-full bg-brand">
          <Icon name="check" color="white" size={30} />
        </View>
        <T weight="heavy" className="text-2xl">
          All set for a fresh start.
        </T>
        <T className="mt-2 text-center text-sm leading-6 text-muted">
          Your demo plan is saved on this device.
        </T>
      </View>
      <Note>
        This is not a confirmed service booking. No payment was collected and no
        team is assigned.
      </Note>
      <View className="rounded-2xl border border-line bg-white p-4">
        <T weight="heavy" className="mb-2 text-lg">
          The moving details
        </T>
        <Row label="Moving day" value={booking.draft.preferredDate} />
        <Row label="Time window" value={booking.draft.timeWindow} />
        <Row label="From" value={booking.draft.pickupAddress} />
        <Row label="To" value={booking.draft.destinationAddress} />
        <Row label="Example vendor" value={booking.quote.name} />
        <Row label="Example total" value={money(total(booking.quote))} />
        <Row
          label="Included scope"
          value={booking.quote.lines.map((line) => line.label).join(", ")}
        />
        <T className="mt-3 text-xs leading-5 text-muted">
          {booking.quote.exclusions}
        </T>
      </View>
      <View className="rounded-2xl border border-line bg-white p-5">
        <T weight="heavy" className="mb-5 text-lg">
          What happens next
        </T>
        {[
          "Request & quote agreed",
          "Booking and payment confirmed",
          "Team and vehicle assigned",
          "Packing, loading & moving",
          "Delivery confirmed by you",
        ].map((label, i) => (
          <View key={label} className="flex-row gap-3">
            <View className="items-center">
              <View className="h-7 w-7 items-center justify-center rounded-full bg-line">
                <T className="text-[10px] text-muted">{i + 1}</T>
              </View>
              {i < 4 && <View className="h-7 w-px bg-line" />}
            </View>
            <View className="flex-1 pt-1">
              <T className="text-xs">{label}</T>
            </View>
          </View>
        ))}
        <T className="mt-4 text-xs leading-5 text-muted">
          Illustrative timeline. Live milestone updates will appear after the
          service is connected.
        </T>
      </View>
      <Button
        title="Moving guide & help"
        secondary
        icon="help-circle"
        onPress={() => navigation.navigate("Help")}
      />
    </Page>
  );
}
