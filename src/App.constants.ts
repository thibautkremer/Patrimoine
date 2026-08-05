import React from "react";
import {
  Home, Building2, Landmark, KeyRound, Wallet, TrendingUp, Tag, Compass,
  Globe2, Settings2, ShieldCheck
} from "lucide-react";

export const INK = "#152238";
export const PAPER = "#F4F2EC";
export const BRASS = "#8C6A2F";
export const BRASS_LIGHT = "#C7A94F";
export const POSITIVE = "#2F6B4F";
export const NEGATIVE = "#9B3B3B";
export const LINE = "#E1DCCC";

export interface NavItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
}

export const NAV: NavItem[] = [
  { id: "dashboard", label: "Dashboard", icon: Home },
  { id: "bien", label: "Le bien", icon: Building2 },
  { id: "credit", label: "Crédit", icon: Landmark },
  { id: "assurance", label: "Assurance", icon: ShieldCheck },
  { id: "location", label: "Location", icon: KeyRound },
  { id: "cashflow", label: "Cash-flow", icon: Wallet },
  { id: "rentabilite", label: "Rentabilité", icon: TrendingUp },
  { id: "vente", label: "Vente", icon: Tag },
  { id: "simulations", label: "Simulations", icon: Compass },
  { id: "france-usa", label: "France / USA", icon: Globe2 },
  { id: "parametres", label: "Paramètres", icon: Settings2 },
  { id: "admin", label: "Administration", icon: ShieldCheck },
];

export const SCENARIOS = [450000, 475000, 500000, 525000, 550000, 575000, 600000, 650000];
export const SIM_YEARS = [2026, 2027, 2028, 2030, 2035];

export const IR_BRACKETS_2024 = [
  { min: 0, max: 11294, rate: 0 },
  { min: 11294, max: 28797, rate: 0.11 },
  { min: 28797, max: 82341, rate: 0.30 },
  { min: 82341, max: 177106, rate: 0.41 },
  { min: 177106, max: Infinity, rate: 0.45 },
];

