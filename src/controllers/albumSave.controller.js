const prisma = require("../config/prisma");


// =======================
// AUTOSAVE ALBUM
// =======================

exports.saveAlbum = async(req,res)=>{

    try{


        const album = await prisma.albums.update({

            where:{
                id:req.params.id
            },


            data:req.body

        });



        res.json({

            success:true,

            message:"Album yadda saxlanıldı",

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