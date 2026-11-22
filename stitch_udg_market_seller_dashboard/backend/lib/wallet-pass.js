const crypto = require('node:crypto');

function createQrToken(orderId, serialNumber, secret) {
  return crypto
    .createHmac('sha256', secret)
    .update(`udg-market-wallet-pass:${orderId}:${serialNumber}`)
    .digest('base64url');
}

module.exports = { createQrToken };
