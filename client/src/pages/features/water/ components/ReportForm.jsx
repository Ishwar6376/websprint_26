import { useState } from "react";
import { Camera, X, Loader2, CheckCircle2 } from "lucide-react";
import { Button } from "../../../../ui/button";
import { api } from "../../../../lib/api"; 
import { useAuthStore } from "../../../../store/useAuthStore";

export default function ReportForm({ userLocation, userAddress, onSubmitSuccess }) {
  const [step, setStep] = useState("idle"); 
  const [imagePreview, setImagePreview] = useState(null);
  const [imageUrl, setImageUrl] = useState(null); 
  const [description, setDescription] = useState("");
  const [uploadStatus, setUploadStatus] = useState("idle"); 

  const user = useAuthStore((state) => state.user);

  function generateReportId() {
    return `RPT-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
  }

  // --- 1. Cloudinary Upload (Essential for URL) ---
  const uploadToCloudinary = async (file, currentReportId) => {
    setUploadStatus("uploading");
    const formData = new FormData();
    formData.append("file", file);
    formData.append("userId", user?.id || "anonymous"); 
    formData.append("reportId", currentReportId);
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

    const currentReportId = generateReportId();

    uploadToCloudinary(file, currentReportId);
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result); 
    };
    reader.readAsDataURL(file);
  };

  // --- 2. Final Submission (Fire and Forget) ---
  const handleSubmit = async () => {
    // We strictly need the Image URL from Cloudinary before we can create a report
    if (!imageUrl) {
        alert("Please wait for the image upload to complete.");
        return;
    }

    setStep("submitting");
    const payload = {
        imageUrl: imageUrl,           
        description: description || "", 
        location: userLocation,       
        address: userAddress,         
        status: "INITIATED",          
        userId: user?.id,             
    };

    console.log("Handoff to Backend:", payload);

    try {
      const response = await api.post(`${import.meta.env.VITE_API_PYTHON_URL}/reports`, payload);

      if (response.status === 200 || response.status === 201) {
        setStep("submitted");
        if (onSubmitSuccess) onSubmitSuccess(response.data);
        setTimeout(() => {
          setStep("idle");
          setImagePreview(null);
          setImageUrl(null);
          setDescription("");
          setUploadStatus("idle");
        }, 2000);
      } else {
        throw new Error("Backend responded with error");
      }
    } catch (error) {
      console.error("Submission failed:", error);
      setStep("idle"); 
      alert("Failed to submit report. Please try again.");
    }
  };

  if (step === "submitted") {
    return (
      <div className="h-full flex flex-col items-center justify-center space-y-4 animate-in fade-in zoom-in duration-300">
        <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center border border-green-500/50">
          <CheckCircle2 className="w-8 h-8 text-green-400" />
        </div>
        <div className="text-center">
          <h3 className="text-xl font-bold text-white">Report Sent</h3>
          <p className="text-zinc-400 text-sm">Our AI Agents are processing your report.</p>
        </div>
      </div>
    );
  }

  const isReadyToSubmit = imagePreview && uploadStatus === 'done';

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
          ) : (
             "Submit Report"
          )}
      </Button>
    </div>
  );
}