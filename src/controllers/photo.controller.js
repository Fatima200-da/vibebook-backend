const prisma = require("../config/prisma");

// Resolves a page id to its owning album and enforces the same ownership
// rule as album.controller.js (USER role must own the album; ADMIN/SUPER_ADMIN
// unrestricted). Returns { deniedStatus, deniedMessage } on failure so callers
// can short-circuit with a single early return, or { page } on success.
async function assertPageOwnership(pageId, req) {
  const page = await prisma.album_pages.findUnique({
    where: { id: pageId },
    include: { album: true },
  });

  if (!page) {
    return { deniedStatus: 404, deniedMessage: "Page tapılmadı" };
  }

  if (req.user.role === "USER" && page.album.user_id !== req.user.id) {
    return { deniedStatus: 403, deniedMessage: "Access denied" };
  }

  return { page };
}

// Resolves a photo id to its owning album (via its page) and enforces the
// same ownership rule.
async function assertPhotoOwnership(photoId, req) {
  const photo = await prisma.photos.findUnique({
    where: { id: photoId },
    include: { page: { include: { album: true } } },
  });

  if (!photo) {
    return { deniedStatus: 404, deniedMessage: "Photo tapılmadı" };
  }

  if (req.user.role === "USER" && photo.page.album.user_id !== req.user.id) {
    return { deniedStatus: 403, deniedMessage: "Access denied" };
  }

  return { photo };
}


// ADD PHOTO

exports.addPhoto = async(req,res)=>{


try{


const {id}=req.params;

const ownership = await assertPageOwnership(id, req);
if (ownership.deniedStatus) {
  return res.status(ownership.deniedStatus).json({
    success: false,
    message: ownership.deniedMessage,
  });
}


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

const ownership = await assertPhotoOwnership(id, req);
if (ownership.deniedStatus) {
  return res.status(ownership.deniedStatus).json({
    success: false,
    message: ownership.deniedMessage,
  });
}


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


const ownership = await assertPhotoOwnership(req.params.id, req);
if (ownership.deniedStatus) {
  return res.status(ownership.deniedStatus).json({
    success: false,
    message: ownership.deniedMessage,
  });
}

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
