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


// Phase 25D fix: the photos table was redesigned to page_id/url/position
// (a JSON blob) at some point, but this endpoint was never updated to
// match - every call, from any authorized caller, threw a raw Prisma
// validation error trying to write album_page_id/image_url/x/y/width/
// height/rotation/scale/opacity, none of which exist as real columns.
// Field names below (url, x/y/width/height/rotation) now match what
// album.controller.js's bulk album-save already accepts for a photo, so
// this endpoint and the bulk-save flow share one consistent input shape.
const {

url,
x,
y,
width,
height,
rotation

}=req.body;



const photo = await prisma.photos.create({

data:{


page_id:id,

url:url || null,

position:{
  x: Number(x) || 0,
  y: Number(y) || 0,
  width: Number(width) || 0,
  height: Number(height) || 0,
  rotation: Number(rotation) || 0,
  crop: null,
  zIndex: 0,
  visible: true,
  locked: false,
  name: null,
  groupId: null,
}


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

// Phase 25D.1: data: req.body was a mass-assignment hole - any field a
// caller sent (page_id, id, created_at, ...) was written straight through
// to Prisma. page_id in particular would have let an owner of photo X
// reassign it onto ANY page id they could guess/know, including one they
// don't own - the ownership check above only validates the photo being
// updated, never the destination the request is trying to move it to.
// No frontend caller of this endpoint exists (confirmed by search), so
// there's no real payload shape to preserve - the allow-list mirrors
// addPhoto's already-fixed contract instead, so both endpoints in this
// family agree on the same input shape.
const PROTECTED_FIELDS = ["id", "page_id", "user_id", "album_id", "owner_id", "created_at", "updated_at"];
const sentProtectedFields = PROTECTED_FIELDS.filter((field) => req.body[field] !== undefined);

if (sentProtectedFields.length > 0) {
  return res.status(400).json({
    success: false,
    message: `Cannot modify protected field(s): ${sentProtectedFields.join(", ")}`,
  });
}

const { url, x, y, width, height, rotation, crop, zIndex, visible, locked, name, groupId } = req.body;

const data = {};

if (url !== undefined) {
  data.url = url === null ? null : String(url);
}

// position is stored as one JSON blob (see schema.prisma) - a partial
// update here must merge onto the EXISTING position object rather than
// replace it outright, or updating just `x`/`y` during a drag would
// silently wipe out `crop`/`name`/`groupId` etc. that weren't part of
// this particular request.
const positionFieldsProvided = [x, y, width, height, rotation, crop, zIndex, visible, locked, name, groupId]
  .some((v) => v !== undefined);

if (positionFieldsProvided) {

  const existingPosition = (ownership.photo.position && typeof ownership.photo.position === "object")
    ? ownership.photo.position
    : {};

  data.position = { ...existingPosition };

  if (x !== undefined) data.position.x = Number(x) || 0;
  if (y !== undefined) data.position.y = Number(y) || 0;
  if (width !== undefined) data.position.width = Number(width) || 0;
  if (height !== undefined) data.position.height = Number(height) || 0;
  if (rotation !== undefined) data.position.rotation = Number(rotation) || 0;
  if (zIndex !== undefined) data.position.zIndex = Number.isFinite(Number(zIndex)) ? Number(zIndex) : 0;
  if (visible !== undefined) data.position.visible = Boolean(visible);
  if (locked !== undefined) data.position.locked = Boolean(locked);
  if (name !== undefined) data.position.name = typeof name === "string" ? name : null;
  if (groupId !== undefined) data.position.groupId = typeof groupId === "string" ? groupId : null;

  if (crop !== undefined) {
    data.position.crop = (crop && typeof crop === "object")
      ? {
          x: Number(crop.x) || 0,
          y: Number(crop.y) || 0,
          width: Number(crop.width) || 1,
          height: Number(crop.height) || 1,
        }
      : null;
  }

}

const photo = await prisma.photos.update({

where:{
id
},

data

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
