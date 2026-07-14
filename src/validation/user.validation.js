module.exports = {

    // =========================
    // GET USERS
    // =========================

    list: {

        query: {

            number: [
                "page",
                "limit"
            ],

            min: {
                page: 1,
                limit: 1
            }

        }

    },



    // =========================
    // SEARCH USERS
    // =========================

    search: {

        query: {

            number: [
                "page",
                "limit"
            ],

            min: {
                page: 1,
                limit: 1
            },

            maxLength: {
                q: 100
            }

        }

    }

};