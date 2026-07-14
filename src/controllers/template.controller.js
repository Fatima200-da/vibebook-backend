const prisma = require("../config/prisma");


// ===============================
// APPLY TEMPLATE TO ALBUM
// ===============================

exports.applyTemplate = async (req, res) => {

    try {

        const { id } = req.params;
        const { album_id } = req.body;


        if (!album_id) {
            return res.status(400).json({
                success:false,
                message:"album_id tələb olunur"
            });
        }



        // ===============================
        // FIND TEMPLATE
        // ===============================

        const template = await prisma.templates.findUnique({

            where:{
                id
            }

        });



        if(!template){

            return res.status(404).json({

                success:false,
                message:"Template tapılmadı"

            });

        }



        // ===============================
        // FIND ALBUM
        // ===============================

        const album = await prisma.albums.findUnique({

            where:{
                id:album_id
            }

        });



        if(!album){

            return res.status(404).json({

                success:false,
                message:"Album tapılmadı"

            });

        }




        // ===============================
        // DELETE OLD CONTENT
        // ===============================


        const pages = await prisma.album_pages.findMany({

            where:{
                album_id
            },

            select:{
                id:true
            }

        });



        const pageIds = pages.map(
            page => page.id
        );



        if(pageIds.length){


            await prisma.photos.deleteMany({

                where:{
                    album_page_id:{
                        in:pageIds
                    }
                }

            });



            await prisma.text_layers.deleteMany({

                where:{
                    album_page_id:{
                        in:pageIds
                    }
                }

            });



            await prisma.album_pages.deleteMany({

                where:{
                    id:{
                        in:pageIds
                    }
                }

            });


        }





        // ===============================
        // UPDATE ALBUM TEMPLATE
        // ===============================


        await prisma.albums.update({

            where:{
                id:album_id
            },


            data:{

                template_id:id

            }

        });





        // ===============================
        // TEMPLATE JSON
        // ===============================


        const json = template.json_data || {};



        const pagesCount = json.pages || 0;





        // ===============================
        // CREATE NEW PAGES
        // ===============================


        for(let pageNumber = 1; pageNumber <= pagesCount; pageNumber++){


            const page = await prisma.album_pages.create({

                data:{

                    album_id,

                    page_number:pageNumber,

                    background:
                    json.background || null

                }

            });





            // ===============================
            // CREATE ELEMENTS
            // ===============================


            const elements = json.elements || [];



            for(const element of elements){



                // PHOTO


                if(element.type === "photo"){


                    await prisma.photos.create({

                        data:{


                            album_page_id:page.id,


                            image_url:
                            element.image_url || "",


                            x:
                            element.x || 0,


                            y:
                            element.y || 0,


                            width:
                            element.width || 100,


                            height:
                            element.height || 100,


                            rotation:
                            element.rotation || 0,


                            scale:
                            element.scale || 1,


                            opacity:
                            element.opacity || 1,


                            z_index:
                            element.z_index || 0


                        }

                    });


                }





                // TEXT


                if(element.type === "text"){


                    await prisma.text_layers.create({

                        data:{


                            album_page_id:page.id,


                            content:
                            element.content || "",


                            font:
                            element.font || "Arial",


                            color:
                            element.color || "#000000",


                            size:
                            element.size || 20,


                            x:
                            element.x || 0,


                            y:
                            element.y || 0,


                            rotation:
                            element.rotation || 0


                        }

                    });


                }



            }



        }





        return res.json({

            success:true,

            message:"Template uğurla tətbiq edildi",

            album_id,

            template_id:id,

            pages_created:pagesCount


        });



    }



    catch(error){


        console.log(error);



        return res.status(500).json({

            success:false,

            message:error.message

        });


    }


};
// ===============================
// GET ALL TEMPLATES
// ===============================

exports.getTemplates = async (req,res)=>{

    try{

        const templates = await prisma.templates.findMany({
            orderBy:{
                created_at:"desc"
            }
        });


        res.json({

            success:true,
            data:templates

        });


    }catch(error){

        res.status(500).json({

            success:false,
            message:error.message

        });

    }

};




// ===============================
// GET TEMPLATE BY ID
// ===============================

exports.getTemplateById = async(req,res)=>{


    try{


        const template = await prisma.templates.findUnique({

            where:{
                id:req.params.id
            }

        });



        if(!template){

            return res.status(404).json({

                success:false,
                message:"Template tapılmadı"

            });

        }



        res.json({

            success:true,
            data:template

        });



    }catch(error){

        res.status(500).json({

            success:false,
            message:error.message

        });

    }


};