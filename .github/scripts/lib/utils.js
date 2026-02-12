#!/usr/bin/env node

function buildCustomInstructions(lines) {
  return lines.filter(line => line !== '').join('\n');
}

function formatComment(lines) {
  return lines.filter(line => line !== '').join('\n');
}

function parsePositiveIntegerStrict(name, value) {
  const normalized = String(value || '').trim();
  if (!/^[1-9][0-9]*$/.test(normalized)) {
    throw new Error(`${name} must be a positive integer, got: ${value}`);
  }

  const parsed = Number(normalized);
  if (!Number.isSafeInteger(parsed)) {
    throw new Error(`${name} exceeds safe integer range: ${value}`);
  }

  return parsed;
}

module.exports = {
  buildCustomInstructions,
  formatComment,
  parsePositiveIntegerStrict
};
