import React, { useEffect, useState } from "react";
import { View, Pressable, ScrollView, Switch } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../types";
import {
  Page,
  T,
  Field,
  Button,
  Chip,
  Icon,
  Note,
  Row,
} from "../components/ui";
import { useMove } from "../state/MoveContext";
import {
  itemOptions,
  localDate,
  serviceOptions,
  upcomingDays,
  validateStep,
  validateDraft,
} from "../data/moving";

const steps = ["Locations", "Your home", "Your items", "Services", "Review"];
export function CustomerScreen({
  navigation,
  route,
}: NativeStackScreenProps<RootStackParamList, "Customer">) {
  const { draft, updateDraft, storageError } = useMove();
  const [step, setStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    const selection = route.params?.service;
    if (selection)
      updateDraft({
        services:
          selection === "full"
            ? ["Packing", "Loading", "Transport", "Unloading"]
            : selection === "transport"
              ? ["Loading", "Transport", "Unloading"]
              : selection === "packing"
                ? ["Packing"]
                : ["Loading", "Unloading"],
      });
  }, [route.params?.service]);
  const next = () => {
    const issue = step === 4 ? validateDraft(draft) : validateStep(step, draft);
    setError(issue);
    if (issue) return;
    if (step < 4) setStep(step + 1);
    else navigation.navigate("Quotes");
  };
  return (
    <Page
      title="Plan your move"
      contentKey={step}
      subtitle={
        storageError
          ? "Draft is not saved on this device"
          : "Your draft saves on this device"
      }
      footer={
        <View className="gap-3">
          {error && <Note error>{error}</Note>}
          <View className="flex-row items-center gap-3">
            {step > 0 && (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Previous step"
                onPress={() => {
                  setStep(step - 1);
                  setError(null);
                }}
                className="h-14 w-14 items-center justify-center rounded-2xl border border-line"
              >
                <Icon name="arrow-left" />
              </Pressable>
            )}
            <View className="flex-1">
              <Button
                title={step === 4 ? "Preview matching quotes" : "Continue"}
                onPress={next}
              />
            </View>
          </View>
        </View>
      }
    >
      <View className="flex-row gap-2">
        {steps.map((label, i) => (
          <View key={label} className="flex-1 gap-2">
            <View
              className={`h-1 rounded-full ${i <= step ? "bg-brand" : "bg-line"}`}
            />
            <T
              className={`text-[9px] ${i === step ? "text-brand" : "text-muted"}`}
            >
              {label}
            </T>
          </View>
        ))}
      </View>
      <View key={step} className="gap-5">
        <View>
          <T weight="bold" className="text-[10px] tracking-[2px] text-brand">
            STEP {step + 1} OF 5
          </T>
          <T weight="heavy" className="mt-2 text-[28px] leading-9">
            {
              [
                "A new address.\nA new beginning.",
                "Make room for\nyour moving day.",
                "Every little thing\ncomes with you.",
                "A helping hand,\nwhere you need it.",
                "Looking good.\nOne last check.",
              ][step]
            }
          </T>
          <T className="mt-2 text-sm leading-6 text-muted">
            {
              [
                "Let’s start with where you’re moving from and to.",
                "A few details help movers plan the right team.",
                "Approximate counts are fine for your first request.",
                "Choose the services you want movers to quote.",
                "Check your details before exploring the demo quotes.",
              ][step]
            }
          </T>
        </View>
        {step === 0 && (
          <>
            <View className="gap-5 rounded-2xl border border-line bg-white p-4">
              <View className="flex-row items-center gap-2">
                <View className="h-2.5 w-2.5 rounded-full bg-brand" />
                <T weight="bold" className="text-xs">
                  PICKUP
                </T>
              </View>
              <Field
                label="Moving from"
                placeholder="House, street, locality, city"
                multiline
                value={draft.pickupAddress}
                onChangeText={(pickupAddress) =>
                  updateDraft({ pickupAddress, acknowledged: false })
                }
              />
              <View className="h-px bg-line" />
              <View className="flex-row items-center gap-2">
                <View className="h-2.5 w-2.5 rounded-full bg-coral" />
                <T weight="bold" className="text-xs">
                  DROP-OFF
                </T>
              </View>
              <Field
                label="Moving to"
                placeholder="House, street, locality, city"
                multiline
                value={draft.destinationAddress}
                onChangeText={(destinationAddress) =>
                  updateDraft({ destinationAddress, acknowledged: false })
                }
              />
            </View>
            <Note>
              Preview only. Your addresses stay on this device; no request is
              sent to a vendor.
            </Note>
          </>
        )}
        {step === 1 && (
          <>
            <T weight="bold">Your home size</T>
            <View className="flex-row flex-wrap gap-2">
              {["Studio", "1 BHK", "2 BHK", "3 BHK", "4+ BHK"].map((title) => (
                <Chip
                  key={title}
                  title={title}
                  active={draft.homeSize === title}
                  onPress={() => updateDraft({ homeSize: title })}
                />
              ))}
            </View>
            <T weight="bold">When’s the big day?</T>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 8 }}
            >
              {upcomingDays().map((date) => {
                const value = localDate(date);
                return (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={value}
                    accessibilityState={{
                      selected: draft.preferredDate === value,
                    }}
                    key={value}
                    onPress={() => updateDraft({ preferredDate: value })}
                    className={`w-16 items-center gap-2 rounded-2xl border py-4 ${value === draft.preferredDate ? "border-brand bg-lilac" : "border-line bg-white"}`}
                  >
                    <T className="text-[10px] text-muted">
                      {date.toLocaleDateString("en", { weekday: "short" })}
                    </T>
                    <T weight="heavy" className="text-xl">
                      {date.getDate()}
                    </T>
                    <T className="text-[10px] text-muted">
                      {date.toLocaleDateString("en", { month: "short" })}
                    </T>
                  </Pressable>
                );
              })}
            </ScrollView>
            <Field
              label="Or choose another date (YYYY-MM-DD)"
              placeholder="YYYY-MM-DD"
              value={draft.preferredDate}
              onChangeText={(preferredDate) => updateDraft({ preferredDate })}
              maxLength={10}
            />
            <View className="gap-2">
              {["Morning · 8 am – 12 pm", "Afternoon · 12 pm – 5 pm"].map(
                (title) => (
                  <Chip
                    key={title}
                    title={title}
                    active={draft.timeWindow === title}
                    onPress={() => updateDraft({ timeWindow: title })}
                  />
                ),
              )}
            </View>
            <View className="flex-row gap-3">
              <View className="flex-1">
                <Field
                  label="Pickup floor (0 = ground)"
                  value={draft.pickupFloor}
                  keyboardType="number-pad"
                  onChangeText={(pickupFloor) => updateDraft({ pickupFloor })}
                  maxLength={2}
                />
              </View>
              <View className="flex-1">
                <Field
                  label="Drop-off floor"
                  value={draft.destinationFloor}
                  keyboardType="number-pad"
                  onChangeText={(destinationFloor) =>
                    updateDraft({ destinationFloor })
                  }
                  maxLength={2}
                />
              </View>
            </View>
            <View className="rounded-2xl border border-line bg-white px-4">
              <View className="min-h-14 flex-row items-center justify-between">
                <T className="text-sm">Lift at pickup</T>
                <Switch
                  accessibilityLabel="Lift at pickup"
                  value={draft.pickupLift}
                  onValueChange={(pickupLift) => updateDraft({ pickupLift })}
                  trackColor={{ true: "#6125C5" }}
                />
              </View>
              <View className="min-h-14 flex-row items-center justify-between">
                <T className="text-sm">Lift at drop-off</T>
                <Switch
                  accessibilityLabel="Lift at drop-off"
                  value={draft.destinationLift}
                  onValueChange={(destinationLift) =>
                    updateDraft({ destinationLift })
                  }
                  trackColor={{ true: "#6125C5" }}
                />
              </View>
            </View>
          </>
        )}
        {step === 2 && (
          <>
            <View className="overflow-hidden rounded-2xl border border-line bg-white">
              {itemOptions.map((item, i) => (
                <View
                  key={item}
                  className={`flex-row items-center justify-between p-3 ${i ? "border-t border-line" : ""}`}
                >
                  <View className="flex-row items-center gap-3">
                    <View className="h-10 w-10 items-center justify-center rounded-xl bg-lilac">
                      <Icon
                        name={item === "Boxes" ? "package" : "box"}
                        color="#6125C5"
                        size={18}
                      />
                    </View>
                    <T weight="bold" className="text-sm">
                      {item}
                    </T>
                  </View>
                  <View className="flex-row items-center">
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Remove one ${item}`}
                      disabled={!(draft.inventory[item] || 0)}
                      onPress={() =>
                        updateDraft({
                          inventory: {
                            ...draft.inventory,
                            [item]: Math.max(
                              0,
                              (draft.inventory[item] || 0) - 1,
                            ),
                          },
                        })
                      }
                      className="h-11 w-11 items-center justify-center"
                    >
                      <Icon name="minus" size={16} />
                    </Pressable>
                    <T weight="bold" className="min-w-6 text-center">
                      {draft.inventory[item] || 0}
                    </T>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Add one ${item}`}
                      disabled={(draft.inventory[item] || 0) >= 99}
                      onPress={() =>
                        updateDraft({
                          inventory: {
                            ...draft.inventory,
                            [item]: Math.min(
                              99,
                              (draft.inventory[item] || 0) + 1,
                            ),
                          },
                        })
                      }
                      className="h-11 w-11 items-center justify-center"
                    >
                      <Icon name="plus" size={16} color="#6125C5" />
                    </Pressable>
                  </View>
                </View>
              ))}
            </View>
            <Field
              label="Anything else we should know?"
              placeholder="Fragile items, bulky furniture, parking access…"
              multiline
              numberOfLines={4}
              value={draft.notes}
              onChangeText={(notes) => updateDraft({ notes })}
            />
            <Note>
              Photos and custom inventory will be added with the secure upload
              flow. Include special handling details in your notes for now.
            </Note>
          </>
        )}
        {step === 3 && (
          <View className="gap-3">
            {serviceOptions.map((service, i) => {
              const selected = draft.services.includes(service);
              return (
                <Pressable
                  key={service}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: selected }}
                  onPress={() =>
                    updateDraft({
                      services: selected
                        ? draft.services.filter((s) => s !== service)
                        : [...draft.services, service],
                    })
                  }
                  className={`min-h-20 flex-row items-center gap-4 rounded-2xl border p-4 ${selected ? "border-brand bg-lilac" : "border-line bg-white"}`}
                >
                  <Icon
                    name={
                      (
                        [
                          "package",
                          "box",
                          "truck",
                          "download",
                          "archive",
                          "tool",
                        ] as const
                      )[i]
                    }
                    color="#6125C5"
                  />
                  <View className="flex-1">
                    <T weight="bold" className="text-sm">
                      {service}
                    </T>
                    <T className="mt-1 text-xs text-muted">
                      {
                        [
                          "Wrap and protect your belongings",
                          "Get your things safely on board",
                          "A vehicle for your local move",
                          "Bring everything into your new home",
                          "Unbox and help you settle in",
                          "Basic disassembly and reassembly",
                        ][i]
                      }
                    </T>
                  </View>
                  <Icon
                    name={selected ? "check-square" : "square"}
                    color={selected ? "#6125C5" : "#A19AAA"}
                  />
                </Pressable>
              );
            })}
          </View>
        )}
        {step === 4 && (
          <>
            <View className="rounded-2xl border border-line bg-white p-4">
              <T weight="bold" className="mb-2 text-brand">
                Your moving plan
              </T>
              <Row label="From" value={draft.pickupAddress} />
              <Row label="To" value={draft.destinationAddress} />
              <Row label="Moving date" value={draft.preferredDate} />
              <Row label="Time" value={draft.timeWindow} />
              <Row label="Home" value={draft.homeSize} />
              <Row
                label="Access"
                value={`Pickup: floor ${draft.pickupFloor}${draft.pickupLift ? ", lift" : ", no lift"}\nDrop: floor ${draft.destinationFloor}${draft.destinationLift ? ", lift" : ", no lift"}`}
              />
              <Row
                label="Items"
                value={Object.entries(draft.inventory)
                  .filter(([, count]) => count > 0)
                  .map(([name, count]) => `${count} ${name.toLowerCase()}`)
                  .join(", ")}
              />
              <Row label="Services" value={draft.services.join(", ")} />
              {!!draft.notes && <Row label="Notes" value={draft.notes} />}
            </View>
            <Pressable
              accessibilityRole="checkbox"
              accessibilityState={{ checked: draft.acknowledged }}
              onPress={() => updateDraft({ acknowledged: !draft.acknowledged })}
              className="min-h-14 flex-row items-start gap-3 py-2"
            >
              <Icon
                name={draft.acknowledged ? "check-square" : "square"}
                color="#6125C5"
              />
              <T className="flex-1 text-sm leading-6">
                These details are correct for this preview. I understand the
                next screen contains example quotes, not live offers.
              </T>
            </Pressable>
          </>
        )}
      </View>
    </Page>
  );
}
