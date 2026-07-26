const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const root = process.cwd();
const sourcePath = path.join(root, 'scripts/harden-admin-output.js');
const runtimePath = path.join(root, 'scripts/.harden-admin-runtime.cjs');
let source = fs.readFileSync(sourcePath, 'utf8');

const oldRequired = `function replaceRequired(source, pattern, replacement, label) {
  if (!pattern.test(source)) {
    throw new Error(\`[admin-hardening] \${label}: required pattern missing\`);
  }
  pattern.lastIndex = 0;
  return source.replace(pattern, replacement);
}`;

const newRequired = `function replaceRequired(source, pattern, replacement, label) {
  const present = typeof pattern === 'string' ? source.includes(pattern) : pattern.test(source);
  if (!present) {
    throw new Error(\`[admin-hardening] \${label}: required pattern missing\`);
  }
  if (pattern instanceof RegExp) pattern.lastIndex = 0;
  return source.replace(pattern, replacement);
}`;

const oldOptional = `function replaceOptional(source, pattern, replacement, label) {
  if (!pattern.test(source)) {
    console.warn(\`[admin-hardening] \${label}: optional pattern not present\`);
    return source;
  }
  pattern.lastIndex = 0;
  return source.replace(pattern, replacement);
}`;

const newOptional = `function replaceOptional(source, pattern, replacement, label) {
  const present = typeof pattern === 'string' ? source.includes(pattern) : pattern.test(source);
  if (!present) {
    console.warn(\`[admin-hardening] \${label}: optional pattern not present\`);
    return source;
  }
  if (pattern instanceof RegExp) pattern.lastIndex = 0;
  return source.replace(pattern, replacement);
}`;

if (!source.includes(oldRequired) || !source.includes(oldOptional)) {
  throw new Error('[admin-hardening-runner] Expected helper definitions were not found');
}

source = source.replace(oldRequired, newRequired).replace(oldOptional, newOptional);
fs.writeFileSync(runtimePath, source, 'utf8');

try {
  const result = spawnSync(process.execPath, [runtimePath], {
    cwd: root,
    stdio: 'inherit',
  });
  if (result.status !== 0) process.exit(result.status || 1);
} finally {
  fs.rmSync(runtimePath, { force: true });
}
