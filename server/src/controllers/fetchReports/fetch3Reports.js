import { db } from "../../firebaseadmin/firebaseadmin.js"; 

export const fetch3Reports = async (req, res) => {
    try {
        const userId = req.auth?.payload?.sub;
        const reportsRef = db.collectionGroup('userReports');
        
        const snapshot = await reportsRef
            .where('userId', '==', userId)
            .orderBy('createdAt', 'desc') 
            .limit(3)
            .get();

        if (snapshot.empty) {
            return res.status(200).json({ 
                success: true, 
                data: [], 
                message: "No reports found" 
            });
        }

        const latestReports = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        return res.status(200).json({
            success: true,
            data: latestReports
        });

    } catch (error) {
        console.error("Error fetching latest reports:", error);
        if (error.code === 9 || error.message.includes('requires an index')) {
            return res.status(500).json({
                message: "Missing Index",
                details: "Click the link in your server console to create the userId + createdAt index."
            });
        }
        return res.status(500).json({ 
            message: "Internal Server Error", 
            error: error.message 
        });
    }
};