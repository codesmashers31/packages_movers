import type { NavigatorScreenParams } from "@react-navigation/native";

export type RootStackParamList = {
  Main: NavigatorScreenParams<TabParamList> | undefined;
  Customer: { service?: string } | undefined;
  Quotes: undefined;
  Booking: undefined;
  Worker: undefined;
  Help: undefined;
};

export type TabParamList = {
  Home: undefined;
  Moves: undefined;
  Updates: undefined;
  Profile: undefined;
};

export interface MoveRequestDraft {
  pickupAddress: string;
  destinationAddress: string;
  preferredDate: string;
  timeWindow: string;
  homeSize: string;
  pickupFloor: string;
  destinationFloor: string;
  pickupLift: boolean;
  destinationLift: boolean;
  inventory: Record<string, number>;
  services: string[];
  notes: string;
  acknowledged: boolean;
}

export interface Quote {
  id: string;
  name: string;
  initials: string;
  color: string;
  tag: string;
  lines: { label: string; amount: number }[];
  exclusions: string;
}

export interface DemoBooking {
  id: string;
  quote: Quote;
  draft: MoveRequestDraft;
  createdAt: string;
}
