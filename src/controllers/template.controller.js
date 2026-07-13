const prisma = require("../config/prisma");


// =======================
// APPLY TEMPLATE TO ALBUM
// =======================

exports.applyTemplate = async (req, res) => {

    try {

        const { id } = req.params;
        const { album_id } = req.body;


        // Find template
        const template = await prisma.templates.findUnique({

            where: {
                id
            }

        });


        if (!template) {

            return res.status(404).json({

                success: false,
                message: "Template tapılmadı"

            });

        }



        // Find album
        const album = await prisma.albums.findUnique({

            where: {
                id: album_id
            }

        });



        if (!album) {

            return res.status(404).json({

                success:false,
                message:"Album tapılmadı"

            });

        }



        // Delete old pages
        const oldPages = await prisma.album_pages.findMany({

            where:{
                album_id
            },

            select:{
                id:true
            }

        });



        const pageIds = oldPages.map(page => page.id);



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
                album_id
            }

        });



        // Update album template
        await prisma.albums.update({

            where:{
                id:album_id
            },

            data:{
                template_id:id
            }

        });



        const json = template.json_data;


        const pagesCount = json.pages || 0;



        // Create pages

        for(let i = 1; i <= pagesCount; i++){


            const newPage = await prisma.album_pages.create({

                data:{

                    album_id,

                    page_number:i,

                    background:json.background || null

                }

            });



            // Create elements

            for(const element of json.elements || []){


                if(element.type === "photo"){


                    await prisma.photos.create({

                        data:{


                            album_page_id:newPage.id,

                            image_url:"",

                            x:element.x || 0,

                            y:element.y || 0,

                            width:100,

                            height:100,

                            rotation:0,

                            scale:1,

                            opacity:1,

                            z_index:0


                        }

                    });


                }



                if(element.type === "text"){


                    await prisma.text_layers.create({

                        data:{


                            album_page_id:newPage.id,

                            content:element.content || "",

                            font:element.font || "Arial",

                            color:element.color || "#000000",

                            size:element.size || 20,

                            x:element.x || 0,

                            y:element.y || 0,

                            rotation:0


                        }

                    });


                }


            }


        }



        return res.json({

            success:true,

            message:"Template uğurla tətbiq edildi",

            album_id,

            pages_created:pagesCount

        });



    } catch(err) {


        console.log(err);


        return res.status(500).json({

            success:false,

            message:err.message

        });


    }


};