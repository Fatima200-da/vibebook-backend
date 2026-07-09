const jwt = require("jsonwebtoken");

module.exports = (req, res, next) => {

    const authHeader = req.headers.authorization;


    if (!authHeader) {
        return res.status(401).json({
            success:false,
            message:"Unauthorized"
        });
    }


   const token = authHeader.split(" ")[1];

console.log("HEADER:", authHeader);
console.log("TOKEN:", token);
console.log("SECRET:", process.env.JWT_SECRET);


    try {

        const decoded = jwt.verify(
            token,
            process.env.JWT_SECRET
        );


        req.user = decoded;


        next();


    } catch(err) {

        return res.status(401).json({
            success:false,
            message:"Invalid Token"
        });

    }
};