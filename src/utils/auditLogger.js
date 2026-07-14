const prisma = require("../config/prisma");

const logAction = async ({
    adminId = null,
    action,
    entity,
    entityId = null,
    details = null
}) => {

    try {

        await prisma.audit_logs.create({

            data: {

                admin_id: adminId,

                action,

                entity,

                entity_id: entityId,

                details

            }

        });

    } catch (error) {

        console.error("Audit Log Error:", error.message);

    }

};

module.exports = logAction;