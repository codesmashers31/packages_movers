import React from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  type TextProps,
  type TextInputProps,
} from "react-native";
import Feather from "@expo/vector-icons/Feather";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { twMerge } from "tailwind-merge";

export type IconName = React.ComponentProps<typeof Feather>["name"];
export const Icon = ({
  name,
  size = 20,
  color = "#241A36",
}: {
  name: IconName;
  size?: number;
  color?: string;
}) => <Feather name={name} size={size} color={color} accessible={false} aria-hidden importantForAccessibility="no-hide-descendants" />;
export function T({
  children,
  className = "",
  weight = "medium",
  style,
  ...props
}: TextProps & {
  className?: string;
  weight?: "regular" | "medium" | "bold" | "heavy";
}) {
  const fonts = {
    regular: "Manrope_400Regular",
    medium: "Manrope_500Medium",
    bold: "Manrope_700Bold",
    heavy: "Manrope_800ExtraBold",
  };
  return (
    <Text
      {...props}
      className={twMerge("text-ink", className)}
      style={[{ fontFamily: fonts[weight] }, style]}
    >
      {children}
    </Text>
  );
}
export function Button({
  title,
  onPress,
  secondary = false,
  icon = "arrow-right",
  disabled = false,
}: {
  title: string;
  onPress: () => void;
  secondary?: boolean;
  icon?: IconName;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      className={`min-h-14 flex-row items-center justify-center gap-3 rounded-2xl px-5 py-4 ${secondary ? "border border-line bg-white" : "bg-brand"} ${disabled ? "opacity-40" : "active:opacity-80"}`}
    >
      <T
        weight="bold"
        className={`text-[15px] ${secondary ? "text-brand" : "text-white"}`}
      >
        {title}
      </T>
      <Icon name={icon} size={18} color={secondary ? "#6125C5" : "#FFFFFF"} />
    </Pressable>
  );
}
export function Header({
  title,
  subtitle,
  back = true,
}: {
  title: string;
  subtitle?: string;
  back?: boolean;
}) {
  const navigation = useNavigation();
  return (
    <View className="flex-row items-center gap-3 border-b border-line bg-white px-5 py-3">
      {back && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Go back"
          onPress={() => navigation.goBack()}
          className="h-11 w-11 items-center justify-center rounded-full border border-line"
        >
          <Icon name="arrow-left" />
        </Pressable>
      )}
      <View className="flex-1">
        <T weight="heavy" className="text-xl">
          {title}
        </T>
        {subtitle && <T className="mt-1 text-xs text-muted">{subtitle}</T>}
      </View>
    </View>
  );
}
export function Page({
  children,
  title,
  subtitle,
  footer,
  back = true,
  contentKey,
}: {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
  footer?: React.ReactNode;
  back?: boolean;
  contentKey?: string | number;
}) {
  const insets = useSafeAreaInsets();
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      className="flex-1 bg-canvas"
      style={{ paddingTop: insets.top }}
    >
      <Header title={title} subtitle={subtitle} back={back} />
      <ScrollView
        key={contentKey}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 20, paddingBottom: 28, gap: 20 }}
      >
        {children}
      </ScrollView>
      {footer && (
        <View
          className="border-t border-line bg-white px-5 pt-3"
          style={{ paddingBottom: Math.max(insets.bottom, 16) }}
        >
          {footer}
        </View>
      )}
    </KeyboardAvoidingView>
  );
}
export function Section({ title, label }: { title: string; label?: string }) {
  return (
    <View className="mb-4 flex-row items-center justify-between">
      <T weight="heavy" className="text-xl">
        {title}
      </T>
      {label && <T className="text-xs text-muted">{label}</T>}
    </View>
  );
}
export function Field({ label, ...props }: TextInputProps & { label: string }) {
  return (
    <View className="gap-2">
      <T weight="bold" className="text-xs text-muted">
        {label}
      </T>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor="#A19AAA"
        {...props}
        className="min-h-14 rounded-2xl border border-line bg-white px-4 py-3 text-base text-ink"
        style={[{ fontFamily: "Manrope_500Medium" }, props.style]}
      />
    </View>
  );
}
export function Chip({
  title,
  active,
  onPress,
}: {
  title: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      className={`min-h-11 items-center justify-center rounded-xl border px-4 py-3 ${active ? "border-brand bg-lilac" : "border-line bg-white"}`}
    >
      <T
        weight={active ? "bold" : "medium"}
        className={`text-xs ${active ? "text-brand" : "text-muted"}`}
      >
        {title}
      </T>
    </Pressable>
  );
}
export function Note({
  children,
  error = false,
}: {
  children: React.ReactNode;
  error?: boolean;
}) {
  return (
    <View
      accessibilityRole={error ? "alert" : undefined}
      className={`flex-row items-start gap-2 rounded-xl p-3 ${error ? "bg-red-50" : "bg-lilac"}`}
    >
      <Icon
        name={error ? "alert-circle" : "info"}
        size={16}
        color={error ? "#B42318" : "#6125C5"}
      />
      <T
        className={`flex-1 text-xs leading-5 ${error ? "text-red-800" : "text-brand"}`}
      >
        {children}
      </T>
    </View>
  );
}
export function Row({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row justify-between gap-4 py-2">
      <T className="flex-1 text-sm text-muted">{label}</T>
      <T weight="bold" className="max-w-[65%] text-right text-sm">
        {value}
      </T>
    </View>
  );
}
