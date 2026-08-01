const prisma = require("../config/prisma");


// GET ALL COVERS
exports.getCovers = async (req, res) => {
  try {
    const page = Number(req.query.page || 1);
    const limit = 10;
    const skip = (page - 1) * limit;

    const search = req.query.search || "";

    const where = {
      name: {
        contains: search,
      },
    };

    const total = await prisma.covers.count({
      where,
    });

    const covers = await prisma.covers.findMany({
      where,
      skip,
      take: limit,
      orderBy: {
        created_at: "desc",
      },
    });

    res.json({
      success: true,
      data: covers,
      page,
      pages: Math.ceil(total / limit),
      total,
    });

  } catch (err) {
    console.log(err);

    res.status(500).json({
      success: false,
      message: err.message,
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
    name,
    image,
    type
} = req.body;

const cover = await prisma.covers.create({
    data:{
        name,
        image,
        type
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