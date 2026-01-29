import React, { useState, useEffect } from 'react';
import { Flame, X, CheckCircle, Loader, Search } from 'lucide-react'; 
import { ref, push, update, onValue } from "firebase/database"; 
import { db } from "./../firebase/firebase"; 
import { useJsApiLoader } from '@react-google-maps/api';
import { fetchAddressFromCoords } from './../utils/geocoding'; 
import { useAuthStore } from '@/store/useAuthStore'; 
import ngeohash from "ngeohash";
import UserLiveTracking from './UserLiveTracking'; 

export const FireSOSButton = () => {
  const [status, setStatus] = useState('loading'); 
  const [timeLeft, setTimeLeft] = useState(3);
  const [locationData, setLocationData] = useState(null);
  
  // New States for Hover & Data
  const [isHovered, setIsHovered] = useState(false);
  const [activeReport, setActiveReport] = useState(null);
  
  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY
  });

  const user = useAuthStore((state) => state.user);

  // 1. LISTEN TO ALERT STATUS
  useEffect(() => {
    if (!user?.id) return;

    // Listen to the user's active alerts node
    const userStatusRef = ref(db, `userActiveAlerts/${user.id}`);

    const unsubscribe = onValue(userStatusRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        if (data.status !== 'RESOLVED') {
          setStatus('sent');
          // Fetch the full report details (including 'COMMUTING' status)
          fetchActiveReport(data.geohash, data.alertId);
        } else {
          setStatus('idle');
          setActiveReport(null);
        }
      } else {
        setStatus('idle');
        setActiveReport(null);
      }
    });

    return () => unsubscribe();
  }, [user]);

  // 2. HELPER: FETCH FULL REPORT DATA 
  const fetchActiveReport = (geohash, alertId) => {
    if (!geohash || !alertId) return;
    
    const reportRef = ref(db, `fireAlerts/${geohash}/${alertId}`);
    onValue(reportRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setActiveReport({ ...data, id: alertId, geohash: geohash });
      }
    });
  };
  const getRealLocation = () => {
    if (!navigator.geolocation || !isLoaded) return;
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        const address = await fetchAddressFromCoords(latitude, longitude);
        const hash = ngeohash.encode(latitude, longitude, 6);
        setLocationData({ lat: latitude, lng: longitude, accuracy, address, geohash: hash });
      },
      (error) => console.error("Location Error:", error),
      { enableHighAccuracy: true }
    );
  };
  const triggerFireSOS = () => {
    const fallbackHash = ngeohash.encode(0, 0, 7);
    const finalLocation = locationData || { lat: 0, lng: 0, address: "Fetching...", geohash: fallbackHash };
    const geohash = finalLocation.geohash || fallbackHash;
    const newAlertKey = push(ref(db, 'fireAlerts')).key;

    const alertData = {
      id: newAlertKey,
      userId: user.id,
      userName: user.name,
      userEmail: user.email,
      userProfileUrl: user.picture,
      type: "FIRE_SOS",
      status: "RAISED",
      timestamp: Date.now(),
      location: finalLocation,
      coords: { lat: finalLocation.lat, lng: finalLocation.lng }, 
      address: finalLocation.address, 
      user_action: "SOS_BUTTON_PRESSED"
    };

    const updates = {};
    updates[`fireAlerts/${geohash}/${newAlertKey}`] = alertData;
    updates[`userActiveAlerts/${user.id}`] = {
      status: "CRITICAL",
      alertId: newAlertKey,
      geohash: geohash,
      timestamp: Date.now()
    };

    update(ref(db), updates);
  };

  // Timer Logic
  useEffect(() => {
    let timer;
    if (status === 'counting' && timeLeft > 0) {
      timer = setInterval(() => setTimeLeft((p) => p - 1), 1000);
    } 
    else if (status === 'counting' && timeLeft === 0) {
      triggerFireSOS(); 
      setStatus('sent'); 
    }
    return () => clearInterval(timer);
  }, [status, timeLeft]);

  const handleClick = () => {
    if (status === 'idle') {
      setStatus('counting');
      setTimeLeft(3);
      getRealLocation();
    } else if (status === 'counting') {
      setStatus('idle');
      setTimeLeft(3);
      setLocationData(null); 
    }
  };

  const getButtonColor = () => {
    if (status === 'loading') return 'bg-gray-400 text-gray-200 cursor-wait';
    if (status === 'sent') return 'bg-gray-800 text-green-400 border border-green-500/30';
    if (status === 'counting') return 'bg-white text-red-600 animate-pulse border-2 border-red-600';
    return 'bg-red-600 text-white hover:bg-red-700 shadow-[0_0_15px_rgba(220,38,38,0.7)]';
  };

  return (
    // WRAPPER DIV: Handles the Hover Event
    <div 
      className="relative flex flex-col items-center"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <button
        onClick={handleClick}
        disabled={status === 'sent' || status === 'loading'}
        className={`relative z-50 flex items-center justify-center gap-2 px-6 py-2 rounded-full font-bold transition-all duration-300 ${getButtonColor()}`}
      >
        {status === 'loading' && <Loader className="w-4 h-4 animate-spin" />}
        
        {status === 'idle' && (
          <>
            <Flame className="w-5 h-5 fill-current" />
            <span>SOS</span>
          </>
        )}

        {status === 'counting' && (
          <>
            <span className="absolute -top-3 -right-2 flex h-6 w-6 items-center justify-center rounded-full bg-red-600 border-2 border-white text-xs text-white font-bold">
              {timeLeft}
            </span>
            <X className="w-5 h-5" />
            <span>CANCEL</span>
          </>
        )}

        {status === 'sent' && (
          <>
            <CheckCircle className="w-5 h-5" />
            <span>TRACK HELP</span>
          </>
        )}
      </button>

      {/* POPUP CONTAINER */}
      {status === 'sent' && isHovered && activeReport && (
        <div className="absolute top-full right-0 mt-4 z-[60] animate-in fade-in zoom-in-95 duration-200">
           {/* Invisible bridge to prevent mouse gap issues */}
           <div className="absolute -top-4 w-full h-4 bg-transparent"></div>
           
           {/* LOGIC: Only show Map/Chat if status is 'COMMUTING' */}
           {activeReport.status === 'COMMUTING' ? (
             <UserLiveTracking 
               report={activeReport} 
               isLoaded={isLoaded}
               currentUserId={user?.id}
             />
           ) : (
             // FALLBACK: If status is 'RAISED' (Searching for drivers)
             <div className="w-72 bg-white rounded-xl shadow-xl border border-slate-200 p-5 flex flex-col items-center text-center">
                <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center mb-3">
                  <Search className="w-6 h-6 text-orange-600 animate-pulse" />
                </div>
                <h3 className="text-slate-800 font-bold mb-1">Locating Units...</h3>
                <p className="text-xs text-slate-500 mb-4">
                  We have received your SOS. Dispatching the nearest fire unit to your location.
                </p>
                <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                  <div className="h-full bg-orange-500 animate-progress w-1/3"></div>
                </div>
             </div>
           )}
        </div>
      )}
    </div>
  );
};