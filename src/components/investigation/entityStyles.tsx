import {
  ShieldAlert,
  UserRound,
  Eye,
  Car,
  MapPin,
  Phone,
  Landmark,
  FileSearch,
  FolderOpen,
  type LucideIcon,
} from "lucide-react";
import type { EntityType } from "@/lib/investigationData";

// Shared visual language for every entity type on the board — used by the
// relationship graph, the selected-entity detail rail, and the legend so
// colours and icons stay consistent everywhere.
export const ENTITY_STYLES: Record<
  EntityType,
  { color: string; glow: string; Icon: LucideIcon; label: string }
> = {
  // Deepened for legibility on a light background (approx. 3:1+ against white,
  // no neon) while staying distinguishable by hue.
  suspect: { color: "#be123c", glow: "rgba(190,18,60,0.35)", Icon: ShieldAlert, label: "Suspect" },
  victim: { color: "#0369a1", glow: "rgba(3,105,161,0.35)", Icon: UserRound, label: "Victim" },
  witness: { color: "#047857", glow: "rgba(4,120,87,0.35)", Icon: Eye, label: "Witness" },
  vehicle: { color: "#b45309", glow: "rgba(180,83,9,0.35)", Icon: Car, label: "Vehicle" },
  location: { color: "#6d28d9", glow: "rgba(109,40,217,0.35)", Icon: MapPin, label: "Location" },
  phone: { color: "#0e7490", glow: "rgba(14,116,144,0.35)", Icon: Phone, label: "Phone" },
  bank: { color: "#4d7c0f", glow: "rgba(77,124,15,0.35)", Icon: Landmark, label: "Bank Account" },
  evidence: { color: "#c2410c", glow: "rgba(194,65,12,0.35)", Icon: FileSearch, label: "Evidence" },
  case: { color: "#334155", glow: "rgba(51,65,85,0.35)", Icon: FolderOpen, label: "Case File" },
};
