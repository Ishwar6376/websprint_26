import { useState, useEffect } from "react";
import { Camera, X, Loader2, CheckCircle2, Info, Map as MapIcon } from "lucide-react";
import { Button } from "../../../../ui/button";
import { api } from "../../../../lib/api"; 
import { useAuthStore } from "../../../../store/useAuthStore";
import { useAuth0 } from "@auth0/auth0-react";
import geohash from "ngeohash"; 
import ComplaintMap from "./ComplaintMap";

export default function ReportForm({ userLocation, userAddress, onSubmitSuccess }) {
  const [allReports, setAllReports] = useState([]);
  const [stats, setStats] = useState({ total: 0, departments: {} });
  const [step, setStep] = useState("idle"); 
  const [imagePreview, setImagePreview] = useState(null);
  const [showMap, setShowMap] = useState(false);
  const [imageUrl, setImageUrl] = useState(null); 
  const [description, setDescription] = useState("");
  const [uploadStatus, setUploadStatus] = useState("idle"); 
  const [serverTool, setServerTool] = useState(null);

  const { getAccessTokenSilently } = useAuth0(); 
  const user = useAuthStore((state) => state.user);

  // Define colors based on department names
  const departmentColors = {
    FIRE: "border-red-500/50 bg-red-500/10 text-red-500",
    WATER: "border-blue-500/50 bg-blue-500/10 text-blue-500",
    ELECTRICITY: "border-yellow-500/50 bg-yellow-500/10 text-yellow-500",
    WASTE: "border-emerald-500/50 bg-emerald-500/10 text-emerald-500",
    INFRASTRUCTURE: "border-purple-500/50 bg-purple-500/10 text-purple-500",
    TOTAL: "border-white/20 bg-white/5 text-white"
  };

  useEffect(() => {
    fetchGlobalReports();
  }, []);

  const fetchGlobalReports = async () => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/map-reports`);
      const json = await res.json();
      const reports = json.data || [];
      setAllReports(reports);

      const counts = reports.reduce((acc, r) => {
        acc.total++;
        acc.departments[r.department] = (acc.departments[r.department] || 0) + 1;
        return acc;
      }, { total: 0, departments: {} });

      setStats(counts);
    } catch (err) {
      console.error("Error fetching map stats:", err);
    }
  };

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
      const data = await res.json(); 
      setImageUrl(data.secure_url); 
      setUploadStatus("done");
    } catch (error) {
      setUploadStatus("error");
    }
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    uploadToCloudinary(file);
    const reader = new FileReader();
    reader.onloadend = () => setImagePreview(reader.result);
    reader.readAsDataURL(file);
  };

  const handleSubmit = async () => {
    if (!userLocation || !imageUrl) return;
    setStep("submitting");

    try {
      const token = await getAccessTokenSilently({
        authorizationParams: { audience: import.meta.env.VITE_AUTH0_AUDIENCE, scope: "openid profile email" }
      });
      const geoHashId = geohash.encode(userLocation.lat, userLocation.lng, 7);
      
      const response = await api.post(`${import.meta.env.VITE_API_PYTHON_URL}/reports`, {
          imageUrl, description, location: userLocation, geohash: geoHashId, address: userAddress, status: "INITIATED",
      }, { headers: { Authorization: `Bearer ${token}` } });

      if (response.status === 200 || response.status === 201) {
        setServerTool(response.data.tool || "SAVE");
        setStep("submitted");
        fetchGlobalReports();
        setTimeout(() => setStep("idle"), 8000);
      }
    } catch (error) {
      setStep("idle");
    }
  };

  if (step === "submitted") {
    return (
      <div className="flex flex-col items-center justify-center space-y-4">
        <div className={`p-4 rounded-full ${serverTool === 'SAVE' ? 'bg-emerald-500/20' : 'bg-blue-500/20'}`}>
          {serverTool === 'SAVE' ? <CheckCircle2 className="text-emerald-500" /> : <Info className="text-blue-500" />}
        </div>
        <h3 className="text-xl font-bold">{serverTool === 'SAVE' ? 'Report Saved' : 'Update Received'}</h3>
        <p className="text-zinc-400 text-center">{serverTool === 'SAVE' ? 'Assigned for resolution.' : 'Already reported; we noted your input.'}</p>
      </div>
    );
  }

  const isReady = imagePreview && uploadStatus === 'done' && userLocation;

  return (
    <>
      {showMap && (
        <div className="fixed inset-0 z-50 bg-black animate-fade-in">
          <div className="absolute top-0 left-0 right-0 h-14 bg-zinc-900/95 backdrop-blur border-b border-white/10 flex items-center justify-between px-4 z-50">
            <h2 className="text-white font-bold text-sm tracking-wide">📍 Public Complaints Map</h2>
            <button onClick={() => setShowMap(false)} className="bg-red-600 hover:bg-red-700 text-white px-4 py-1.5 rounded-lg text-xs font-semibold transition">
              ← Back to Report
            </button>
          </div>
          <div className="w-full h-full pt-14">
            <ComplaintMap userLocation={userLocation} preloadedReports={allReports} />
          </div>
        </div>
      )}

      {!showMap && (
        <div className="w-full max-w-2xl mx-auto space-y-6">
          <div className="relative aspect-video rounded-xl border-2 border-dashed border-white/10 bg-black/20 flex flex-col items-center justify-center cursor-pointer overflow-hidden">
            {imagePreview ? (
              <img src={imagePreview} className="absolute inset-0 w-full h-full object-cover" alt="upload" />
            ) : (
              <Camera className="text-zinc-500" />
            )}
            <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleImageUpload} />
            {uploadStatus === "uploading" && (
              <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                <Loader2 className="animate-spin text-white" />
              </div>
            )}
          </div>

          <div className="bg-white/5 p-3 rounded-lg border border-white/10 text-xs text-zinc-400 truncate">
            {userAddress || "Detecting location..."}
          </div>

          <textarea
            className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-white h-24"
            placeholder="Describe the issue..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />

          <div className="flex gap-2">
            <Button onClick={() => setShowMap(true)} className="flex-1 bg-purple-600 hover:bg-purple-700 text-white gap-2">
              <MapIcon size={16} /> View Map ({stats.total})
            </Button>
            <Button onClick={handleSubmit} disabled={!isReady} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white">
              {step === "submitting" ? <Loader2 className="animate-spin" /> : "Submit Report"}
            </Button>
          </div>

          {/* Departmental Stats at the end */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-4 border-t border-white/10">
            <div className={`border p-4 rounded-xl ${departmentColors.TOTAL}`}>
              <p className="opacity-70 text-[10px] uppercase font-bold tracking-widest">Total</p>
              <p className="text-2xl font-black">{stats.total}</p>
            </div>
            {Object.entries(stats.departments).map(([dept, count]) => (
              <div key={dept} className={`border p-4 rounded-xl ${departmentColors[dept] || "border-white/10 bg-white/5 text-white"}`}>
                <p className="opacity-70 text-[10px] uppercase font-bold truncate">{dept}</p>
                <p className="text-2xl font-black">{count}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}