// Server-authoritative delivery fees. Mirrors the frontend's display copy in
// src/features/public/utils/deliveryMethods.ts, but the price here - not the
// client's - is what gets charged. Never trust a delivery fee sent by the client.
const DELIVERY_METHODS = {
    standard: 5,
    express: 15
};

const DEFAULT_DELIVERY_METHOD = "standard";

function resolveDeliveryFee(methodId) {
    if (!Object.prototype.hasOwnProperty.call(DELIVERY_METHODS, methodId)) {
        return null;
    }
    return DELIVERY_METHODS[methodId];
}

module.exports = { DELIVERY_METHODS, DEFAULT_DELIVERY_METHOD, resolveDeliveryFee };
