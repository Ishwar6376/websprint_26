import { Building2, Trash2, Zap, Droplets, Activity, AlertTriangle, ShieldCheck } from "lucide-react";

export const GRIEVANCE_CONFIG = {
  id: "public-grievance-system",
  title: "CivicConnect",
  subtitle: "Public Reports Portal",
  description: "Unified reporting system for public utilities. Geo-tagged submissions are automatically routed to the relevant municipal department.",
  theme: {
    // Official "Government" Dark Theme
    primary: "slate",
    gradient: "from-slate-700 to-zinc-800",
    activeGradient: "from-blue-600 to-slate-800", // For buttons
    bgAccent: "bg-white/5",
    border: "border-white/10",
    textDim: "text-zinc-400",
    textHighlight: "text-white"
  },
  icons: {
    main: ShieldCheck, // Changed from Droplet to Shield/Official Icon
    infra: Building2,
    waste: Trash2,
    power: Zap,
    water: Droplets,
    analysis: Activity,
    alert: AlertTriangle
  }
};