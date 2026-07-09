exports.uploadFile = async (req, res) => {

    try {

        if (!req.file) {

            return res.status(400).json({

                success: false,
                message: "Fayl seçilməyib"

            });

        }

        res.json({

            success: true,

            message: "Şəkil uğurla yükləndi",

            data: {

                filename: req.file.filename,

                path: "uploads/" + req.file.filename,

                originalname: req.file.originalname,

                size: req.file.size,

                mimetype: req.file.mimetype

            }

        });

    } catch (err) {

        console.log(err);

        res.status(500).json({

            success: false,
            message: err.message

        });

    }

};