import { useState } from "react";
import { Camera, X, Loader2, CheckCircle2, Info } from "lucide-react";
import { Button } from "../../../../ui/button";
import { api } from "../../../../lib/api"; 
import { useAuthStore } from "../../../../store/useAuthStore";
import { useAuth0 } from "@auth0/auth0-react";
import geohash from "ngeohash"; 

export default function ReportForm({ userLocation, userAddress, onSubmitSuccess }) {
  const [step, setStep] = useState("idle"); 
  const [imagePreview, setImagePreview] = useState(null);
  const [imageUrl, setImageUrl] = useState(null); 
  const [description, setDescription] = useState("");
  const [uploadStatus, setUploadStatus] = useState("idle"); 
  const [serverTool, setServerTool] = useState(null); // [NEW] Track SAVE vs UPDATE

  const { getAccessTokenSilently } = useAuth0(); 
  const user = useAuthStore((state) => state.user);

  // --- 1. Cloudinary Upload ---
  const uploadToCloudinary = async (file) => {
    setUploadStatus("uploading");
    const formData = new FormData();
    formData.append("file", file);
    formData.append("userId", user?.id || "anonymous");
    formData.append("upload_preset", import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET);

    try {
      const res = await fetch(`https://api.cloudinary.com/v1_1/${import.meta.env.VITE_CLOUDINARY_CLOUD_NAME}/image/upload`, {
        method: "POST",
        body: formData
      });

      if (!res.ok) throw new Error("Cloudinary Upload failed");
      const data = await res.json(); 
      setImageUrl(data.secure_url); 
      setUploadStatus("done");
      console.log("Cloudinary upload completed:", data.secure_url);
    } catch (error) {
      console.error("Upload failed", error);
      setUploadStatus("error");
    }
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    uploadToCloudinary(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result); 
    };
    reader.readAsDataURL(file);
  };

  // --- 2. Final Submission ---
  const handleSubmit = async () => {
    // ✅ SAFETY CHECK 1: Ensure location exists
    if (!userLocation || !userLocation.lat || !userLocation.lng) {
        alert("Location data is missing. Please wait or refresh.");
        return;
    }

    if (!imageUrl) {
        alert("Please wait for the image upload to complete.");
        return;
    }

    setStep("submitting");

    try {
      const token = await getAccessTokenSilently({
        authorizationParams: {
          audience: import.meta.env.VITE_AUTH0_AUDIENCE, 
          scope: "openid profile email"
        }
      });

      const geoHashId = geohash.encode(userLocation.lat, userLocation.lng, 6);

      const payload = {
          imageUrl: imageUrl,           
          description: description || "", 
          location: userLocation, 
          geohash: geoHashId, 
          address: userAddress || "Unknown Location",         
          status: "INITIATED",          
      };

      console.log("Handoff to AI Orchestrator:", payload);
      
      const response = await api.post(
        `${import.meta.env.VITE_API_PYTHON_URL}/reports`, 
        payload,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            timeout:60000
          }
        }
      );
      console.log("response coming from backend",response.data.tool)

      if (response.status === 200 || response.status === 201) {
        // [CHANGE] Capture the tool ('SAVE' or 'UPDATE')
        const toolAction = response.data.tool || "SAVE";
        setServerTool(toolAction);
        
        setStep("submitted");
        if (onSubmitSuccess) onSubmitSuccess(response.data);
        console.log("response after report submission", response.data);
        
        // [CHANGE] Increased timeout to 8 seconds so user can read the message
        setTimeout(() => {
          setStep("idle");
          setImagePreview(null);
          setImageUrl(null);
          setDescription("");
          setUploadStatus("idle");
          setServerTool(null); // Reset tool
        }, 8000); 
      } else {
        throw new Error("Backend responded with error");
      }
    } catch (error) {
      console.error("Submission failed:", error);
      setStep("idle"); 
      alert("Failed to submit report. Please try again.");
    }
  };

  // --- 3. Success View (Modified) ---
  if (step === "submitted") {
    return (
      <div className="h-full flex flex-col items-center justify-center space-y-6 px-4 animate-in fade-in zoom-in duration-500">
        
        {/* Dynamic Icon Circle */}
        <div className={`w-20 h-20 rounded-full flex items-center justify-center border relative ${
          serverTool === 'SAVE' ? 'bg-emerald-500/20 border-emerald-500/50' : 'bg-blue-500/20 border-blue-500/50'
        }`}>
          <div className={`absolute inset-0 rounded-full animate-ping opacity-20 ${
            serverTool === 'SAVE' ? 'bg-emerald-500' : 'bg-blue-500'
          }`} />
          
          {serverTool === 'SAVE' ? (
            <CheckCircle2 className="w-10 h-10 text-emerald-400 relative z-10" />
          ) : (
            <Info className="w-10 h-10 text-blue-400 relative z-10" />
          )}
        </div>
        
        {/* Dynamic Text Content */}
        <div className="text-center max-w-xs">
          <h3 className="text-2xl font-bold text-white mb-2">
            {serverTool === 'SAVE' ? 'Report Saved' : 'Update Received'}
          </h3>
          <p className="text-zinc-400 text-sm leading-relaxed">
            {serverTool === 'SAVE' 
              ? "Your report has been successfully saved and will be assigned to our staff for resolution."
              : "Someone has already reported this same incident. We've noted your report and you'll receive an email once it's resolved."
            }
          </p>
        </div>

        {/* Progress Indicator */}
        <div className="pt-4">
          <div className="flex items-center gap-2 text-[10px] text-zinc-500 font-bold uppercase tracking-widest">
            <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
            Redirecting in 8s...
          </div>
        </div>
      </div>
    );
  }

  // ✅ SAFETY CHECK 2: Require location for the button to be active
  const isLocationReady = userLocation && userLocation.lat && userLocation.lng;
  const isReadyToSubmit = imagePreview && uploadStatus === 'done' && isLocationReady;

  return (
    <div className="space-y-6">
      {/* Image Upload Zone */}
      <div className="group relative w-full aspect-video rounded-2xl border-2 border-dashed border-white/10 hover:border-blue-500/50 bg-black/20 transition-all overflow-hidden flex flex-col items-center justify-center cursor-pointer">
        {imagePreview ? (
          <>
            <img 
              src={imagePreview} 
              alt="Preview" 
              className="absolute inset-0 w-full h-full object-cover opacity-60 group-hover:opacity-40 transition-opacity" 
            />
            <button 
              onClick={(e) => { 
                  e.stopPropagation(); 
                  setImagePreview(null); 
                  setImageUrl(null);
                  setStep("idle"); 
                  setUploadStatus("idle");
              }}
              className="absolute top-2 right-2 p-1.5 bg-black/60 backdrop-blur-md rounded-full hover:bg-red-500/80 transition-colors z-20 border border-white/10"
            >
              <X className="w-4 h-4 text-white" />
            </button>
          </>
        ) : (
           <div className="flex flex-col items-center gap-3 text-zinc-400 group-hover:text-blue-400 transition-colors">
              <div className="p-4 rounded-full bg-white/5 group-hover:bg-blue-500/20 transition-colors border border-white/5">
                  <Camera className="w-6 h-6" />
              </div>
              <span className="text-xs font-bold tracking-wider uppercase">Upload Photo</span>
           </div>
        )}
        
        <input 
          type="file" 
          accept="image/*"
          className="absolute inset-0 opacity-0 cursor-pointer z-10"
          onChange={handleImageUpload}
          disabled={step === 'submitting'}
        />
        
        {uploadStatus === "uploading" && (
           <div className="absolute inset-0 bg-black/80 z-20 flex flex-col items-center justify-center backdrop-blur-sm">
              <div className="absolute top-0 left-0 w-full h-1 bg-cyan-500 shadow-[0_0_15px_#06b6d4] animate-[scan_1.5s_ease-in-out_infinite]" />
              <Loader2 className="w-8 h-8 text-cyan-400 animate-spin mb-2" />
              <span className="text-xs font-mono text-cyan-300 tracking-widest">
                UPLOADING IMAGE...
              </span>
           </div>
        )}
      </div>

      {/* Location Display */}
      <div className="space-y-2">
        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider ml-1">Detected Location</label>
        <div className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm text-zinc-400 truncate cursor-not-allowed">
            {userAddress || "Detecting..."}
        </div>
      </div>

      {/* Description Input */}
      <div className="space-y-2">
          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider ml-1">Description (Optional)</label>
          <textarea 
              className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-blue-500/50 transition-all resize-none h-24 font-medium"
              placeholder="Add details about the issue..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
          />
      </div>

      {/* Submit Button */}
      <Button 
          className={`w-full h-12 text-sm font-bold shadow-[0_0_20px_-5px_rgba(37,99,235,0.5)] border border-blue-400/20 rounded-xl transition-all ${
             isReadyToSubmit ? 'bg-blue-600 hover:bg-blue-500 text-white' : 'bg-zinc-800 text-zinc-500 border-white/5'
          }`}
          onClick={handleSubmit}
          disabled={!isReadyToSubmit || step === 'submitting'}
      >
          {step === 'submitting' ? (
            <span className="flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" /> Sending Report...
            </span>
          ) : uploadStatus === 'uploading' ? (
             <span className="flex items-center gap-2">Uploading Image...</span>
          ) : !isLocationReady ? (
             "Waiting for Location..."
          ) : (
             "Submit Report"
          )}
      </Button>
    </div>
  );
}