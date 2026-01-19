import { Droplet, Waves, Activity, AlertTriangle } from "lucide-react";

export const WATER_FEATURE = {
  id: "water-complaints",
  title: "AquaResolve",
  subtitle: "Smart Water Management",
  description: "Report leaks, contamination, or shortages. Our AI analyzes image data to prioritize critical repairs.",
  theme: {
    primary: "blue",
    gradient: "from-blue-500 to-cyan-400",
    bgAccent: "bg-blue-500/10",
    border: "border-blue-500/20",
  },
  icons: {
    main: Droplet,
    wave: Waves,
    analysis: Activity,
    alert: AlertTriangle
  }
};