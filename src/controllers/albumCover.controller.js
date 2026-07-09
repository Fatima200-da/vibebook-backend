const prisma = require("../config/prisma");


// =======================
// APPLY COVER TO ALBUM
// =======================

exports.applyCover = async (req, res) => {

    try {

        const {
            cover_id
        } = req.body;


        const album = await prisma.albums.update({

            where: {
                id: req.params.id
            },

            data: {
                cover_id
            }

        });


        res.json({

            success: true,

            message: "Cover seçildi",

            data: album

        });


    } catch(err) {

        console.log(err);


        res.status(500).json({

            success:false,

            message:err.message

        });

    }

};