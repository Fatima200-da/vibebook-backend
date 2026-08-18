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

// Resolves a text layer id to its owning album (via its page) and enforces
// the same ownership rule.
async function assertTextOwnership(textId, req) {
  const text = await prisma.text_layers.findUnique({
    where: { id: textId },
    include: { page: { include: { album: true } } },
  });

  if (!text) {
    return { deniedStatus: 404, deniedMessage: "Text tapılmadı" };
  }

  if (req.user.role === "USER" && text.page.album.user_id !== req.user.id) {
    return { deniedStatus: 403, deniedMessage: "Access denied" };
  }

  return { text };
}


// ADD TEXT

exports.addText = async(req,res)=>{


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

content,
font,
color,
size,
x,
y,
rotation


}=req.body;



const text = await prisma.text_layers.create({

data:{


album_page_id:id,

content:content || "",

font:font || "Arial",

color:color || "#000000",

size:size || 20,

x:x || 0,

y:y || 0,

rotation:rotation || 0


}


});



res.json({

success:true,

message:"Text əlavə edildi",

data:text

});



}catch(error){


res.status(500).json({

success:false,

message:error.message

});


}

};





// UPDATE TEXT

exports.updateText = async(req,res)=>{


try{


const ownership = await assertTextOwnership(req.params.id, req);
if (ownership.deniedStatus) {
  return res.status(ownership.deniedStatus).json({
    success: false,
    message: ownership.deniedMessage,
  });
}

const text = await prisma.text_layers.update({

where:{
id:req.params.id
},

data:req.body

});


res.json({

success:true,

data:text

});


}catch(error){

res.status(500).json({

success:false,

message:error.message

});

}


};





// DELETE TEXT

exports.deleteText = async(req,res)=>{


try{


const ownership = await assertTextOwnership(req.params.id, req);
if (ownership.deniedStatus) {
  return res.status(ownership.deniedStatus).json({
    success: false,
    message: ownership.deniedMessage,
  });
}

await prisma.text_layers.delete({

where:{
id:req.params.id
}

});


res.json({

success:true,

message:"Text silindi"

});


}catch(error){


res.status(500).json({

success:false,

message:error.message

});


}

};
