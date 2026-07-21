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
  suspect: { color: "#fb7185", glow: "rgba(251,113,133,0.55)", Icon: ShieldAlert, label: "Suspect" },
  victim: { color: "#38bdf8", glow: "rgba(56,189,248,0.55)", Icon: UserRound, label: "Victim" },
  witness: { color: "#34d399", glow: "rgba(52,211,153,0.55)", Icon: Eye, label: "Witness" },
  vehicle: { color: "#fbbf24", glow: "rgba(251,191,36,0.55)", Icon: Car, label: "Vehicle" },
  location: { color: "#a78bfa", glow: "rgba(167,139,250,0.55)", Icon: MapPin, label: "Location" },
  phone: { color: "#22d3ee", glow: "rgba(34,211,238,0.55)", Icon: Phone, label: "Phone" },
  bank: { color: "#a3e635", glow: "rgba(163,230,53,0.55)", Icon: Landmark, label: "Bank Account" },
  evidence: { color: "#fb923c", glow: "rgba(251,146,60,0.55)", Icon: FileSearch, label: "Evidence" },
  case: { color: "#e2e8f0", glow: "rgba(226,232,240,0.5)", Icon: FolderOpen, label: "Case File" },
};
