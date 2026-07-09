const prisma = require("../config/prisma");


// GET ALL COVERS
exports.getCovers = async (req,res)=>{
    try{

        const covers = await prisma.covers.findMany({
            include:{
                products:true
            }
        });

        res.json({
            success:true,
            data:covers
        });

    }catch(err){

        console.log(err);

        res.status(500).json({
            success:false,
            message:"Server xətası"
        });
    }
};




// GET SINGLE COVER
exports.getCoverById = async(req,res)=>{

    try{

        const cover = await prisma.covers.findUnique({
            where:{
                id:req.params.id
            }
        });


        if(!cover){

            return res.status(404).json({
                success:false,
                message:"Cover tapılmadı"
            });

        }


        res.json({
            success:true,
            data:cover
        });


    }catch(err){

        console.log(err);

        res.status(500).json({
            success:false,
            message:"Server xətası"
        });

    }

};





// CREATE COVER
exports.createCover = async(req,res)=>{

    try{

        const {
            product_id,
            title,
            image
        } = req.body;


        const cover = await prisma.covers.create({

            data:{
                product_id,
                title,
                image
            }

        });


        res.status(201).json({

            success:true,
            data:cover

        });



    }catch(err){

    console.log(err);

    res.status(500).json({
        success:false,
        message:err.message
    });

}

};





// UPDATE COVER
exports.updateCover = async(req,res)=>{

    try{


        const cover = await prisma.covers.update({

            where:{
                id:req.params.id
            },

            data:req.body

        });



        res.json({

            success:true,
            data:cover

        });



    }catch(err){

        console.log(err);

        res.status(500).json({
            success:false,
            message:"Server xətası"
        });

    }

};





// DELETE COVER
exports.deleteCover = async(req,res)=>{

    try{


        await prisma.covers.delete({

            where:{
                id:req.params.id
            }

        });



        res.json({

            success:true,
            message:"Cover silindi"

        });



    }catch(err){

        console.log(err);


        res.status(500).json({

            success:false,
            message:"Server xətası"

        });

    }

};