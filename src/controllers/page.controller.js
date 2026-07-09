const prisma = require("../config/prisma");


// Create Page
exports.createPage = async (req, res) => {
  try {

    const { page_number, background } = req.body;
    const { album_id } = req.params;


    const page = await prisma.album_pages.create({
      data: {
        album_id,
        page_number,
        background
      }
    });


    res.status(201).json({
      success:true,
      data:page
    });


  } catch(err){

    console.error(err);

    res.status(500).json({
      success:false,
      message:"Server xətası"
    });
  }
};


// Get Album Pages
exports.getPages = async (req,res)=>{
  try{

    const pages = await prisma.album_pages.findMany({
      where:{
        album_id:req.params.album_id
      },
      orderBy:{
        page_number:"asc"
      }
    });


    res.json({
      success:true,
      data:pages
    });


  }catch(err){

    console.error(err);

    res.status(500).json({
      success:false,
      message:"Server xətası"
    });

  }
};