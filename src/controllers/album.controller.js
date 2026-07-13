const prisma = require("../config/prisma");


// =======================
// CREATE ALBUM
// =======================

exports.createAlbum = async (req, res) => {

    try {

        const {
            product_id,
            title,
            total_pages
        } = req.body;


        const album = await prisma.albums.create({

            data: {

                user_id: req.user.id,

                product_id,

                title,

                total_pages: Number(total_pages),

                status: "Draft"

            }

        });


        res.status(201).json({

            success: true,

            data: album

        });


    } catch (err) {

        console.log(err);


        res.status(500).json({

            success:false,

            message:err.message

        });

    }

};




// =======================
// GET ALBUM BY ID
// =======================

exports.getAlbum = async (req,res)=>{

    try{


        const album = await prisma.albums.findUnique({

            where:{
                id:req.params.id
            },


            include:{


                products:true,

                covers:true,

                templates:true,


                album_pages:{


                    orderBy:{
                        page_number:"asc"
                    },


                    include:{


                        photos:true,

                        text_layers:true


                    }


                }


            }


        });



        if(!album){

            return res.status(404).json({

                success:false,

                message:"Album tapılmadı"

            });

        }



        res.json({

            success:true,

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




// =======================
// UPDATE ALBUM
// =======================

exports.updateAlbum = async(req,res)=>{


    try{


        const album = await prisma.albums.update({


            where:{

                id:req.params.id

            },


            data:req.body


        });



        res.json({

            success:true,

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




// =======================
// DELETE ALBUM
// =======================

exports.deleteAlbum = async(req,res)=>{


    try{


        await prisma.albums.delete({

            where:{

                id:req.params.id

            }

        });



        res.json({

            success:true,

            message:"Album silindi"

        });



    }catch(err){


        console.log(err);


        res.status(500).json({

            success:false,

            message:err.message

        });


    }


};




// =======================
// DUPLICATE ALBUM
// =======================

exports.duplicateAlbum = async(req,res)=>{


    try{


        const oldAlbum = await prisma.albums.findUnique({


            where:{

                id:req.params.id

            },


            include:{


                album_pages:{


                    include:{


                        photos:true,

                        text_layers:true


                    }


                }


            }


        });



        if(!oldAlbum){


            return res.status(404).json({

                success:false,

                message:"Album tapılmadı"

            });


        }



        const newAlbum = await prisma.albums.create({


            data:{


                user_id:oldAlbum.user_id,

                product_id:oldAlbum.product_id,

                cover_id:oldAlbum.cover_id,

                template_id:oldAlbum.template_id,

                title:oldAlbum.title + " Copy",

                total_pages:oldAlbum.total_pages,

                status:"Draft"


            }


        });



        for(const page of oldAlbum.album_pages){


            const newPage = await prisma.album_pages.create({


                data:{


                    album_id:newAlbum.id,

                    page_number:page.page_number,

                    background:page.background


                }


            });



            for(const photo of page.photos){


                await prisma.photos.create({


                    data:{


                        album_page_id:newPage.id,

                        image_url:photo.image_url,

                        x:photo.x,

                        y:photo.y,

                        width:photo.width,

                        height:photo.height,

                        rotation:photo.rotation,

                        scale:photo.scale,

                        opacity:photo.opacity,

                        z_index:photo.z_index


                    }


                });


            }



            for (const text of page.text_layers) {

    await prisma.text_layers.create({

        data: {

            album_page_id: newPage.id,

            content: text.content,

            font: text.font,

            color: text.color,

            size: text.size,

            x: text.x,

            y: text.y,

            rotation: text.rotation,

            font_weight: text.font_weight,

            alignment: text.alignment,

            line_height: text.line_height,

            letter_spacing: text.letter_spacing

        }

    });

}


        }



        res.json({

            success:true,

            message:"Album uğurla kopyalandı",

            data:newAlbum

        });



    }catch(err){


        console.log(err);


        res.status(500).json({

            success:false,

            message:err.message

        });


    }


};




// ===============================
// ALBUM PREVIEW
// ===============================

exports.previewAlbum = async (req, res) => {

    try {

        const { id } = req.params;


        const album = await prisma.albums.findUnique({

            where:{
                id
            },

            include:{


                products:true,

                covers:true,

                templates:true,


                album_pages:{


                    orderBy:{
                        page_number:"asc"
                    },


                    include:{


                        photos:true,


                        text_layers:true


                    }


                }


            }


        });



        if(!album){

            return res.status(404).json({

                success:false,

                message:"Album tapılmadı"

            });

        }



        return res.json({

            success:true,

            data:album

        });



    } catch(error){


        console.log(error);


        return res.status(500).json({

            success:false,

            message:error.message

        });


    }


};
// =======================
// UNDO
// =======================

exports.undoAlbum = async(req,res)=>{


    res.json({

        success:true,

        message:"Undo uğurla icra olundu",

        albumId:req.params.id

    });


};




// =======================
// REDO
// =======================

exports.redoAlbum = async(req,res)=>{


    res.json({

        success:true,

        message:"Redo uğurla icra olundu",

        albumId:req.params.id

    });


};