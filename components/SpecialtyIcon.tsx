import {
  Activity,
  Baby,
  Bone,
  Brain,
  Cross,
  Droplet,
  Ear,
  Eye,
  HeartPulse,
  Leaf,
  Pill,
  Ribbon,
  Scan,
  Stethoscope,
  Syringe,
  Wind
} from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  /** Specialty slug or name (case insensitive) */
  specialty: string;
  className?: string;
  size?: number;
};

/**
 * Maps a specialty name or slug to a Lucide medical icon.
 * Falls back to a generic Stethoscope.
 */
const ICON_MAP: Record<string, typeof Stethoscope> = {
  "general physician": Stethoscope,
  cardiologist: HeartPulse,
  orthopedic: Bone,
  orthopaedic: Bone,
  pediatrician: Baby,
  paediatrician: Baby,
  gynecologist: Baby, // family / maternal care icon
  gynaecologist: Baby,
  dermatologist: Activity,
  neurologist: Brain,
  diabetologist: Syringe,
  ent: Ear,
  "ent specialist": Ear,
  ophthalmologist: Eye,
  urologist: Droplet,
  psychiatrist: Brain,
  physiotherapist: Activity,
  oncologist: Ribbon,
  gastroenterologist: Stethoscope,
  dentist: Cross,
  pulmonologist: Wind,
  endocrinologist: Scan,
  nephrologist: Droplet,
  rheumatologist: Bone,
  ayurveda: Leaf,
  homoeopath: Pill,
  homeopath: Pill
};

function lookup(spec: string): typeof Stethoscope {
  const key = spec.toLowerCase().trim().replace(/-/g, " ");
  return ICON_MAP[key] ?? Stethoscope;
}

export default function SpecialtyIcon({ specialty, className, size = 20 }: Props) {
  const Icon = lookup(specialty);
  return <Icon size={size} className={cn("text-primary", className)} aria-hidden />;
}

export { lookup as resolveSpecialtyIcon };
