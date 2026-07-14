const jwt = require("jsonwebtoken");

module.exports = (req, res, next) => {

    try {

        // =========================
        // CHECK AUTH HEADER
        // =========================

        const authHeader = req.headers.authorization;

        if (!authHeader) {

            return res.status(401).json({

                success: false,

                message: "Authorization token required"

            });

        }

        // =========================
        // CHECK BEARER FORMAT
        // =========================

        const parts = authHeader.split(" ");

        if (
            parts.length !== 2 ||
            parts[0] !== "Bearer"
        ) {

            return res.status(401).json({

                success: false,

                message: "Invalid authorization format"

            });

        }

        const token = parts[1];

        if (!token) {

            return res.status(401).json({

                success: false,

                message: "Token missing"

            });

        }

        // =========================
        // CHECK SECRET
        // =========================

        if (!process.env.JWT_SECRET) {

            return res.status(500).json({

                success: false,

                message: "JWT secret is not configured"

            });

        }

        // =========================
        // VERIFY TOKEN
        // =========================

        const decoded = jwt.verify(

            token,

            process.env.JWT_SECRET,

            {

                algorithms: ["HS256"]

            }

        );

        // =========================
        // SET AUTH USER
        // =========================

        req.user = {

            id: decoded.id,

            email: decoded.email,

            role: decoded.role

        };

        next();

    }

    catch (error) {

        if (error.name === "TokenExpiredError") {

            return res.status(401).json({

                success: false,

                message: "Token expired"

            });

        }

        if (error.name === "JsonWebTokenError") {

            return res.status(401).json({

                success: false,

                message: "Invalid token"

            });

        }

        return res.status(500).json({

            success: false,

            message: "Authentication error"

        });

    }

};