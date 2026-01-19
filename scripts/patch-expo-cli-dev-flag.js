/* eslint-disable no-console */

const fs = require('fs');
const path = require('path');

const expoCliEntrypoint = path.join(__dirname, '..', 'node_modules', 'expo', 'bin', 'cli');
const marker = 'COPILOT_PATCH_EXPO_INSTALL_DEV_FLAG';
const podShimMarker = 'COPILOT_POD_SHIM_BUNDLER';

function ensurePodShim() {
  const podShimPath = path.join(__dirname, '..', 'node_modules', '.bin', 'pod');
  const rootDir = path.join(__dirname, '..');

  if (fs.existsSync(podShimPath)) {
    try {
      const existing = fs.readFileSync(podShimPath, 'utf8');
      if (existing.includes(podShimMarker)) {
        return;
      }
    } catch {
      // Ignore and re-write if unreadable.
    }
  }

  const podShim = `#!/usr/bin/env bash
set -euo pipefail

# ${podShimMarker}
# Shim for tooling that expects \`pod\` on PATH.
# Uses the repo's Gemfile-managed CocoaPods.

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
export BUNDLE_GEMFILE="$ROOT_DIR/Gemfile"

exec bundle exec pod "$@"
`;

  fs.mkdirSync(path.dirname(podShimPath), { recursive: true });
  fs.writeFileSync(podShimPath, podShim, { mode: 0o755 });
  console.log(`Ensured pod shim exists (at: ${podShimPath}).`);
}

function main() {
  if (!fs.existsSync(expoCliEntrypoint)) {
    return;
  }

  const current = fs.readFileSync(expoCliEntrypoint, 'utf8');
  if (current.includes(marker)) {
    return;
  }

  const patched = `#!/usr/bin/env node

// ${marker}
// Workaround: @expo/cli rejects \"expo install --dev <pkg>\". Some tooling (e.g. install-expo-modules)
// still invokes that form. Rewrite it to pass the dev flag through to npm.
//
// NOTE: This project uses npm (not yarn), so we forward \"--save-dev\".

const argv = process.argv.slice(2);

if (argv[0] === 'install') {
  const devIndex = argv.indexOf('--dev');
  if (devIndex !== -1) {
    argv.splice(devIndex, 1);

    const separatorIndex = argv.indexOf('--');
    if (separatorIndex === -1) {
      argv.push('--', '--save-dev');
    } else {
      argv.splice(separatorIndex + 1, 0, '--save-dev');
    }

    process.argv = [process.argv[0], process.argv[1], ...argv];
  }
}

require('@expo/cli');
`;

  fs.writeFileSync(expoCliEntrypoint, patched, { mode: 0o755 });
  console.log(`Patched Expo CLI entrypoint to rewrite \"expo install --dev\" (at: ${expoCliEntrypoint}).`);

  ensurePodShim();
}

main();
