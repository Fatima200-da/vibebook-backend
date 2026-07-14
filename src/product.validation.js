module.exports = {

    // =========================
    // CREATE PRODUCT
    // =========================
    create: {

        required: [
            "category_id",
            "title",
            "price"
        ],

        minLength: {
            title: 3
        },

        number: [
            "price",
            "stock"
        ],

        min: {
            price: 0,
            stock: 0
        }

    },



    // =========================
    // UPDATE PRODUCT
    // =========================
    update: {

        required: [
            "title",
            "price"
        ],

        minLength: {
            title: 3
        },

        number: [
            "price",
            "stock"
        ],

        min: {
            price: 0,
            stock: 0
        }

    },



    // =========================
    // SEARCH PRODUCTS
    // =========================
    search: {

        number: [
            "page",
            "limit",
            "priceFrom",
            "priceTo"
        ],

        min: {
            page: 1,
            limit: 1,
            priceFrom: 0,
            priceTo: 0
        }

    }

};