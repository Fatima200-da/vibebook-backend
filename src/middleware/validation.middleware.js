module.exports = (fields = []) => {

    return (req, res, next) => {

        const errors = [];

        fields.forEach(field => {

            const value = req.body[field];

            if (
                value === undefined ||
                value === null ||
                value === ""
            ) {
                errors.push(`${field} is required`);
            }

        });

        // Email
        if (req.body.email) {

            const emailRegex =
                /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

            if (!emailRegex.test(req.body.email)) {

                errors.push("Invalid email format");

            }

        }

        // Price
        if (
            req.body.price !== undefined &&
            Number(req.body.price) < 0
        ) {

            errors.push("Price cannot be negative");

        }

        // Total Pages
        if (
            req.body.total_pages !== undefined &&
            Number(req.body.total_pages) < 1
        ) {

            errors.push("Total pages must be at least 1");

        }

        if (errors.length > 0) {

            return res.status(400).json({

                success: false,
                message: "Validation failed",
                errors

            });

        }

        next();

    };

};