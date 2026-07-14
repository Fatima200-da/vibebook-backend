const prisma = require("../config/prisma");


// ADD TEXT

exports.addText = async(req,res)=>{


try{


const {id}=req.params;


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