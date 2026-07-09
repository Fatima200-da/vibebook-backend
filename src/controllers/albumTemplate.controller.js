const prisma = require("../config/prisma");


// =======================
// APPLY TEMPLATE TO ALBUM
// =======================

exports.applyTemplate = async(req,res)=>{

    try{

        const {
            template_id
        } = req.body;


        const album = await prisma.albums.update({

            where:{
                id:req.params.id
            },

            data:{
                template_id
            }

        });


        res.json({

            success:true,

            message:"Template tətbiq edildi",

            data:album

        });


    }catch(err){

        console.log(err);


        res.status(500).json({

            success:false,

            message:err.message

        });

    }

};
