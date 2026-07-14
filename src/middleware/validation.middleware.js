module.exports = (schema = {}) => {

    return (req, res, next) => {

        const errors = [];

        // =========================
        // BODY
        // =========================

        if (schema.body) {

            validate(req.body, schema.body);

        }

        // =========================
        // QUERY
        // =========================

        if (schema.query) {

            validate(req.query, schema.query);

        }

        // =========================
        // PARAMS
        // =========================

        if (schema.params) {

            validate(req.params, schema.params);

        }

        // =========================
        // VALIDATION FUNCTION
        // =========================

        function validate(data = {}, rules = {}) {

            // REQUIRED

            if (rules.required) {

                rules.required.forEach(field => {

                    if (
                        data[field] === undefined ||
                        data[field] === null ||
                        data[field] === ""
                    ) {

                        errors.push(`${field} is required`);

                    }

                });

            }

            // EMAIL

            if (rules.email) {

                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

                rules.email.forEach(field => {

                    if (
                        data[field] !== undefined &&
                        !emailRegex.test(data[field])
                    ) {

                        errors.push(`${field} is invalid`);

                    }

                });

            }

            // NUMBER

            if (rules.number) {

                rules.number.forEach(field => {

                    if (
                        data[field] !== undefined &&
                        isNaN(Number(data[field]))
                    ) {

                        errors.push(`${field} must be a number`);

                    }

                });

            }

            // INTEGER

            if (rules.integer) {

                rules.integer.forEach(field => {

                    if (
                        data[field] !== undefined &&
                        !Number.isInteger(Number(data[field]))
                    ) {

                        errors.push(`${field} must be an integer`);

                    }

                });

            }

            // MIN VALUE

            if (rules.min) {

                Object.keys(rules.min).forEach(field => {

                    if (data[field] !== undefined) {

                        const value = Number(data[field]);

                        if (
                            !isNaN(value) &&
                            value < rules.min[field]
                        ) {

                            errors.push(
                                `${field} must be at least ${rules.min[field]}`
                            );

                        }

                    }

                });

            }

            // MAX VALUE

            if (rules.max) {

                Object.keys(rules.max).forEach(field => {

                    if (data[field] !== undefined) {

                        const value = Number(data[field]);

                        if (
                            !isNaN(value) &&
                            value > rules.max[field]
                        ) {

                            errors.push(
                                `${field} must be at most ${rules.max[field]}`
                            );

                        }

                    }

                });

            }

            // MIN LENGTH

            if (rules.minLength) {

                Object.keys(rules.minLength).forEach(field => {

                    if (
                        data[field] !== undefined &&
                        String(data[field]).length < rules.minLength[field]
                    ) {

                        errors.push(
                            `${field} minimum length is ${rules.minLength[field]}`
                        );

                    }

                });

            }

            // MAX LENGTH

            if (rules.maxLength) {

                Object.keys(rules.maxLength).forEach(field => {

                    if (
                        data[field] !== undefined &&
                        String(data[field]).length > rules.maxLength[field]
                    ) {

                        errors.push(
                            `${field} maximum length is ${rules.maxLength[field]}`
                        );

                    }

                });

            }

            // ENUM

            if (rules.enum) {

                Object.keys(rules.enum).forEach(field => {

                    if (
                        data[field] !== undefined &&
                        !rules.enum[field].includes(data[field])
                    ) {

                        errors.push(`${field} is invalid`);

                    }

                });

            }

        }

        // =========================
        // RESPONSE
        // =========================

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