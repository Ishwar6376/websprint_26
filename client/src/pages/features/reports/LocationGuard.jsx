import { useState } from "react";
import { MapPin, Loader2, AlertCircle } from "lucide-react";
import { Button } from "../../../ui/button";
import { GRIEVANCE_CONFIG } from "./config"; 

export default function LocationGuard({ onLocationGranted }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Destructure from new config
  const { theme, icons } = GRIEVANCE_CONFIG;

  const requestLocation = () => {
    setLoading(true);
    setError(null);

    if (!("geolocation" in navigator)) {
        setLoading(false);
        setError("Geolocation is not supported by this browser.");
        return;
    }

    navigator.geolocation.getCurrentPosition(
        (position) => {
            setTimeout(() => {
                setLoading(false);
                if (onLocationGranted) {
                    onLocationGranted({
                        lat: position.coords.latitude,
                        lng: position.coords.longitude
                    });
                }
            }, 800);
        },
        (err) => {
            setLoading(false);
            if (err.code === 1) {
                setError("Permission denied. Location access is required to verify reports.");
            } else if (err.code === 2) {
                setError("Position unavailable. Please check your GPS signal.");
            } else {
                setError("An unknown error occurred.");
            }
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  return (
    // Updated container to match Dark Mode "Slate" theme
    <div className={`w-full max-w-sm p-8 bg-zinc-900/80 backdrop-blur-xl border ${theme.border} rounded-2xl shadow-2xl shadow-black/50 flex flex-col items-center text-center relative overflow-hidden animate-in fade-in zoom-in-95 duration-500`}>
      
      {/* Subtle top light leak instead of Aqua blobs */}
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-50" />

      {/* Header Icon */}
      <div className={`w-16 h-16 bg-gradient-to-br ${theme.gradient} border border-white/5 rounded-xl flex items-center justify-center mb-6 shadow-lg relative z-10`}>
        {loading ? (
           <Loader2 className="w-7 h-7 text-white animate-spin" />
        ) : (
           <MapPin className="w-7 h-7 text-white" />
        )}
      </div>

      <h2 className="text-xl font-semibold text-white mb-2 relative z-10 tracking-tight">
        Confirm Location
      </h2>
      <p className="text-zinc-400 text-sm mb-8 leading-relaxed relative z-10 px-4">
        To file a report for <span className="text-zinc-200 font-medium">Infrastructure, Waste, Power, or Water</span>, we need your precise coordinates.
      </p>

      {/* Categories Bar */}
      <div className="flex justify-center gap-6 mb-8 w-full border-y border-white/5 py-4">
         {[icons.infra, icons.waste, icons.power, icons.water].map((Icon, i) => (
             <Icon key={i} className="w-5 h-5 text-zinc-500" />
         ))}
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-6 flex items-start gap-3 text-xs text-red-400 bg-red-950/30 p-3 rounded-lg border border-red-500/20 relative z-10 w-full">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span className="text-left font-medium">{error}</span>
        </div>
      )}

      <div className="w-full space-y-4 relative z-10">
        <Button 
            onClick={requestLocation}
            className={`w-full h-11 font-medium text-sm transition-all ${
                loading 
                ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed' 
                : `bg-white text-black hover:bg-zinc-200`
            }`}
            disabled={loading}
        >
            {loading ? "Verifying..." : "Allow Access & Continue"}
        </Button>
        
        <div className="flex items-center justify-center gap-2 text-zinc-600">
            <icons.main className="w-3 h-3" />
            <span className="text-[10px] uppercase tracking-widest font-semibold">Official Grievance Portal</span>
        </div>
      </div>
    </div>
  );
}