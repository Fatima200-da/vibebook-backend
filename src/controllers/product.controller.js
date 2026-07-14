const prisma = require("../config/prisma");
const logAction = require("../utils/auditLogger");

// =======================
// GET ALL PRODUCTS
// Pagination + Search + Sort
// =======================

exports.getProducts = async (req, res) => {

    try {


        let {
            page = 1,
            limit = 20,
            search = "",
            sort = "newest"
        } = req.query;



        page = Number(page);
        limit = Number(limit);



        if (page < 1) page = 1;

        if (limit < 1) limit = 20;

        if (limit > 100) limit = 100;



        const skip = (page - 1) * limit;



        let orderBy = {
            created_at: "desc"
        };



        if(sort === "price_asc"){

            orderBy = {
                price:"asc"
            };

        }



        if(sort === "price_desc"){

            orderBy = {
                price:"desc"
            };

        }




        const where = {

    is_deleted: false

};

if (search) {

    where.OR = [

        {
            title: {
                contains: search,
                mode: "insensitive"
            }
        },

        {
            description: {
                contains: search,
                mode: "insensitive"
            }
        }

    ];

}





        const products = await prisma.products.findMany({

            where,

            skip,

            take:limit,

            orderBy,


            include:{

                categories:true

            }

        });





        const total = await prisma.products.count({

            where

        });





        return res.json({

            success:true,

            total,

            page,

            limit,

            pages:Math.ceil(total / limit),

            data:products

        });



    } catch(error){


        return res.status(500).json({

            success:false,

            message:error.message

        });


    }

};





// =======================
// GET PRODUCT BY ID
// =======================

exports.getProduct = async(req,res)=>{


    try{

const product = await prisma.products.findFirst({

    where:{

        id:req.params.id,

        is_deleted:false

    },

    include:{
        categories:true
    }

});





        if(!product){


            return res.status(404).json({

                success:false,

                message:"Product not found"

            });


        }





        res.json({

            success:true,

            data:product

        });



    }catch(error){


        res.status(500).json({

            success:false,

            message:error.message

        });


    }


};







// =======================
// CREATE PRODUCT
// =======================

exports.createProduct = async(req,res)=>{


    try{


        const {

            category_id,
            title,
            description,
            price,
            cover_type,
            min_pages,
            max_pages,
            image

        } = req.body;





        const product = await prisma.products.create({

            data:{


                category_id,

                title,

                description,


                price:Number(price),


                cover_type,


                min_pages:Number(min_pages),


                max_pages:Number(max_pages),


                image:req.file
                    ? `uploads/products/${req.file.filename}`
                    : image


            }


        });
        await logAction({

    adminId: req.user.id,

    action: "CREATE_PRODUCT",

    entity: "PRODUCT",

    entityId: product.id,

    details: {

        title: product.title,

        price: product.price

    }

});




        res.status(201).json({

            success:true,

            data:product

        });



    }catch(error){


        res.status(500).json({

            success:false,

            message:error.message

        });


    }


};







// =======================
// UPDATE PRODUCT
// =======================

exports.updateProduct = async(req,res)=>{


    try{


        const data = {};



        if(req.body.category_id)
            data.category_id=req.body.category_id;



        if(req.body.title)
            data.title=req.body.title;



        if(req.body.description)
            data.description=req.body.description;



        if(req.body.price !== undefined)
            data.price=Number(req.body.price);



        if(req.body.cover_type)
            data.cover_type=req.body.cover_type;



        if(req.body.min_pages !== undefined)
            data.min_pages=Number(req.body.min_pages);



        if(req.body.max_pages !== undefined)
            data.max_pages=Number(req.body.max_pages);





        if(req.file){

            data.image =
            `uploads/products/${req.file.filename}`;

        }





        const product = await prisma.products.update({

            where:{
                id:req.params.id
            },


            data

        });
        await logAction({

    adminId: req.user.id,

    action: "UPDATE_PRODUCT",

    entity: "PRODUCT",

    entityId: product.id,

    details: {

        title: product.title

    }

});




        res.json({

            success:true,

            data:product

        });




    }catch(error){


        res.status(500).json({

            success:false,

            message:error.message

        });


    }


};







// =======================
// SOFT DELETE PRODUCT
// =======================

