// 打包脚本：把 public/ 静态资源内联进 public-assets.js，再用 bun 编译成单文件 exe。
// 用法：node scripts/build-exe.js   （或 npm run build:exe）
const { execSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const PUBLIC = path.join(root, 'public');
const ASSETS = path.join(root, 'public-assets.js');
const OUT = path.join(root, 'dist', 'skill-forge.exe');

// 1. 内联静态资源（base64，避免转义问题）
const files = {};
for (const name of fs.readdirSync(PUBLIC)) {
  const full = path.join(PUBLIC, name);
  if (fs.statSync(full).isFile()) files[name] = fs.readFileSync(full).toString('base64');
}
fs.writeFileSync(ASSETS, 'module.exports = ' + JSON.stringify(files) + ';');
console.log('✓ 已内联静态资源：', Object.keys(files).length, '个文件');

// 2. bun 编译为单文件 exe
fs.mkdirSync(path.dirname(OUT), { recursive: true });
execSync('bun build --compile --windows-hide-console server.js --outfile "' + OUT + '"', { cwd: root, stdio: 'inherit' });

// 3. 清理临时内联文件（已在 exe 内，避免影响 node 开发模式）
fs.rmSync(ASSETS, { force: true });
console.log('✓ 打包完成：' + OUT);
