module.exports = {

    create: {

        body: {

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

        }

    },

    update: {

        body: {

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

        }

    },

    search: {

        query: {

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

    }

};