exports.deleteProduct = async (req, res) => {

    try {

        const product = await prisma.products.findUnique({

            where: {
                id: req.params.id
            }

        });

        if (!product) {

            return res.status(404).json({

                success: false,

                message: "Product not found"

            });

        }

        if (product.is_deleted) {

            return res.status(400).json({

                success: false,

                message: "Product already deleted"

            });

        }

        await prisma.products.update({

            where: {
                id: req.params.id
            },

            data: {

                is_deleted: true

            }

        });
        await logAction({

    adminId: req.user.id,

    action: "DELETE_PRODUCT",

    entity: "PRODUCT",

    entityId: product.id,

    details: {

        title: product.title

    }

});

        return res.json({

            success: true,

            message: "Product moved to trash"

        });

    }

    catch (error) {

        return res.status(500).json({

            success: false,

            message: error.message

        });

    }

};






// =======================
// SEARCH PRODUCTS
// Filter + Pagination + Sort
// =======================

exports.searchProducts = async(req,res)=>{


    try{


        let {

            q,

            category,

            priceFrom,

            priceTo,

            page=1,

            limit=20,

            sort="newest"


        } = req.query;





        page=Number(page);

        limit=Number(limit);




        if(limit > 100)
            limit=100;





        const where = {

    is_deleted: false

};



        if(q){

            where.OR=[

                {
                    title:{
                        contains:q,
                        mode:"insensitive"
                    }
                },

                {
                    description:{
                        contains:q,
                        mode:"insensitive"
                    }
                }

            ];

        }





        if(category){


            where.categories={

                name:category

            };


        }






        if(priceFrom || priceTo){


            where.price={};


            if(priceFrom)
                where.price.gte=Number(priceFrom);



            if(priceTo)
                where.price.lte=Number(priceTo);


        }






        let orderBy={
            created_at:"desc"
        };




        if(sort==="price_asc")
            orderBy={price:"asc"};



        if(sort==="price_desc")
            orderBy={price:"desc"};






        const products = await prisma.products.findMany({

            where,

            orderBy,


            skip:(page-1)*limit,


            take:limit,


            include:{
                categories:true
            }


        });





        const total = await prisma.products.count({

            where

        });





        res.json({

            success:true,

            total,

            page,

            limit,

            pages:Math.ceil(total/limit),

            data:products

        });





    }catch(error){


        res.status(500).json({

            success:false,

            message:error.message

        });


    }


};
// =======================
// RESTORE PRODUCT
// =======================

exports.restoreProduct = async (req, res) => {

    try {

        const product = await prisma.products.findUnique({

            where: {

                id: req.params.id

            }

        });

        if (!product) {

            return res.status(404).json({

                success: false,

                message: "Product not found"

            });

        }

        if (!product.is_deleted) {

            return res.status(400).json({

                success: false,

                message: "Product is already active"

            });

        }

        const restored = await prisma.products.update({

            where: {

                id: req.params.id

            },

            data: {

                is_deleted: false

            }

        });
        await logAction({

    adminId: req.user.id,

    action: "RESTORE_PRODUCT",

    entity: "PRODUCT",

    entityId: restored.id,

    details: {

        title: restored.title

    }

});

        return res.json({

            success: true,

            message: "Product restored successfully",

            data: restored

        });

    }

    catch (error) {

        return res.status(500).json({

            success: false,

            message: error.message

        });

    }

};
// =======================
// GET TRASH PRODUCTS
// =======================

exports.getTrashProducts = async (req, res) => {

    try {

        let {

            page = 1,

            limit = 20

        } = req.query;

        page = Number(page);
        limit = Number(limit);

        if (page < 1) page = 1;
        if (limit < 1) limit = 20;
        if (limit > 100) limit = 100;

        const skip = (page - 1) * limit;

        const products = await prisma.products.findMany({

            where: {

                is_deleted: true

            },

            include: {

                categories: true

            },

            orderBy: {

                created_at: "desc"

            },

            skip,

            take: limit

        });

        const total = await prisma.products.count({

            where: {

                is_deleted: true

            }

        });

        return res.json({

            success: true,

            total,

            page,

            limit,

            pages: Math.ceil(total / limit),

            data: products

        });

    }

    catch (error) {

        return res.status(500).json({

            success: false,

            message: error.message

        });

    }

};