const prisma = require("../config/prisma");


// GET ALL TEMPLATES
exports.getTemplates = async (req,res)=>{

    try{

        const templates = await prisma.templates.findMany({
            include:{
                products:true
            }
        });


        res.json({
            success:true,
            data:templates
        });


    }catch(err){

        console.log(err);

        res.status(500).json({
            success:false,
            message:"Server xətası"
        });

    }

};




// GET SINGLE TEMPLATE
exports.getTemplateById = async(req,res)=>{

    try{

        const template = await prisma.templates.findUnique({

            where:{
                id:req.params.id
            },

            include:{
                products:true
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


    }catch(err){

        console.log(err);

        res.status(500).json({
            success:false,
            message:"Server xətası"
        });

    }

};





// CREATE TEMPLATE
exports.createTemplate = async(req,res)=>{

    try{

        const {
            product_id,
            title,
            thumbnail,
            json_data
        } = req.body;



        const template = await prisma.templates.create({

            data:{
                product_id,
                title,
                thumbnail,
                json_data
            }

        });



        res.status(201).json({

            success:true,
            data:template

        });



    }catch(err){

        console.log(err);

        res.status(500).json({

            success:false,
            message:err.message

        });

    }

};





// UPDATE TEMPLATE
exports.updateTemplate = async(req,res)=>{

    try{


        const template = await prisma.templates.update({

            where:{
                id:req.params.id
            },

            data:req.body

        });



        res.json({

            success:true,
            data:template

        });



    }catch(err){

        console.log(err);

        res.status(500).json({

            success:false,
            message:"Server xətası"

        });

    }

};





// DELETE TEMPLATE
exports.deleteTemplate = async(req,res)=>{

    try{


        await prisma.templates.delete({

            where:{
                id:req.params.id
            }

        });



        res.json({

            success:true,
            message:"Template silindi"

        });



    }catch(err){

        console.log(err);

        res.status(500).json({

            success:false,
            message:"Server xətası"

        });

    }

};