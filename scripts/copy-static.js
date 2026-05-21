const fs = require('fs');
const path = require('path');

function copyRecursive(src, dest) {
  if (!fs.existsSync(src)) return;
  const stat = fs.statSync(src);
  if (stat.isDirectory()) {
    if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
    for (const file of fs.readdirSync(src)) {
      copyRecursive(path.join(src, file), path.join(dest, file));
    }
  } else {
    const destDir = path.dirname(dest);
    if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });
    fs.copyFileSync(src, dest);
  }
}

const projectRoot = path.resolve(__dirname, '..');
const dist = path.join(projectRoot, 'dist');

copyRecursive(path.join(projectRoot, 'img'), path.join(dist, 'img'));
copyRecursive(path.join(projectRoot, 'data'), path.join(dist, 'data'));

console.log('Copied img/ and data/ into dist/');
