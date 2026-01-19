import { useState } from "react";
import { MapPin, Shield } from "lucide-react";
import { Button } from "../../../ui/button";

export default function LocationGuard({ onLocationGranted }) {
  const [loading, setLoading] = useState(false);

  const requestLocation = () => {
    setLoading(true);
    if ("geolocation" in navigator) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                // Simulate a slight delay for UX (feeling of "connecting")
                setTimeout(() => {
                    onLocationGranted({
                        lat: position.coords.latitude,
                        lng: position.coords.longitude
                    });
                }, 800);
            },
            (error) => {
                console.error(error);
                setLoading(false);
                alert("Location access is needed to map water issues accurately.");
            }
        );
    }
  };

  return (
    <div className="w-full max-w-sm p-8 bg-black/60 backdrop-blur-2xl border border-white/10 rounded-3xl shadow-2xl flex flex-col items-center text-center relative overflow-hidden">
      
      {/* Background Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-40 h-40 bg-blue-500/20 blur-[60px] rounded-full pointer-events-none" />

      <div className="w-16 h-16 bg-gradient-to-tr from-blue-600 to-cyan-400 rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-blue-500/20 relative z-10">
        <MapPin className="w-8 h-8 text-white" />
      </div>

      <h2 className="text-2xl font-bold text-white mb-2 relative z-10">Enable Location</h2>
      <p className="text-zinc-400 text-sm mb-8 leading-relaxed relative z-10">
        We need your coordinates to pinpoint water leaks and route maintenance teams efficiently.
      </p>

      <div className="w-full space-y-3 relative z-10">
        <Button 
            onClick={requestLocation}
            className="w-full h-12 bg-white text-black hover:bg-zinc-200 font-bold text-base"
            disabled={loading}
        >
            {loading ? "Locating..." : "Allow Access"}
        </Button>
        <div className="flex items-center justify-center gap-1.5 text-zinc-500">
            <Shield className="w-3 h-3" />
            <span className="text-[10px] font-medium uppercase tracking-wide">Encrypted & Private</span>
        </div>
      </div>
    </div>
  );
}