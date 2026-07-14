module.exports = (err, req, res, next) => {

    console.error("========== ERROR ==========");
    console.error(err.stack);
    console.error("===========================");

    res.status(err.statusCode || 500).json({
        success: false,
        message: err.message || "Internal Server Error"
    });

};