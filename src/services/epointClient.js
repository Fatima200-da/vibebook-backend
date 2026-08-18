const crypto = require("crypto");
const { config } = require("../config/payment");

// Implements Epoint's official "data + signature" authentication mechanism
// exactly as documented at https://developer.epoint.az/en/authentication :
//   data      = base64(JSON.stringify(payload))
//   signature = base64(sha1_binary(private_key + data + private_key))
function buildSignedPayload(payload) {

    const data = Buffer.from(JSON.stringify(payload), "utf8").toString("base64");

    const signature = crypto
        .createHash("sha1")
        .update(config.privateKey + data + config.privateKey, "utf8")
        .digest("base64");

    return { data, signature };

}

// Same algorithm is used to verify an inbound webhook's signature - the
// caller must never trust an unverified data payload.
function verifySignature(data, signature) {

    const expected = crypto
        .createHash("sha1")
        .update(config.privateKey + data + config.privateKey, "utf8")
        .digest("base64");

    // Constant-time comparison to avoid timing side-channels on the check.
    const expectedBuf = Buffer.from(expected);
    const receivedBuf = Buffer.from(signature || "");

    if (expectedBuf.length !== receivedBuf.length) {
        return false;
    }

    return crypto.timingSafeEqual(expectedBuf, receivedBuf);

}

function decodeData(data) {
    return JSON.parse(Buffer.from(data, "base64").toString("utf8"));
}

async function postForm(path, payload) {

    const { data, signature } = buildSignedPayload(payload);

    const response = await fetch(`${config.apiUrl}${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ data, signature }).toString()
    });

    const body = await response.json();

    return { httpStatus: response.status, body };

}

// IMPORTANT - path segments below are NOT confirmed from Epoint's official
// docs. developer.epoint.az masks every endpoint's actual URL behind a
// "click to authenticate and reveal" control gated on a developer-portal
// login, which this session has no access to. The segments used here
// (/checkout/request, /status/get-status, /reverse/reverse) mirror the
// *documentation page routes* for those operations (confirmed from the
// site's own sidebar navigation), which commonly - but not certainly -
// match the real API path structure. Do NOT treat these as verified.
// Before any real sandbox call, confirm the exact endpoint URLs from the
// merchant dashboard or credentials package and correct here if different.

// POST {apiUrl}/checkout/request - see https://developer.epoint.az/en/checkout/request
async function createPayment({ amount, currency, language, orderId, description, successRedirectUrl, errorRedirectUrl }) {

    return postForm("/checkout/request", {
        public_key: config.publicKey,
        amount: String(amount),
        currency,
        language,
        order_id: orderId,
        description,
        success_redirect_url: successRedirectUrl,
        error_redirect_url: errorRedirectUrl
    });

}

// POST {apiUrl}/status/get-status - see https://developer.epoint.az/en/status/get-status
async function getStatus({ transaction }) {

    return postForm("/status/get-status", {
        public_key: config.publicKey,
        transaction
    });

}

// POST {apiUrl}/reverse/reverse - see https://developer.epoint.az/en/reverse/reverse
async function reverseTransaction({ transaction, language, amount, currency }) {

    return postForm("/reverse/reverse", {
        public_key: config.publicKey,
        language,
        transaction,
        ...(amount !== undefined ? { amount } : {}),
        currency
    });

}

module.exports = {
    buildSignedPayload,
    verifySignature,
    decodeData,
    createPayment,
    getStatus,
    reverseTransaction
};
