import React, { useState } from "react";
import { View, Pressable } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../types";
import { Page, T, Button, Chip, Icon, Note, Row } from "../components/ui";
import { quotes, total, money, validateDraft } from "../data/moving";
import { useMove } from "../state/MoveContext";

export function QuotesScreen({
  navigation,
}: NativeStackScreenProps<RootStackParamList, "Quotes">) {
  const { draft, bookDemo } = useMove();
  const [selectedId, setSelectedId] = useState(quotes[0].id);
  const [sort, setSort] = useState("Suggested");
  const [expanded, setExpanded] = useState(quotes[0].id);
  const [error, setError] = useState<string | null>(null);
  const selected = quotes.find((quote) => quote.id === selectedId)!;
  const sorted = [...quotes].sort((a, b) =>
    sort === "Lowest price" ? total(a) - total(b) : 0,
  );
  return (
    <Page
      title="Find your moving crew"
      subtitle="Compare example quotes"
      footer={
        <View className="gap-3">
          {error && <Note error>{error}</Note>}
          <View className="flex-row items-center justify-between">
            <View>
              <T className="text-xs text-muted">Selected example total</T>
              <T weight="heavy" className="text-2xl">
                {money(total(selected))}
              </T>
            </View>
            <T className="text-xs text-muted">No payment required</T>
          </View>
          <Button
            title="Save demo booking"
            onPress={() => {
              const issue = validateDraft(draft);
              setError(issue);
              if (!issue) {
                bookDemo(selected);
                navigation.replace("Booking");
              }
            }}
          />
        </View>
      }
    >
      <Note>
        Design preview: these fictional vendors and prices are not live offers
        or estimates for your move. No vendor will be contacted.
      </Note>
      <View className="rounded-2xl border border-line bg-white p-4">
        <View className="mb-2 flex-row items-center gap-2">
          <Icon name="home" color="#6125C5" size={16} />
          <T weight="bold" className="text-sm">
            {draft.homeSize} · {draft.preferredDate}
          </T>
        </View>
        <T className="text-xs leading-5 text-muted">
          Requested: {draft.services.join(", ")}
        </T>
      </View>
      <View className="flex-row gap-2">
        {["Suggested", "Lowest price"].map((title) => (
          <Chip
            key={title}
            title={title}
            active={title === sort}
            onPress={() => setSort(title)}
          />
        ))}
      </View>
      {sorted.map((quote) => (
        <View
          key={quote.id}
          className={`overflow-hidden rounded-[24px] border-2 bg-white ${quote.id === selectedId ? "border-brand" : "border-line"}`}
        >
          <Pressable
            accessibilityRole="radio"
            accessibilityState={{ checked: selectedId === quote.id }}
            accessibilityLabel={`Select ${quote.name}, ${money(total(quote))}`}
            onPress={() => setSelectedId(quote.id)}
            className="p-4"
          >
            <View className="flex-row items-center gap-3">
              <View
                className="h-12 w-12 items-center justify-center rounded-2xl"
                style={{ backgroundColor: quote.color }}
              >
                <T weight="heavy" className="text-lg text-white">
                  {quote.initials}
                </T>
              </View>
              <View className="flex-1">
                <T weight="heavy" className="text-base">
                  {quote.name}
                </T>
                <T className="mt-1 text-[10px] text-muted">
                  FICTIONAL VENDOR · DEMO
                </T>
              </View>
              <Icon
                name={selectedId === quote.id ? "check-circle" : "circle"}
                color={selectedId === quote.id ? "#6125C5" : "#BFB5CA"}
              />
            </View>
            <View className="my-4 self-start rounded-lg bg-mint px-2.5 py-1.5">
              <T weight="bold" className="text-[10px] text-[#267251]">
                {quote.tag}
              </T>
            </View>
            <View className="flex-row items-end justify-between">
              <View>
                <T className="text-[10px] text-muted">Example total</T>
                <T weight="heavy" className="mt-1 text-[26px]">
                  {money(total(quote))}
                </T>
              </View>
              <T className="text-[10px] text-muted">Scope differs by vendor</T>
            </View>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ expanded: expanded === quote.id }}
            onPress={() => setExpanded(expanded === quote.id ? "" : quote.id)}
            className="min-h-12 flex-row items-center justify-between border-t border-line bg-canvas px-4"
          >
            <T weight="bold" className="text-xs text-brand">
              What’s included & excluded
            </T>
            <Icon
              name={expanded === quote.id ? "chevron-up" : "chevron-down"}
              color="#6125C5"
              size={16}
            />
          </Pressable>
          {expanded === quote.id && (
            <View className="gap-3 p-4">
              {quote.lines.map((line) => (
                <Row
                  key={line.label}
                  label={line.label}
                  value={money(line.amount)}
                />
              ))}
              <T className="text-xs leading-5 text-muted">{quote.exclusions}</T>
              <T className="text-xs leading-5 text-muted">
                Example assumption: local move with easy vehicle access. A live
                quote must confirm your inventory, floors, date, taxes and
                expiry before acceptance.
              </T>
            </View>
          )}
        </View>
      ))}
    </Page>
  );
}
