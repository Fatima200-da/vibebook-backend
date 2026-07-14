const prisma = require("../config/prisma");


// ADD PHOTO

exports.addPhoto = async(req,res)=>{


try{


const {id}=req.params;


const {

image_url,
x,
y,
width,
height,
rotation,
scale,
opacity

}=req.body;



const photo = await prisma.photos.create({

data:{


album_page_id:id,

image_url:image_url || "",

x:x || 0,

y:y || 0,

width:width || 100,

height:height || 100,

rotation:rotation || 0,

scale:scale || 1,

opacity:opacity || 1,

z_index:0


}


});



res.json({

success:true,

message:"Photo əlavə edildi",

data:photo

});



}catch(error){

console.log(error);

res.status(500).json({

success:false,

message:error.message

});

}


};





// UPDATE PHOTO

exports.updatePhoto = async(req,res)=>{


try{


const {id}=req.params;


const photo = await prisma.photos.update({

where:{
id
},

data:req.body

});



res.json({

success:true,

data:photo

});



}catch(error){

res.status(500).json({

success:false,

message:error.message

});

}


};




// DELETE PHOTO

exports.deletePhoto = async(req,res)=>{


try{


await prisma.photos.delete({

where:{
id:req.params.id
}

});


res.json({

success:true,

message:"Photo silindi"

});



}catch(error){


res.status(500).json({

success:false,

message:error.message

});


}


};