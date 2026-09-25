import test from "node:test";
import assert from "node:assert/strict";
import {
  initialDraft,
  localDate,
  upcomingDays,
  validateDraft,
  validateStep,
  quotes,
  total,
} from "../src/data/moving.ts";

const valid = () => ({
  ...structuredClone(initialDraft),
  pickupAddress: "12 First Street, Chennai",
  destinationAddress: "45 Second Street, Chennai",
  preferredDate: localDate(upcomingDays()[0]),
  acknowledged: true,
});
test("a complete future move can proceed to quotes", () =>
  assert.equal(validateDraft(valid()), null));
test("empty and identical addresses cannot proceed", () => {
  assert.ok(validateStep(0, initialDraft));
  const draft = valid();
  draft.destinationAddress = ` ${draft.pickupAddress.toUpperCase()} `;
  assert.ok(validateStep(0, draft));
});
test("today, past, malformed and impossible dates are rejected", () => {
  for (const preferredDate of [
    localDate(new Date()),
    "2020-01-01",
    "tomorrow",
    "2099-02-31",
  ])
    assert.ok(validateStep(1, { ...valid(), preferredDate }));
});
test("both access floors must be nonnegative integers", () => {
  for (const floor of ["", "-1", "1.5", "100", "a"]) {
    assert.ok(validateStep(1, { ...valid(), pickupFloor: floor }));
    assert.ok(validateStep(1, { ...valid(), destinationFloor: floor }));
  }
});
test("empty inventory, missing services and unconfirmed review are blocked", () => {
  assert.ok(validateDraft({ ...valid(), inventory: { Boxes: 0 } }));
  assert.ok(validateDraft({ ...valid(), services: [] }));
  assert.ok(validateDraft({ ...valid(), acknowledged: false }));
});
test("every displayed quote total matches its itemized service amounts", () => {
  assert.deepEqual(quotes.map(total), [6500, 4800, 8000]);
});
