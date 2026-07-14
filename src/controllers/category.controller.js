const prisma = require("../config/prisma");


// =======================
// GET ALL CATEGORIES
// Pagination + Search + Sort
// =======================

exports.getCategories = async (req, res) => {

    try {


        let {
            page = 1,
            limit = 20,
            search = "",
            sort = "newest"
        } = req.query;



        page = Number(page);
        limit = Number(limit);



        if(page < 1)
            page = 1;


        if(limit < 1)
            limit = 20;


        if(limit > 100)
            limit = 100;




        const skip = (page - 1) * limit;




        let orderBy = {

            created_at:"desc"

        };



        if(sort === "oldest"){

            orderBy = {

                created_at:"asc"

            };

        }





        const where = search ? {

            name:{

                contains:search,

                mode:"insensitive"

            }

        } : {};







        const categories = await prisma.categories.findMany({

            where,


            skip,


            take:limit,


            orderBy,



            include:{

                products:true

            }


        });







        const total = await prisma.categories.count({

            where

        });







        res.json({

            success:true,

            total,

            page,

            limit,

            pages:Math.ceil(total / limit),

            data:categories


        });






    } catch(error){


        res.status(500).json({

            success:false,

            message:error.message

        });


    }


};







// =======================
// GET CATEGORY BY ID
// =======================

exports.getCategory = async(req,res)=>{


    try{


        const category = await prisma.categories.findUnique({

            where:{

                id:req.params.id

            },


            include:{

                products:true

            }


        });





        if(!category){


            return res.status(404).json({

                success:false,

                message:"Category not found"

            });


        }





        res.json({

            success:true,

            data:category

        });





    }catch(error){


        res.status(500).json({

            success:false,

            message:error.message

        });


    }


};







// =======================
// CREATE CATEGORY
// =======================

exports.createCategory = async(req,res)=>{


    try{


        const {
            name,
            image
        } = req.body;





        const exists = await prisma.categories.findFirst({

            where:{

                name:{
                    equals:name,
                    mode:"insensitive"
                }

            }

        });






        if(exists){


            return res.status(400).json({

                success:false,

                message:"Category already exists"

            });


        }






        const category = await prisma.categories.create({

            data:{


                name,


                image:req.file
                ? `uploads/categories/${req.file.filename}`
                : image


            }


        });







        res.status(201).json({

            success:true,

            data:category

        });






    }catch(error){


        res.status(500).json({

            success:false,

            message:error.message

        });


    }


};







// =======================
// UPDATE CATEGORY
// =======================

exports.updateCategory = async(req,res)=>{


    try{


        const data={};




        if(req.body.name){

            data.name=req.body.name;

        }



        if(req.file){

            data.image =
            `uploads/categories/${req.file.filename}`;

        }

        else if(req.body.image){

            data.image=req.body.image;

        }





        const category = await prisma.categories.update({

            where:{

                id:req.params.id

            },


            data


        });






        res.json({

            success:true,

            data:category

        });






    }catch(error){


        res.status(500).json({

            success:false,

            message:error.message

        });


    }


};







// =======================
// DELETE CATEGORY
// =======================

exports.deleteCategory = async(req,res)=>{


    try{


        await prisma.categories.delete({

            where:{

                id:req.params.id

            }

        });






        res.json({

            success:true,

            message:"Category deleted successfully"

        });





    }catch(error){


        res.status(500).json({

            success:false,

            message:error.message

        });


    }


};