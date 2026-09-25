import React, { useState } from "react";
import { View, Pressable } from "react-native";
import { Page, T, Button, Icon, Note } from "../components/ui";

const stages = [
  "Assignment accepted",
  "En route to pickup",
  "Arrived at pickup",
  "Packing",
  "Loading",
  "In transit",
  "Arrived at drop-off",
  "Unloading",
  "Awaiting customer confirmation",
];
export function WorkerScreen() {
  const [sample, setSample] = useState(false);
  const [stage, setStage] = useState(-1);
  const [issue, setIssue] = useState(false);
  return (
    <Page
      title="Your workday"
      subtitle="Worker experience · Demo"
      footer={
        sample ? (
          <Button
            title={
              stage < 0
                ? "Accept sample assignment"
                : stage < stages.length - 1
                  ? `Mark: ${stages[stage + 1]}`
                  : "Waiting for customer confirmation"
            }
            disabled={stage === stages.length - 1}
            onPress={() =>
              setStage((previous) => Math.min(previous + 1, stages.length - 1))
            }
          />
        ) : undefined
      }
    >
      <Note>
        Worker preview only. This does not grant worker permissions or send job
        updates to the server.
      </Note>
      {!sample ? (
        <>
          <View className="items-center rounded-[24px] bg-lilac px-5 py-10">
            <Icon name="briefcase" size={40} color="#6125C5" />
            <T weight="heavy" className="mt-5 text-2xl">
              Ready for a good day.
            </T>
            <T className="mt-3 text-center text-sm leading-6 text-muted">
              No real assignments are connected. Open a sample to explore the
              moving-day flow.
            </T>
          </View>
          <Button
            title="Explore sample assignment"
            onPress={() => setSample(true)}
          />
        </>
      ) : (
        <>
          <View className="gap-4 rounded-[24px] bg-brand p-5">
            <T
              weight="bold"
              className="text-[10px] tracking-[2px] text-[#D8C3F5]"
            >
              SAMPLE ASSIGNMENT
            </T>
            <T weight="heavy" className="text-2xl text-white">
              1 BHK home move
            </T>
            <T className="text-sm text-[#E2D3F8]">
              Example pickup → Example destination
            </T>
            <View className="rounded-xl bg-[#7B47CD] p-3">
              <T weight="bold" className="text-sm text-white">
                {stage < 0 ? "Awaiting your response" : stages[stage]}
              </T>
            </View>
          </View>
          <View className="rounded-2xl border border-line bg-white p-5">
            <T weight="heavy" className="mb-5 text-lg">
              One step at a time
            </T>
            {stages.map((label, i) => (
              <View
                key={label}
                className="min-h-12 flex-row items-center gap-3"
              >
                <View
                  className={`h-7 w-7 items-center justify-center rounded-full ${i <= stage ? "bg-mint" : "bg-line"}`}
                >
                  <Icon
                    name={i <= stage ? "check" : "circle"}
                    size={14}
                    color={i <= stage ? "#27745B" : "#A89EAF"}
                  />
                </View>
                <T
                  weight={i === stage ? "bold" : "medium"}
                  className={`flex-1 text-xs ${i > stage ? "text-muted" : "text-ink"}`}
                >
                  {label}
                </T>
              </View>
            ))}
          </View>
          {stage === stages.length - 1 && (
            <Note>
              Only customer confirmation can complete a real move. Photo proof
              and server validation are required in the connected workflow.
            </Note>
          )}
          <Pressable
            accessibilityRole="button"
            onPress={() => setIssue((previous) => !previous)}
            className="min-h-14 flex-row items-center justify-center gap-2 rounded-xl border border-line bg-white"
          >
            <Icon name="alert-circle" color="#AB5540" />
            <T weight="bold" className="text-sm">
              Need to report an issue?
            </T>
          </Pressable>
          {issue && (
            <Note>
              Issue reporting is not connected yet. The production flow will
              capture the issue, evidence and booking reference, then alert the
              vendor and support team.
            </Note>
          )}
          <T className="text-center text-xs text-muted">
            Preview progress resets when you leave this screen.
          </T>
        </>
      )}
    </Page>
  );
}
