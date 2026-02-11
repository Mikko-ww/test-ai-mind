#!/usr/bin/env node

const fs = require('fs');
const yaml = require('js-yaml');
const core = require('@actions/core');

function loadConfig(configPath = '.github/agent/config.yml') {
  try {
    const content = fs.readFileSync(configPath, 'utf8');
    return yaml.load(content);
  } catch (error) {
    core.error(`Failed to load config from ${configPath}: ${error.message}`);
    throw error;
  }
}

function getConfigValue(config, path) {
  const keys = path.split('.');
  let value = config;
  
  for (const key of keys) {
    if (value && typeof value === 'object' && key in value) {
      value = value[key];
    } else {
      return undefined;
    }
  }
  
  return value;
}

module.exports = { loadConfig, getConfigValue };
