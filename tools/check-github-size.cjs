/* Fail when any tracked-style project file is 1 MB or larger.
   GitHub's contents API returns no bytes for those files, and Sync with GitHub
   cannot load the difference. */
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const skip = new Set(['.git', 'node_modules', 'dist']);
const tooBig = [];
function walk(dir) {
  for (const name of fs.readdirSync(dir)) {
    if (skip.has(name)) continue;
    const abs = path.join(dir, name);
    const st = fs.statSync(abs);
    if (st.isDirectory()) walk(abs);
    else if (st.size >= 1000000) tooBig.push(`${st.size} ${path.relative(root, abs)}`);
  }
}
walk(root);
if (tooBig.length) {
  console.error('These files are 1 MB or larger, so GitHub sync cannot read them:');
  tooBig.forEach(line => console.error('  ' + line));
  process.exit(1);
}
console.log('Every project file is under 1 MB.');
