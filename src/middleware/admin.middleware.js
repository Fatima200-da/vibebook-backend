module.exports = (req, res, next) => {

    try {

        if (!req.user) {

            return res.status(401).json({
                success: false,
                message: "Unauthorized."
            });

        }

        const allowedRoles = [
            "ADMIN",
            "SUPER_ADMIN"
        ];

        if (!allowedRoles.includes(req.user.role)) {

            return res.status(403).json({
                success: false,
                message: "Access denied."
            });

        }

        next();

    } catch (err) {

        console.error(err);

        return res.status(500).json({
            success: false,
            message: "Server error."
        });

    }

};