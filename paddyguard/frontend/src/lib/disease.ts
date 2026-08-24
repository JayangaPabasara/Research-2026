import { Droplets, Flame, CircleDot, CheckCircle2, type LucideIcon } from "lucide-react";

export const DISEASE_ICONS: Record<string, LucideIcon> = {
  "Bacterial Blight": Droplets,
  "Leaf Blast": Flame,
  "Brown Spot": CircleDot,
  Healthy: CheckCircle2,
};

export const getDiseaseIcon = (disease: string): LucideIcon =>
  DISEASE_ICONS[disease] ?? CircleDot;

export const DISEASE_COLORS: Record<string, string> = {
  "Bacterial Blight": "#E74C3C",
  "Leaf Blast": "#F4991A",
  "Brown Spot": "#8B4513",
  Healthy: "#27AE60",
};

export const DISEASE_COLORS_SI: Record<string, string> = {
  "Bacterial Blight": "බැක්ටීරියා අංගමාරය",
  "Leaf Blast": "කොළ පිලපත් රෝගය",
  "Brown Spot": "දුඹුරු ලප රෝගය",
  Healthy: "නීරෝගී",
};

export const getDiseaseColor = (disease: string): string =>
  DISEASE_COLORS[disease] ?? "#8A8A8A";

export const getDiseaseNameSi = (disease: string): string =>
  DISEASE_COLORS_SI[disease] ?? disease;
