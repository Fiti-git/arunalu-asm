import { ACCENT_AVATARS } from "./tokens";

// Arunalu brand palette (matches the yellow + blue login background).
//   Primary: royal blue, lighter & friendlier than the maroon wordmark
//   Secondary: warm gold/yellow from the sun rays + login bg
const palette = {
  mode: "light",
  primary: {
    main: "#2F54A0",
    light: "#5478C2",
    dark: "#1E3A78",
    contrastText: "#FFFFFF",
  },
  secondary: {
    main: "#F4C430",
    light: "#F8D96A",
    dark: "#C79C1D",
    contrastText: "#1F2937",
  },
  success: {
    main: "#16A34A",
    light: "#DCFCE7",
    dark: "#15803D",
    contrastText: "#FFFFFF",
  },
  warning: {
    main: "#F59E0B",
    light: "#FEF3C7",
    dark: "#B45309",
    contrastText: "#1F2937",
  },
  error: {
    main: "#DC2626",
    light: "#FEE2E2",
    dark: "#B91C1C",
    contrastText: "#FFFFFF",
  },
  info: {
    main: "#0EA5E9",
    light: "#E0F2FE",
    dark: "#0369A1",
    contrastText: "#FFFFFF",
  },
  grey: {
    50: "#F9FAFB",
    100: "#F3F4F6",
    200: "#E5E7EB",
    300: "#D1D5DB",
    400: "#9CA3AF",
    500: "#6B7280",
    600: "#4B5563",
    700: "#374151",
    800: "#1F2937",
    900: "#111827",
  },
  background: {
    default: "#F7F9FD",
    paper: "#FFFFFF",
  },
  text: {
    primary: "#111827",
    secondary: "#6B7280",
    disabled: "#9CA3AF",
  },
  divider: "#E5E7EB",
  action: {
    hover: "rgba(47, 84, 160, 0.06)",
    selected: "rgba(47, 84, 160, 0.12)",
    disabled: "rgba(17, 24, 39, 0.26)",
    disabledBackground: "rgba(17, 24, 39, 0.08)",
    focus: "rgba(47, 84, 160, 0.12)",
  },
  accentAvatars: ACCENT_AVATARS,
};

export default palette;