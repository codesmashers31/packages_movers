import type { MoveRequestDraft, Quote } from "../types";

export const services = [
  {
    id: "full",
    title: "Full home",
    subtitle: "Every room, sorted",
    icon: "home",
    color: "#F0E8FF",
  },
  {
    id: "transport",
    title: "Mini move",
    subtitle: "Just a few things",
    icon: "truck",
    color: "#FFF0E3",
  },
  {
    id: "packing",
    title: "Packing",
    subtitle: "A little extra care",
    icon: "package",
    color: "#E5F4EC",
  },
  {
    id: "loading",
    title: "Loading",
    subtitle: "Leave the lifting",
    icon: "box",
    color: "#FCE8ED",
  },
] as const;
export const serviceOptions = [
  "Packing",
  "Loading",
  "Transport",
  "Unloading",
  "Unpacking",
  "Furniture assembly",
];
export const itemOptions = [
  "Boxes",
  "Beds",
  "Sofas",
  "Wardrobes",
  "Tables",
  "Appliances",
];
export function localDate(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
export function upcomingDays() {
  return Array.from({ length: 7 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() + i + 1);
    return date;
  });
}
export const initialDraft: MoveRequestDraft = {
  pickupAddress: "",
  destinationAddress: "",
  preferredDate: "",
  timeWindow: "Morning · 8 am – 12 pm",
  homeSize: "1 BHK",
  pickupFloor: "0",
  destinationFloor: "0",
  pickupLift: false,
  destinationLift: false,
  inventory: { Boxes: 5, Beds: 1, Sofas: 1 },
  services: ["Packing", "Loading", "Transport", "Unloading"],
  notes: "",
  acknowledged: false,
};
export function validateStep(
  step: number,
  draft: MoveRequestDraft,
): string | null {
  if (step === 0) {
    if (
      draft.pickupAddress.trim().length < 8 ||
      draft.destinationAddress.trim().length < 8
    )
      return "Add a complete pickup and drop address (at least 8 characters each).";
    if (
      draft.pickupAddress.trim().toLowerCase() ===
      draft.destinationAddress.trim().toLowerCase()
    )
      return "Pickup and drop addresses should be different.";
  }
  if (step === 1) {
    const parsed = new Date(`${draft.preferredDate}T12:00:00`);
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(draft.preferredDate) ||
      Number.isNaN(parsed.getTime()) ||
      localDate(parsed) !== draft.preferredDate ||
      draft.preferredDate <= localDate(new Date())
    )
      return "Choose a valid moving date after today (YYYY-MM-DD).";
    if (
      ![draft.pickupFloor, draft.destinationFloor].every((floor) =>
        /^\d{1,2}$/.test(floor),
      )
    )
      return "Enter a floor from 0 to 99 at both addresses.";
  }
  if (
    step === 2 &&
    Object.values(draft.inventory).reduce((a, b) => a + b, 0) === 0
  )
    return "Add at least one item to your move.";
  if (step === 3 && draft.services.length === 0)
    return "Choose at least one service.";
  if (step === 4 && !draft.acknowledged)
    return "Confirm your move details to continue.";
  return null;
}
export function validateDraft(draft: MoveRequestDraft) {
  for (let step = 0; step < 5; step++) {
    const error = validateStep(step, draft);
    if (error) return error;
  }
  return null;
}
export const quotes: Quote[] = [
  {
    id: "q1",
    name: "Careful Hands",
    initials: "ch",
    color: "#6125C5",
    tag: "Full-service example",
    lines: [
      { label: "Packing materials & packing", amount: 1800 },
      { label: "Loading & unloading", amount: 2200 },
      { label: "Local transport", amount: 2500 },
    ],
    exclusions:
      "Unpacking, assembly, taxes and special handling are not included in this sample.",
  },
  {
    id: "q2",
    name: "Neighbourhood Movers",
    initials: "nm",
    color: "#D76A3E",
    tag: "Transport-first example",
    lines: [
      { label: "Loading & unloading", amount: 2000 },
      { label: "Local transport", amount: 2800 },
    ],
    exclusions:
      "Packing, unpacking, assembly, taxes and special handling are not included in this sample.",
  },
  {
    id: "q3",
    name: "The Moving Co.",
    initials: "mc",
    color: "#27745B",
    tag: "Extra-care example",
    lines: [
      { label: "Packing materials & packing", amount: 2300 },
      { label: "Loading & unloading", amount: 2400 },
      { label: "Local transport", amount: 2500 },
      { label: "Unpacking", amount: 800 },
    ],
    exclusions:
      "Assembly, taxes and special handling are not included in this sample.",
  },
];
export const total = (quote: Quote) =>
  quote.lines.reduce((sum, line) => sum + line.amount, 0);
export const money = (amount: number) => `₹${amount.toLocaleString("en-IN")}`;
