const prisma = require("../config/prisma");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");



// =======================
// CREATE TOKEN
// =======================

const generateToken = (user) => {


    return jwt.sign(

        {
            id: user.id,
            email: user.email,
            role: user.role
        },

        process.env.JWT_SECRET,

        {
            expiresIn: "7d"
        }

    );

};





// =======================
// REGISTER
// =======================

exports.register = async (req, res) => {


    try {


        const {
            full_name,
            email,
            phone,
            password
        } = req.body;




        if (
            !full_name ||
            !email ||
            !password
        ) {


            return res.status(400).json({

                success:false,

                message:"Full name, email and password are required"

            });


        }





        const userExists = await prisma.users.findUnique({

            where:{
                email
            }

        });




        if(userExists){


            return res.status(400).json({

                success:false,

                message:"Email already exists"

            });


        }





        const hashedPassword = await bcrypt.hash(

            password,

            10

        );





        const user = await prisma.users.create({

            data:{


                full_name,

                email,

                phone,

                password:hashedPassword,

                role:"USER"


            }

        });





        return res.status(201).json({

            success:true,

            message:"Registration completed successfully",

            data:{


                id:user.id,

                full_name:user.full_name,

                email:user.email,

                role:user.role


            }


        });




    } catch(error){



        return res.status(500).json({

            success:false,

            message:"Registration failed"

        });


    }


};







// =======================
// LOGIN
// =======================

exports.login = async (req,res)=>{


    try{


        const {
            email,
            password
        } = req.body;


        if(!email || !password){


            return res.status(400).json({

                success:false,

                message:"Email and password are required"

            });


        }



        const user = await prisma.users.findUnique({

            where:{
                email
            }

        });





        if(!user){


            return res.status(401).json({

                success:false,

                message:"Invalid email or password"

            });


        }





        const match = await bcrypt.compare(

            password,

            user.password

        );





        if(!match){


            return res.status(401).json({

                success:false,

                message:"Invalid email or password"

            });


        }





        const token = generateToken(user);





        return res.json({

            success:true,

            token,


            user:{


                id:user.id,

                full_name:user.full_name,

                email:user.email,

                role:user.role


            }


        });




    }catch(error){


        return res.status(500).json({

            success:false,

            message:"Login failed"

        });


    }


};







// =======================
// ADMIN LOGIN
// =======================

exports.adminLogin = async(req,res)=>{


    try{


        const {
            email,
            password
        } = req.body;





        const admin = await prisma.admin_users.findUnique({

            where:{
                email
            }

        });





        if(!admin){


            return res.status(401).json({

                success:false,

                message:"Invalid email or password"

            });


        }





        const match = await bcrypt.compare(

            password,

            admin.password

        );





        if(!match){


            return res.status(401).json({

                success:false,

                message:"Invalid email or password"

            });


        }





        const token = generateToken(admin);





        return res.json({

            success:true,

            token,


            admin:{


                id:admin.id,

                full_name:admin.full_name,

                email:admin.email,

                role:admin.role


            }


        });





    }catch(error){



        return res.status(500).json({

            success:false,

            message:"Admin login failed"

        });


    }


};