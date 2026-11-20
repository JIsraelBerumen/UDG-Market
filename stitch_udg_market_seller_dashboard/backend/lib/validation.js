const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const TAG_TYPES = new Set(['allergen', 'diet']);

function isNumericInput(value) {
  return typeof value === 'number' ||
    (typeof value === 'string' && value.trim().length > 0);
}

function isNonEmptyString(value, maxLength) {
  return typeof value === 'string' && value.trim().length > 0 && value.trim().length <= maxLength;
}

function parseId(value) {
  if (!isNumericInput(value)) return null;
  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

function parsePrice(value) {
  if (!isNumericInput(value)) return null;
  const price = Number(value);
  return Number.isFinite(price) && price > 0 && price <= 99999999.99
    ? Math.round(price * 100) / 100
    : null;
}

function parseQuantity(value) {
  if (!isNumericInput(value)) return null;
  const quantity = Number(value);
  return Number.isSafeInteger(quantity) && quantity > 0 && quantity <= 10000
    ? quantity
    : null;
}

function parseTags(value) {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.length > 30) return null;

  const tags = [];
  const seen = new Set();
  for (const tag of value) {
    if (
      !tag ||
      typeof tag !== 'object' ||
      !TAG_TYPES.has(tag.type) ||
      !isNonEmptyString(tag.name, 60)
    ) {
      return null;
    }
    const name = tag.name.trim();
    const key = `${tag.type}:${name.toLocaleLowerCase()}`;
    if (!seen.has(key)) {
      seen.add(key);
      tags.push({ name, type: tag.type });
    }
  }
  return tags;
}

function normalizeEmail(value) {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

function normalizeOptionalString(value) {
  if (typeof value !== 'string') return null;
  return value.trim() || null;
}

module.exports = {
  EMAIL_PATTERN,
  isNumericInput,
  isNonEmptyString,
  normalizeEmail,
  normalizeOptionalString,
  parseId,
  parsePrice,
  parseQuantity,
  parseTags
};
