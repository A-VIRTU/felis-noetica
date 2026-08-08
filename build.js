const fs = require('fs');
const path = require('path');

const rootDir = __dirname;
const publicDir = path.join(rootDir, 'public');

// Clean & recreate public dir
if (fs.existsSync(publicDir)) {
  fs.rmSync(publicDir, { recursive: true, force: true });
}
fs.mkdirSync(publicDir, { recursive: true });

function copyRecursiveSync(src, dest) {
  const exists = fs.existsSync(src);
  const stats = exists && fs.statSync(src);
  const isDirectory = stats && stats.isDirectory();
  if (isDirectory) {
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }
    fs.readdirSync(src).forEach((childItemName) => {
      if (childItemName === '.git' || childItemName === '.github' || childItemName === 'node_modules' || childItemName === 'public') {
        return;
      }
      copyRecursiveSync(path.join(src, childItemName), path.join(dest, childItemName));
    });
  } else {
    fs.copyFileSync(src, dest);
  }
}

const itemsToCopy = [
  'index.html',
  'en.html',
  'chov.html',
  '404.html',
  'styl.css',
  'skript.js',
  'favicon.ico',
  '.nojekyll',
  '.htaccess',
  'assets',
  'docs',
  'a9d4f8e2-b1c3-4d5e-8f9a-7b6c5d4e3f2a',
  'b8c9694e-91a9-4a5e-986b-add58cedd104',
  'c7e3b1a5-d9f2-4c8e-9a1b-3f5e7d9c1b2a',
  'c91a797e-2714-4d50-a65a-893528b10469'
];

itemsToCopy.forEach((item) => {
  const srcPath = path.join(rootDir, item);
  const destPath = path.join(publicDir, item);
  if (fs.existsSync(srcPath)) {
    copyRecursiveSync(srcPath, destPath);
    console.log(`Copied ${item} -> public/`);
  }
});

console.log('Build completed successfully! Assets ready in public/ directory.');
