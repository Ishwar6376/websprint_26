import { useState, useEffect } from 'react';
import { useJsApiLoader } from '@react-google-maps/api';

export  function useReverseGeocoding(lat, lng) {
  const [userAddress, setAddress] = useState("");
  const [loading, setLoading] = useState(false);
  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey:import.meta.env.VITE_GOOGLE_MAPS_API_KEY
  });

  useEffect(() => {
    if (isLoaded && lat && lng) {
      setLoading(true);
      const geocoder = new window.google.maps.Geocoder();
      
      geocoder.geocode({ location: { lat, lng } })
        .then((response) => {
          if (response.results[0]) {
            setAddress(response.results[0].formatted_address);
          }
        })
        .catch((e) => console.error("Geocoding error:", e))
        .finally(() => setLoading(false));
    }
  }, [isLoaded, lat, lng]);

  return { userAddress, loading, isLoaded };
}