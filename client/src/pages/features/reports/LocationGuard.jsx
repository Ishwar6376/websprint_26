import { useState } from "react";
import { MapPin, Loader2, AlertCircle, Shield } from "lucide-react";
import { Button } from "../../../ui/button";
import { GRIEVANCE_CONFIG } from "./config"; 
import FloatingLines from "../../../ui/FloatingLines";

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
            console.error("Location Error:", err);
            
            if (err.code === 1) {
                setError("Permission denied. Please allow location access.");
            } else if (err.code === 2) {
                setError("Position unavailable. Check GPS.");
            } else if (err.code === 3) {
                setError("Request timed out.");
            } else {
                setError("An unknown error occurred.");
            }
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-zinc-950 overflow-hidden">
      
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-50" />

      <div className={`w-16 h-16 bg-gradient-to-br ${theme.gradient} border border-white/5 rounded-xl flex items-center justify-center mb-6 shadow-lg relative z-10`}>
        {loading ? (
           <Loader2 className="w-7 h-7 text-white animate-spin" />
        ) : (
           <MapPin className="w-7 h-7 text-white" />
        )}
      </div>
      
      <div className="absolute inset-0 z-0 opacity-30 pointer-events-none">
        <FloatingLines />
      </div>

      <div className="w-full max-w-2xl p-10 bg-zinc-900/50 backdrop-blur-md border border-zinc-800/50 rounded-3xl shadow-2xl flex flex-col items-center text-center relative z-10 animate-in zoom-in-95 duration-300 mx-4">
        
        <div className="w-24 h-24 bg-blue-500/10 rounded-full flex items-center justify-center mb-10 shadow-inner ring-1 ring-blue-500/20 transition-all">
            {loading ? (
                <Loader2 className="w-12 h-12 text-blue-500 animate-spin" />
            ) : (
                <MapPin className="w-12 h-12 text-blue-500" />
            )}
        </div>

        <h2 className="text-4xl font-bold text-white tracking-tight mb-4">Enable Location</h2>
        <p className="text-zinc-400 text-base leading-relaxed mb-8 max-w-lg">
          We need your precise coordinates to pinpoint infrastructure issues and route AI agents accurately.
        </p>

        <div className="flex justify-center gap-6 mb-8 w-full border-y border-white/5 py-4">
           {[icons.infra, icons.waste, icons.power, icons.water].map((Icon, i) => (
               <Icon key={i} className="w-5 h-5 text-zinc-500" />
           ))}
        </div>

        {error && (
            <div className="w-full max-w-lg mb-8 flex items-start gap-3 text-sm text-red-400 bg-red-500/10 p-4 rounded-xl border border-red-500/20 text-left">
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                <span className="font-medium">{error}</span>
            </div>
        )}

        <div className="w-full max-w-lg space-y-6 mb-6">
            <Button 
                onClick={requestLocation}
                disabled={loading}
                className="w-full h-16 text-xl bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl shadow-xl shadow-blue-900/20 transition-all hover:scale-[1.01] border-none"
            >
                {loading ? "Acquiring Signal..." : "Allow Access"}
            </Button>
            
            <div className="flex items-center justify-center gap-2 text-zinc-500">
                <Shield className="w-4 h-4" />
                <span className="text-xs font-bold uppercase tracking-widest">Encrypted & Private</span>
            </div>
        </div>

        <div className="flex items-center justify-center gap-2 text-zinc-600">
            <icons.main className="w-3 h-3" />
            <span className="text-[10px] uppercase tracking-widest font-semibold">Official Grievance Portal</span>
        </div>
      </div>
    </div>
  );
}