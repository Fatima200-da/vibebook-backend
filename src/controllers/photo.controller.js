const prisma = require("../config/prisma");


// =======================
// ADD PHOTO TO PAGE
// =======================

exports.addPhoto = async (req, res) => {

    try {

        const {
            image_url,
            x,
            y,
            width,
            height,
            rotation
        } = req.body;


        const photo = await prisma.photos.create({

            data: {

                album_page_id: req.params.id,

                image_url,

                x,
                y,
                width,
                height,

                rotation: rotation || 0

            }

        });


        res.status(201).json({

            success: true,
            data: photo

        });


    } catch (err) {

        console.log(err);

        res.status(500).json({

            success: false,
            message: err.message

        });

    }

};




// =======================
// UPDATE PHOTO
// =======================

exports.updatePhoto = async (req, res) => {

    try {


        const photo = await prisma.photos.update({

            where: {
                id: req.params.id
            },


            data: req.body

        });



        res.json({

            success:true,

            data:photo

        });



    } catch(err) {


        console.log(err);


        res.status(500).json({

            success:false,

            message:err.message

        });

    }

};




// =======================
// DELETE PHOTO
// =======================

exports.deletePhoto = async(req,res)=>{

    try{


        await prisma.photos.delete({

            where:{
                id:req.params.id
            }

        });


        res.json({

            success:true,

            message:"Şəkil silindi"

        });



    }catch(err){

        console.log(err);

        res.status(500).json({

            success:false,

            message:err.message

        });

    }

};