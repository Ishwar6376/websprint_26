import { db } from "../firebaseadmin/firebaseadmin.js";
import { asyncHandler } from "../utils/aysncHandler.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { uploadImage } from "../services/uploadImage.js";

/* ================= CREATE DONATION ================= */
export const createDonation = asyncHandler(async (req, res) => {
  const { category, description, address, lat, lng, time, donorName } = req.body;

  // 🔐 AUTH0 USER
  const donorId = req.auth?.payload?.sub;
  if (!donorId) {
    return res.status(401).json(new ApiResponse(401, null, "Unauthorized"));
  }

  /* ---------- VALIDATION ---------- */
  if (
    !category ||
    !description ||
    !address ||
    lat === undefined ||
    lng === undefined ||
    !time ||
    !donorName
  ) {
    return res
      .status(400)
      .json(new ApiResponse(400, null, "All fields are required"));
  }

  /* ---------- IMAGE UPLOAD ---------- */
  let imageUrl = "";
  if (req.file) {
    imageUrl = await uploadImage(req.file.buffer);
  }

  /* ---------- SAVE TO FIREBASE ---------- */
  const newDonationRef = db.collection("donations").doc();

  await newDonationRef.set({
    category,
    description,
    address,
    lat: Number(lat),
    lng: Number(lng),
    time,
    donorName,
    donorId,       // ✅ auth user
    image: imageUrl, // ✅ cloudinary url
    status: "pending",
    createdAt: new Date(),
  });

  return res
    .status(201)
    .json(new ApiResponse(201, { id: newDonationRef.id }, "Donation created"));
});

/* ================= GET DONATIONS ================= */
export const getDonations = asyncHandler(async (req, res) => {
  const { category } = req.query;

  const snapshot = await db
    .collection("donations")
    .where("category", "==", category)
    .where("status", "==", "pending")
    .get();

  const donations = snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      description: data.description,
      address: data.address,
      lat: data.lat,
      lng: data.lng,
      time: data.time,
      donorName: data.donorName,
      image: data.image || "", // 🔥 IMAGE SENT TO FRONTEND
    };
  });

  res.status(200).json({ data: donations });
});
