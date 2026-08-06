'use strict';

const fs = require('node:fs');
const path = require('node:path');
const semanticRelease = require('semantic-release').default;

const configName = process.argv[2];
const allowedConfigs = new Set([
  '.releaserc.json',
  '.releaserc.webapp.json',
  '.releaserc.mcp.json',
]);

if (!allowedConfigs.has(configName)) {
  throw new Error(`Unsupported release configuration: ${configName ?? '<missing>'}`);
}

const configPath = path.resolve(process.cwd(), configName);
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

semanticRelease(config, {
  cwd: process.cwd(),
  ...(process.env.RELEASE_DRY_RUN === 'true' ? { dryRun: true } : {}),
}).catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
