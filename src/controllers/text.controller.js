const prisma = require("../config/prisma");

// ======================
// ADD TEXT
// ======================

exports.addText = async (req, res) => {

    try {

        const {
            content,
            font,
            color,
            size,
            x,
            y,
            rotation,
            font_weight,
            alignment,
            line_height,
            letter_spacing
        } = req.body;

        const text = await prisma.text_layers.create({

            data: {

                album_page_id: req.params.id,

                content,

                font,

                color,

                size,

                x,

                y,

                rotation: rotation ?? 0,

                font_weight: font_weight ?? "normal",

                alignment: alignment ?? "left",

                line_height: line_height ?? 1.2,

                letter_spacing: letter_spacing ?? 0

            }

        });

        res.status(201).json({

            success: true,
            data: text

        });

    } catch (err) {

        console.log(err);

        res.status(500).json({

            success: false,
            message: err.message

        });

    }

};

// ======================
// UPDATE TEXT
// ======================

exports.updateText = async (req, res) => {

    try {

        const text = await prisma.text_layers.update({

            where: {

                id: req.params.id

            },

            data: req.body

        });

        res.json({

            success: true,
            data: text

        });

    } catch (err) {

        console.log(err);

        res.status(500).json({

            success: false,
            message: err.message

        });

    }

};

// ======================
// DELETE TEXT
// ======================

exports.deleteText = async (req, res) => {

    try {

        await prisma.text_layers.delete({

            where: {

                id: req.params.id

            }

        });

        res.json({

            success: true,
            message: "Text silindi."

        });

    } catch (err) {

        console.log(err);

        res.status(500).json({

            success: false,
            message: err.message

        });

    }

};