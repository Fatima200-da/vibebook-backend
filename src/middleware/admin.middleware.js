module.exports = (req, res, next) => {

    try {

        // =========================
        // CHECK AUTH USER
        // =========================

        if (!req.user) {

            return res.status(401).json({

                success: false,

                message: "Unauthorized"

            });

        }

        // =========================
        // CHECK ROLE
        // =========================

        const allowedRoles = [

            "ADMIN",

            "SUPER_ADMIN"

        ];

        if (

            !allowedRoles.includes(req.user.role)

        ) {

            return res.status(403).json({

                success: false,

                message: "Access denied. Admin permission required."

            });

        }

        next();

    }

    catch (error) {

        return res.status(500).json({

            success: false,

            message: "Authorization error"

        });

    }

};