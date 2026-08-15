// Ported from prototype/nocturne.css — only the tokens the five screens use.

export const color = {
  bg: "#161826",
  surface: "#232532",
  text: "#e9e9ed",
  textMuted: "rgba(233,233,237,0.6)",
  textFaint: "rgba(233,233,237,0.45)",
  divider: "rgba(233,233,237,0.16)",
  accent: "#9184d9",
  accent2: "#a7a1db",

  neutral100: "#f3f5fe",
  neutral300: "#cfd3e5",
  neutral400: "#b2b6ca",
  neutral600: "#75798c",
  neutral700: "#595d6c",
  neutral800: "#3f424d",
  neutral900: "#292b31",

  accent100: "#f5f4ff",
  accent800: "#423a6a",

  stageBg: "#0b0c14",
} as const;

export const space = {
  1: 3,
  2: 6,
  3: 8,
  4: 11,
  6: 17,
  8: 22,
} as const;

export const radius = {
  sm: 4,
  md: 8,
  lg: 14,
} as const;

// Android elevation approximations of the CSS box-shadows.
export const elevation = {
  sm: 2,
  md: 6,
  lg: 16,
} as const;

export const font = {
  heading: { fontWeight: "500" as const },
};
