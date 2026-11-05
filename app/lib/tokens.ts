// /app/lib/tokens.ts — Design tokens and constants for BoxBoxBoard

export const CATEGORY_STYLES: Record<
  string,
  { accent: string; label: string; borderColor: string; bgDim: string }
> = {
  "Sports Car": {
    accent: "#3B9EFF",
    label: "Sports Car",
    borderColor: "rgba(59,158,255,0.35)",
    bgDim: "rgba(59,158,255,0.12)",
  },
  "Formula Car": {
    accent: "#A855F7",
    label: "Formula",
    borderColor: "rgba(168,85,247,0.35)",
    bgDim: "rgba(168,85,247,0.12)",
  },
  Formula: {
    accent: "#A855F7",
    label: "Formula",
    borderColor: "rgba(168,85,247,0.35)",
    bgDim: "rgba(168,85,247,0.12)",
  },
  Oval: {
    accent: "#F97316",
    label: "Oval",
    borderColor: "rgba(249,115,22,0.35)",
    bgDim: "rgba(249,115,22,0.12)",
  },
  "Dirt Oval": {
    accent: "#EAB308",
    label: "Dirt Oval",
    borderColor: "rgba(234,179,8,0.35)",
    bgDim: "rgba(234,179,8,0.12)",
  },
  "Dirt Road": {
    accent: "#22C55E",
    label: "Dirt Road",
    borderColor: "rgba(34,197,94,0.35)",
    bgDim: "rgba(34,197,94,0.12)",
  },
  Endurance: {
    accent: "#E879F9",
    label: "Endurance",
    borderColor: "rgba(232,121,249,0.35)",
    bgDim: "rgba(232,121,249,0.12)",
  },
};

export const LICENSE_CONFIG = {
  0: { label: "Rookie", color: "#FF4444" },
  1: { label: "D", color: "#F97316" },
  2: { label: "C", color: "#EAB308" },
  3: { label: "B", color: "#22C55E" },
  4: { label: "A", color: "#3B9EFF" },
  5: { label: "PRO", color: "#A855F7" },
} as const;

export const CATEGORY_ORDER = [
  "Sports Car",
  "Formula Car",
  "Oval",
  "Dirt Oval",
  "Dirt Road",
  "Endurance",
];
