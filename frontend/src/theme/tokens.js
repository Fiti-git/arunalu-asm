export const SIDEBAR_WIDTH_OPEN = 240;
export const SIDEBAR_WIDTH_COLLAPSED = 72;
export const HEADER_HEIGHT = 72;

export const ACCENT_AVATARS = [
  "#2F6F68",
  "#5B6CFF",
  "#F59E0B",
  "#16A34A",
  "#DC2626",
  "#7C3AED",
  "#0EA5E9",
  "#DB2777",
];

export function pickAvatarColor(seed = "") {
  if (!seed) return ACCENT_AVATARS[0];
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  }
  return ACCENT_AVATARS[Math.abs(hash) % ACCENT_AVATARS.length];
}
