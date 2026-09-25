import React, { useState } from "react";
import { View, Pressable, ScrollView, Modal, TextInput } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { RootStackParamList } from "../types";
import { Icon, T, Section, Button } from "../components/ui";
import { MovingArt } from "../components/MovingArt";
import { services } from "../data/moving";
import { useMove } from "../state/MoveContext";

export function HomeScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { locality, setLocality, booking, draft } = useMove();
  const insets = useSafeAreaInsets();
  const [locationOpen, setLocationOpen] = useState(false);
  const [locationText, setLocationText] = useState(locality);
  const [search, setSearch] = useState("");
  const filtered = services.filter((service) =>
    (service.title + service.subtitle)
      .toLowerCase()
      .includes(search.toLowerCase()),
  );
  return (
    <View className="flex-1 bg-white">
      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View
          className="bg-lilac px-5 pb-5"
          style={{ paddingTop: insets.top + 12 }}
        >
          <View className="mb-5 flex-row items-center justify-between">
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Choose your locality"
              onPress={() => setLocationOpen(true)}
              className="min-h-12 flex-1 justify-center"
            >
              <T
                weight="bold"
                className="mb-1 text-[10px] tracking-[2px] text-brand"
              >
                LET’S GET YOU MOVING
              </T>
              <View className="flex-row items-center gap-2">
                <Icon name="map-pin" color="#6125C5" size={18} />
                <T
                  weight="heavy"
                  className="max-w-[80%] text-lg"
                  numberOfLines={1}
                >
                  {locality}
                </T>
                <Icon name="chevron-down" size={16} />
              </View>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Open your profile"
              onPress={() => navigation.navigate("Main", { screen: "Profile" })}
              className="h-11 w-11 items-center justify-center rounded-full border-2 border-white bg-brand"
            >
              <Icon name="user" color="white" />
            </Pressable>
          </View>
          <View className="flex-row items-center gap-3 rounded-2xl border border-white bg-white px-4">
            <Icon name="search" color="#80748E" />
            <TextInput
              accessibilityLabel="Search moving services"
              value={search}
              onChangeText={setSearch}
              placeholder="Search home moving, packing..."
              placeholderTextColor="#8F859C"
              className="h-13 flex-1 text-sm text-ink"
              style={{ fontFamily: "Manrope_500Medium" }}
            />
            {!!search && (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Clear search"
                onPress={() => setSearch("")}
                className="h-11 w-8 items-center justify-center"
              >
                <Icon name="x" size={16} />
              </Pressable>
            )}
          </View>
        </View>
        <View className="px-5 pt-5">
          <View className="overflow-hidden rounded-[28px] bg-brand px-5 pt-5">
            <View className="flex-row items-center justify-between">
              <View className="rounded-full bg-[#7B47CD] px-3 py-1.5">
                <T
                  weight="bold"
                  className="text-[10px] tracking-[1.5px] text-white"
                >
                  NEW PLACE. FRESH START.
                </T>
              </View>
              <Icon name="star" color="#D5F5A5" />
            </View>
            <T
              weight="heavy"
              className="mt-4 text-[31px] leading-[38px] text-white"
            >
              Big move.{"\n"}Little effort.
            </T>
            <T className="mt-2 text-[13px] leading-5 text-[#E2D3F8]">
              From your first box to your next chapter.
            </T>
            <MovingArt />
            <Pressable
              accessibilityRole="button"
              onPress={() => navigation.navigate("Customer")}
              className="mb-5 flex-row items-center justify-between rounded-2xl bg-[#D2F29E] px-4 py-4"
            >
              <T weight="heavy" className="text-sm text-brand-dark">
                {draft.pickupAddress ? "Continue your move" : "Plan my move"}
              </T>
              <Icon name="arrow-up-right" color="#36116D" size={20} />
            </Pressable>
          </View>
          <View className="my-5 flex-row items-center justify-between">
            {(["Your choice", "Clear quotes", "Step-by-step"] as const).map(
              (label, i) => (
                <View key={label} className="flex-row items-center gap-1.5">
                  <Icon
                    name={(["check-circle", "file-text", "heart"] as const)[i]}
                    color="#6125C5"
                    size={14}
                  />
                  <T className="text-[10px] text-muted">{label}</T>
                </View>
              ),
            )}
          </View>
          <Section title="What’s moving?" label="A little or a lot" />
          <View className="flex-row flex-wrap justify-between gap-y-3">
            {filtered.map((service) => (
              <Pressable
                accessibilityRole="button"
                key={service.id}
                onPress={() =>
                  navigation.navigate("Customer", { service: service.id })
                }
                className="w-[48%] rounded-[22px] p-4"
                style={{ backgroundColor: service.color }}
              >
                <View className="mb-4 flex-row justify-between">
                  <View className="h-12 w-12 items-center justify-center rounded-2xl bg-white">
                    <Icon name={service.icon} size={25} color="#6125C5" />
                  </View>
                  <Icon name="arrow-up-right" size={16} color="#877A95" />
                </View>
                <T weight="heavy" className="text-[15px]">
                  {service.title}
                </T>
                <T className="mt-1 text-[10px] text-muted">
                  {service.subtitle}
                </T>
              </Pressable>
            ))}
            {!filtered.length && (
              <View className="w-full rounded-2xl bg-canvas p-5">
                <T weight="bold">No services found</T>
                <T className="mt-2 text-sm text-muted">
                  Try “packing”, “loading” or “home”.
                </T>
              </View>
            )}
          </View>
          {booking && (
            <Pressable
              accessibilityRole="button"
              onPress={() => navigation.navigate("Booking")}
              className="mt-6 flex-row items-center gap-3 rounded-2xl border border-line p-4"
            >
              <View className="h-11 w-11 items-center justify-center rounded-xl bg-lilac">
                <Icon name="truck" color="#6125C5" />
              </View>
              <View className="flex-1">
                <T weight="bold">Your demo move</T>
                <T className="mt-1 text-xs text-muted">
                  {booking.draft.preferredDate} · View details
                </T>
              </View>
              <Icon name="chevron-right" />
            </Pressable>
          )}
          <View className="mt-6 flex-row items-center gap-4 rounded-[22px] bg-[#FFF2EA] p-5">
            <View className="flex-1">
              <T
                weight="bold"
                className="text-[10px] tracking-[1.5px] text-[#AB5540]"
              >
                A LITTLE PREP GOES A LONG WAY
              </T>
              <T weight="heavy" className="mt-2 text-lg">
                Less stress. More sorted.
              </T>
              <Pressable
                accessibilityRole="button"
                onPress={() => navigation.navigate("Help")}
                className="mt-2 min-h-11 flex-row items-center gap-2"
              >
                <T weight="bold" className="text-xs text-[#AB5540]">
                  Your moving checklist
                </T>
                <Icon name="arrow-right" size={14} color="#AB5540" />
              </Pressable>
            </View>
            <View className="h-16 w-16 items-center justify-center rounded-2xl bg-[#FFDDC7]">
              <Icon name="clipboard" size={32} color="#AB5540" />
            </View>
          </View>
          <View className="mb-7 mt-7">
            <Section title="Your move, made simple" />
            <View className="flex-row gap-3">
              {[
                {
                  n: "01",
                  title: "Tell us",
                  text: "Your place, things & date",
                },
                {
                  n: "02",
                  title: "Compare",
                  text: "See what each quote includes",
                },
                {
                  n: "03",
                  title: "Settle in",
                  text: "Follow every moving milestone",
                },
              ].map((item) => (
                <View key={item.n} className="flex-1">
                  <T weight="heavy" className="text-2xl text-[#D8C7EF]">
                    {item.n}
                  </T>
                  <T weight="bold" className="mt-2 text-xs">
                    {item.title}
                  </T>
                  <T className="mt-1 text-[10px] leading-4 text-muted">
                    {item.text}
                  </T>
                </View>
              ))}
            </View>
          </View>
          <View className="border-t border-line py-6">
            <T weight="heavy" className="text-[27px] text-[#C3B8D0]">
              Good things{"\n"}are on the move.
            </T>
            <T className="mt-3 text-[10px] tracking-[2px] text-muted">
              LOCAL MOVERS · MOBILE DESIGN PREVIEW
            </T>
          </View>
        </View>
      </ScrollView>
      <Modal
        visible={locationOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setLocationOpen(false)}
      >
        <View className="flex-1 justify-end bg-black/40">
          <View
            className="gap-5 rounded-t-[28px] bg-white p-6"
            style={{ paddingBottom: insets.bottom + 24 }}
          >
            <View className="flex-row items-center justify-between">
              <T weight="heavy" className="text-xl">
                Where are you moving?
              </T>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Close locality picker"
                onPress={() => setLocationOpen(false)}
                className="h-11 w-11 items-center justify-center"
              >
                <Icon name="x" />
              </Pressable>
            </View>
            <T className="text-sm leading-6 text-muted">
              Choose a locality for this preview. Service coverage will be
              checked when the marketplace is connected.
            </T>
            <TextInput
              accessibilityLabel="City or locality"
              value={locationText}
              onChangeText={setLocationText}
              placeholder="City or locality"
              className="min-h-14 rounded-xl border border-line px-4 text-base"
            />
            <Button
              title="Use this locality"
              disabled={!locationText.trim()}
              onPress={() => {
                setLocality(locationText.trim());
                setLocationOpen(false);
              }}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}
