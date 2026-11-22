const test = require('node:test');
const assert = require('node:assert/strict');
const {
  EMAIL_PATTERN,
  normalizeEmail,
  normalizeOptionalString,
  parseId,
  parsePrice,
  parseQuantity,
  parseTags
} = require('./validation');

test('normalizes email without accepting whitespace-only addresses', () => {
  assert.equal(normalizeEmail('  User@Example.com '), 'user@example.com');
  assert.equal(EMAIL_PATTERN.test(normalizeEmail('  User@Example.com ')), true);
  assert.equal(EMAIL_PATTERN.test(normalizeEmail('   ')), false);
});

test('normalizes blank optional registration fields to null', () => {
  assert.equal(normalizeOptionalString(''), null);
  assert.equal(normalizeOptionalString('   '), null);
  assert.equal(normalizeOptionalString('  Ingeniería  '), 'Ingeniería');
});

test('accepts only positive safe identifiers and valid purchase quantities', () => {
  assert.equal(parseId('17'), 17);
  assert.equal(parseId('0'), null);
  assert.equal(parseId('1.5'), null);
  assert.equal(parseId(true), null);
  assert.equal(parseQuantity(3), 3);
  assert.equal(parseQuantity(0), null);
  assert.equal(parseQuantity(10001), null);
  assert.equal(parseQuantity(true), null);
});

test('normalizes prices and rejects invalid amounts', () => {
  assert.equal(parsePrice('25.5'), 25.5);
  assert.equal(parsePrice(0), null);
  assert.equal(parsePrice('no es precio'), null);
});

test('validates and deduplicates product diet/allergen tags', () => {
  assert.deepEqual(parseTags([
    { name: 'Nuez', type: 'allergen' },
    { name: 'Nuez', type: 'allergen' },
    { name: 'Vegano', type: 'diet' }
  ]), [
    { name: 'Nuez', type: 'allergen' },
    { name: 'Vegano', type: 'diet' }
  ]);
  assert.equal(parseTags([{ name: 'Sin gluten', type: 'unknown' }]), null);
});
