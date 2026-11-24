/**
 * Fail the release build when the pushed tag does not match package.json.
 *
 * electron-updater compares the installed version with the version in
 * latest.yml, so a tag like v0.2.0 on a 0.1.0 package would publish an update
 * that every client ignores. Catch that here instead.
 *
 * Usage: node scripts/check-version.js v0.1.0
 */

const fs = require('fs');
const path = require('path');

const tag = (process.argv[2] || '').trim();

if (!tag) {
  console.log('No tag supplied; skipping version check.');
  process.exit(0);
}

const pkg = JSON.parse(
  fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf8')
);

const tagVersion = tag.replace(/^v/i, '');
const pkgVersion = pkg.version;

if (tagVersion !== pkgVersion) {
  console.error(
    `Version mismatch: tag is ${tag} but package.json says ${pkgVersion}.\n` +
      `Bump "version" in package.json, commit, then re-tag.`
  );
  process.exit(1);
}

console.log(`Version OK: ${tag} matches package.json (${pkgVersion}).`);
