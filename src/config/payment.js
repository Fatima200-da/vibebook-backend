// Payment provider configuration, sourced entirely from environment
// variables - never hardcoded, never exposed to the frontend. If any
// required value is missing, payment endpoints must refuse to operate
// (503) rather than simulate success.

const config = {
    provider: process.env.PAYMENT_PROVIDER || "epoint",
    publicKey: process.env.PAYMENT_PUBLIC_KEY || "",
    privateKey: process.env.PAYMENT_PRIVATE_KEY || "",
    apiUrl: process.env.PAYMENT_API_URL || "",
    resultUrl: process.env.PAYMENT_RESULT_URL || "",
    successUrl: process.env.PAYMENT_SUCCESS_URL || "",
    errorUrl: process.env.PAYMENT_ERROR_URL || ""
};

function isPaymentConfigured() {
    return Boolean(
        config.publicKey &&
        config.privateKey &&
        config.apiUrl &&
        config.successUrl &&
        config.errorUrl
    );
}

module.exports = { config, isPaymentConfigured };
