#!/usr/bin/env node

function buildCustomInstructions(lines) {
  return lines.filter(line => line !== '').join('\n');
}

function formatComment(lines) {
  return lines.filter(line => line !== '').join('\n');
}

module.exports = {
  buildCustomInstructions,
  formatComment
};
