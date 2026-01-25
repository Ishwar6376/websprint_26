import { useState } from "react";
import { MapPin, Shield, Loader2, AlertCircle } from "lucide-react";
import { Button } from "../../../ui/button";

export default function LocationGuard({ onLocationGranted }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

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
                // 1. Stop loading
                setLoading(false);
                
                // 2. Safely call the parent function
                if (onLocationGranted) {
                    onLocationGranted({
                        lat: position.coords.latitude,
                        lng: position.coords.longitude
                    });
                }
            }, 800);
        },
        (err) => {
            console.error("Location Error:", err);
            setLoading(false); // <--- You handled it correctly here, but missed it in success!
            
            if (err.code === 1) {
                setError("Permission denied. Please allow location access in your browser settings.");
            } else if (err.code === 2) {
                setError("Position unavailable. Please check your GPS signal.");
            } else if (err.code === 3) {
                setError("Location request timed out.");
            } else {
                setError("An unknown error occurred.");
            }
        },
        {
            enableHighAccuracy: true, 
            timeout: 10000,
            maximumAge: 0
        }
    );
  };

  return (
    <div className="w-full max-w-sm p-8 bg-black/60 backdrop-blur-2xl border border-white/10 rounded-3xl shadow-2xl flex flex-col items-center text-center relative overflow-hidden animate-in zoom-in-95 duration-300">
      
      {/* Background Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-40 h-40 bg-blue-500/20 blur-[60px] rounded-full pointer-events-none" />

      <div className="w-16 h-16 bg-gradient-to-tr from-blue-600 to-cyan-400 rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-blue-500/20 relative z-10">
        {loading ? (
           <Loader2 className="w-8 h-8 text-white animate-spin" />
        ) : (
           <MapPin className="w-8 h-8 text-white" />
        )}
      </div>

      <h2 className="text-2xl font-bold text-white mb-2 relative z-10">Enable Location</h2>
      <p className="text-zinc-400 text-sm mb-6 leading-relaxed relative z-10">
        We need your precise coordinates to pinpoint infrastructure issues and route AI agents accurately.
      </p>

      {/* Error Message Display */}
      {error && (
        <div className="mb-6 flex items-center gap-2 text-xs text-red-400 bg-red-500/10 p-3 rounded-lg border border-red-500/20 relative z-10">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span className="text-left font-medium">{error}</span>
        </div>
      )}

      <div className="w-full space-y-3 relative z-10">
        <Button 
            onClick={requestLocation}
            className={`w-full h-12 font-bold text-base transition-all ${
                loading 
                ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed' 
                : 'bg-white text-black hover:bg-zinc-200'
            }`}
            disabled={loading}
        >
            {loading ? "Acquiring Signal..." : "Allow Access"}
        </Button>
        
        <div className="flex items-center justify-center gap-1.5 text-zinc-500">
            <Shield className="w-3 h-3" />
            <span className="text-[10px] font-medium uppercase tracking-wide">Encrypted & Private</span>
        </div>
      </div>
    </div>
  );
}