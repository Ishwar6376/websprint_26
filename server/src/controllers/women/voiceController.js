import multer from 'multer';
import { db } from "../../firebaseadmin/firebaseadmin.js";
import { uploadVoiceCloudinary } from "../../utils/uploadVoiceCloudinary.js";

// Switch to Memory Storage (much faster for cloud uploads)
const storage = multer.memoryStorage();
export const uploadMiddleware = multer({ storage: storage });

export const uploadVoiceNote = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No audio file received" });
    }

    const { userId, userName, roomId, lat, lng } = req.body;

    // 1. Upload to Cloudinary
    const cloudinaryResult = await uploadVoiceCloudinary(req.file.buffer);
    
    // The public secure URL from Cloudinary
    const audioUrl = cloudinaryResult.secure_url;

    // 2. Save Reference to Firestore
    const voiceLogRef = db.collection('voice_alerts').doc();
    
    const voiceData = {
      id: voiceLogRef.id,
      userId,
      userName,
      roomId,
      audioUrl, // Now a permanent Cloudinary link
      cloudinaryId: cloudinaryResult.public_id, // Good to store for future deletions
      location: {
        lat: Number(lat),
        lng: Number(lng)
      },
      timestamp: new Date().toISOString(),
      isListened: false,
      type: "VOICE_SOS"
    };

    await voiceLogRef.set(voiceData);

    console.log(`🎙️ Voice Note Secured via Cloudinary: ${userName}`);

    return res.status(200).json({ 
      success: true, 
      message: "Voice note secured in cloud", 
      url: audioUrl 
    });

  } catch (error) {
    console.error("❌ Cloudinary/Firestore Error:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};