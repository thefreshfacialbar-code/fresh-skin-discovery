export const EMAIL_COLORS = {
  cream: "#f8f1ea",
  paper: "#fffdfb",
  ink: "#2f2b2a",
  muted: "#5e5a5a",
  mutedAlt: "#7d7581",
  border: "#e6dfe3",
  accent: "#8e6b85",
  accentSoft: "#f3edf0",
  success: "#5a5a5a",
  shadow: "rgba(43, 36, 33, 0.08)",
} as const;

export const EMAIL_BASE_CSS = `
  body, table, td, th, p, a, span, li { font-family: "Helvetica Neue", Arial, sans-serif; }
  body { margin: 0; padding: 0; background-color: #f3eee8; }
  table { border-collapse: collapse; }
  img { border: 0; outline: none; text-decoration: none; }
  @media only screen and (max-width: 620px) {
    .email-shell { width: 100% !important; }
    .stack { display: block !important; width: 100% !important; }
    .pad-mobile { padding-left: 18px !important; padding-right: 18px !important; }
  }
`;

export function escapeHtml(value: string | null | undefined): string {
  if (value === null || value === undefined) return "";
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function normalizePlainText(value: string | null | undefined): string {
  if (!value) return "";
  return String(value).replace(/\s+/g, " ").trim();
}

export function ensureSafeUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  const trimmed = url.trim();
  if (!trimmed) return null;
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }
  return null;
}
