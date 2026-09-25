import React from "react";
import Svg, { Path, Rect, Circle, Ellipse, G } from "react-native-svg";

// Local vector artwork: crisp at every phone density and available offline.
export function MovingArt({ compact = false }: { compact?: boolean }) {
  return (
    <Svg
      width="100%"
      height={compact ? 100 : 168}
      viewBox="0 0 330 200"
      accessibilityLabel="A moving van with packed boxes and a house"
    >
      <Circle cx="233" cy="84" r="75" fill="#7E48D4" />
      <Circle cx="291" cy="35" r="5" fill="#C4F17C" />
      <Path d="M37 146V66l47-32 47 32v80" fill="#9164DC" />
      <Path
        d="M29 68l55-40 55 40"
        fill="none"
        stroke="#C2A4F0"
        strokeWidth="5"
        strokeLinecap="round"
      />
      <Rect x="62" y="67" width="20" height="24" rx="3" fill="#DBC6FA" />
      <Rect x="88" y="67" width="20" height="24" rx="3" fill="#DBC6FA" />
      <Rect x="67" y="108" width="31" height="42" rx="4" fill="#563093" />
      <Ellipse cx="173" cy="171" rx="139" ry="9" fill="#3C136F" opacity=".35" />
      <Rect x="87" y="79" width="142" height="78" rx="10" fill="#FBF6FF" />
      <Path d="M229 104h32l27 31v22h-59z" fill="#D2EF9A" />
      <Path d="M239 112h18l18 22h-36z" fill="#57398B" />
      <Rect x="89" y="143" width="201" height="17" rx="5" fill="#C9B3E8" />
      <Rect x="276" y="141" width="12" height="7" rx="2" fill="#FFE3B4" />
      <Circle cx="121" cy="160" r="18" fill="#2E194A" />
      <Circle cx="121" cy="160" r="8" fill="#B49ACE" />
      <Circle cx="258" cy="160" r="18" fill="#2E194A" />
      <Circle cx="258" cy="160" r="8" fill="#B49ACE" />
      <G
        fill="none"
        stroke="#6125C5"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <Path d="M143 110l18-10 18 10v20l-18 10-18-10zM143 110l18 10 18-10M161 120v20M152 105l18 10" />
        <Path d="M190 109h18M190 119h12M190 129h16" />
      </G>
      <Rect x="30" y="134" width="46" height="36" rx="3" fill="#F7B989" />
      <Path d="M48 135h10v12H48z" fill="#FFE1BA" />
      <Rect x="40" y="111" width="30" height="23" rx="3" fill="#F8D7A5" />
      <Path d="M51 111h8v9h-8z" fill="#FFF0D9" />
      <Path
        d="M304 155v-24m0 11c-19-2-22-17-12-18 9-1 12 18 12 18m0 1c17-3 19-19 10-18-7 1-10 18-10 18"
        fill="#C4F17C"
        stroke="#C4F17C"
        strokeWidth="3"
      />
      <Path d="M293 151h23l-4 20h-15z" fill="#F49D88" />
      <Path
        d="M183 37v12m-6-6h12M27 97v8m-4-4h8"
        stroke="#D6BDFA"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </Svg>
  );
}
