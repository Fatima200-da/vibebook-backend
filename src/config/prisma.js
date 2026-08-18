const { PrismaClient } = require("@prisma/client");

// errorFormat: "minimal" strips Prisma's pretty-printed code frames (which
// otherwise include the calling controller's absolute file path and source
// lines) from error.message - controllers across this app forward
// err.message straight to API responses, so this is what keeps an unexpected
// Prisma error from leaking filesystem paths/internals to the client.
const basePrisma = new PrismaClient({ errorFormat: "minimal" });

// A DB connection/auth failure (wrong credentials, DB unreachable) throws a
// PrismaClientInitializationError whose own message includes the actual DB
// username - e.g. "Authentication failed ... credentials for `vibebook_user`
// are not valid." Every controller in this app catches its own errors and
// sends err.message straight back to the client, so without this, a
// misconfigured or down database would leak a real DB credential in an API
// response. $extends wraps every query centrally, so no controller needs to
// change to be safe.
const prisma = basePrisma.$extends({
    query: {
        async $allOperations({ operation, model, args, query }) {
            try {
                return await query(args);
            } catch (err) {
                if (err?.name === "PrismaClientInitializationError") {
                    err.message = "Database connection failed";
                }
                throw err;
            }
        }
    }
});

module.exports = prisma;