import { db } from "../../firebaseadmin/firebaseadmin.js";
import admin from 'firebase-admin';
import axios from 'axios';
import { sendEmail } from "../../utils/sendEmail.js"; 

export const resolveWasteReports = async (req, res) => {
    const { staffimageUrl, imageUrl, geohash, id, userId, assignedTo, reportId, reporterUserId } = req.body;
    
    console.log("request coming from frontend to resolve", req.body);

    if (!staffimageUrl || !imageUrl || !geohash || !id || !userId || !assignedTo || !reportId || !reporterUserId) {
        return res.status(400).json({
            success: false,
            message: "Missing required fields"
        });
    }

    try {
        const url = process.env.PYTHON_SERVER;
        const aiResponse = await axios.post(`${url}/resolveWasteReports`, {
            imageUrl,
            staffimageUrl
        });

        const aiData = aiResponse.data;

        if (aiData.success === true && aiData.confidence_result) {
            
            const { confidence, reasoning } = aiData.confidence_result;
            console.log(`AI Analysis - Confidence: ${confidence}, Reasoning: ${reasoning}`);

            if (confidence >= 0.8) {
                const taskDocSnap = await db.collection("tasks").doc(id).get();
                if (!taskDocSnap.exists) {
                    return res.status(404).json({ success: false, message: "Task assignment not found" });
                }

                const reportDocRef = db.collection('wasteReports')
                    .doc(geohash)
                    .collection('reports')
                    .doc(reporterUserId)
                    .collection('userReports')
                    .doc(reportId);

                const reportDoc = await reportDocRef.get();

                if (!reportDoc.exists) {
                    console.error("Document not found at path:", reportDocRef.path);
                    return res.status(404).json({ success: false, message: "Report document not found." });
                }
                const batch = db.batch();
                batch.update(taskDocSnap.ref, {
                    status: "RESOLVED",
                    updatedAt: admin.firestore.FieldValue.serverTimestamp()
                });
                batch.update(reportDocRef, {
                    status: "RESOLVED",
                    resolvedAt: admin.firestore.FieldValue.serverTimestamp(),
                    resolvedImage: staffimageUrl,
                    resolvedBy: assignedTo,
                    aiVerification: {
                        verified: true,
                        confidence: confidence,
                        reasoning: reasoning
                    }
                });

                await batch.commit();
                try {
                    const reportData = reportDoc.data();
                    const emailSet = new Set();
                    if (reportData.email) emailSet.add(reportData.email);
                    if (Array.isArray(reportData.interests)) {
                        reportData.interests.forEach(email => emailSet.add(email));
                    }

                    const recipients = Array.from(emailSet);

                    if (recipients.length > 0) {
                        console.log(`Sending resolution emails to ${recipients.length} recipients...`);
                        const emailSubject = ` Waste Report Resolved: ${reportData.title || 'Community Issue'}`;
                        const emailHtml = `
                            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                                <h2 style="color: #10b981;">Report Resolved Successfully!</h2>
                                <p>Good news! The waste report you are following has been resolved and verified.</p>
                                
                                <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
                                    <p><strong> Location:</strong> ${reportData.address || 'Location provided via map'}</p>
                                    <p><strong> AI Verification:</strong> ${(confidence * 100).toFixed(0)}% Confidence</p>
                                    <p><strong> Note:</strong> ${reasoning}</p>
                                </div>

                                <h3>Proof of Resolution</h3>
                                <div style="display: flex; gap: 10px; margin-bottom: 20px;">
                                    <div style="width: 48%;">
                                        <p style="text-align: center; font-size: 12px; color: #666;">BEFORE</p>
                                        <img src="${imageUrl}" alt="Before" style="width: 100%; border-radius: 8px; border: 1px solid #ddd;" />
                                    </div>
                                    <div style="width: 48%;">
                                        <p style="text-align: center; font-size: 12px; color: #666;">AFTER</p>
                                        <img src="${staffimageUrl}" alt="Resolved" style="width: 100%; border-radius: 8px; border: 2px solid #10b981;" />
                                    </div>
                                </div>

                                <p style="font-size: 12px; color: #888;">Thank you for helping keep our community clean!</p>
                            </div>
                        `;

                        // C. Send Emails (in parallel)
                        await Promise.all(recipients.map(to => 
                            sendEmail({
                                to,
                                subject: emailSubject,
                                html: emailHtml,
                                text: `Your report "${reportData.title}" has been resolved! Check the app for details.`
                            })
                        ));
                    }
                } catch (emailError) {
                    // Log but do not fail the request if emails fail
                    console.error("Failed to send resolution emails:", emailError);
                }
                // --- EMAIL NOTIFICATION LOGIC END ---

                return res.status(200).json({
                    success: true,
                    message: "Report resolved successfully.",
                    data: { confidence, reasoning }
                });

            } else {
                return res.status(422).json({
                    success: false,
                    errorType: "LOW_CONFIDENCE",
                    message: "AI Verification Failed: The image does not clearly show the waste has been removed.",
                    confidence: confidence,
                    reasoning: reasoning 
                });
            }
        } else {
            return res.status(500).json({
                success: false,
                message: "AI Service failed to analyze images."
            });
        }

    } catch (error) {
        console.error("Error in resolveWasteReports:", error.message);
        if (error.response) {
            return res.status(error.response.status).json({
                success: false,
                message: "External AI Service Error",
                details: error.response.data
            });
        }

        return res.status(500).json({
            success: false,
            message: "Internal Server Error"
        });
    }
};