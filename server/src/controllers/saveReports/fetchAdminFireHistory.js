import {db} from "../../firebaseadmin/firebaseadmin.js"
export const FetchAdminFireHistory=async(req,res)=>{
    console.log("helo");
    try {
        const reportRef=db.collection('archived_reports');
        const snapshot=await reportRef.get();
        if(snapshot.empty){
            return res.status(200).json([]);
        }
        const reports=[];
        snapshot.forEach(doc=>{
            reports.push({
                _id:doc.id,
                ...doc.data()
            })
        })
        return res.status(200).json(reports);

    } catch (error) {
        console.error("Erorr Fetching admin fire History",error);
        return res.status(500).json({
            success:false,
            message:"Failed to feetch archived reports"
        })
    }

}