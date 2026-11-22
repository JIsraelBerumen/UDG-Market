const test = require('node:test');
const assert = require('node:assert/strict');
const { createQrToken } = require('./wallet-pass');

test('creates a stable QR token for the same pass and changes it for another pass', () => {
  const token = createQrToken(12, 'UDG-12-ABC123', 'a sufficiently long secret');

  assert.equal(token, createQrToken(12, 'UDG-12-ABC123', 'a sufficiently long secret'));
  assert.notEqual(token, createQrToken(13, 'UDG-12-ABC123', 'a sufficiently long secret'));
  assert.notEqual(token, createQrToken(12, 'UDG-12-DEF456', 'a sufficiently long secret'));
  assert.notEqual(token, createQrToken(12, 'UDG-12-ABC123', 'another sufficiently long secret'));
});
