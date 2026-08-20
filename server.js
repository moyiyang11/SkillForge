const http = require('node:http');
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const { execFile, spawn } = require('node:child_process');
const { promisify } = require('node:util');
const execFileAsync = promisify(execFile);

const PORT = Number(process.env.PORT) || 4173;
const ROOT = __dirname;
const IS_PACKAGED = Boolean(process.pkg || process.isBun);
const PUBLIC = path.join(ROOT, 'public');
const DATA = IS_PACKAGED ? path.join(path.dirname(process.execPath), 'data') : path.join(ROOT, 'data');
const EXPERTS_FILE = path.join(DATA, 'experts.json');
const CONFIG_FILE = path.join(DATA, 'config.json');

const defaultSkillRoots = [
  { root: path.join(os.homedir(), '.codex', 'skills'), source: 'Codex', scope: 'global' },
  { root: path.join(os.homedir(), '.claude', 'skills'), source: 'Claude Code', scope: 'global' }
];

async function readConfig() {
  try { return JSON.parse(await fs.readFile(CONFIG_FILE, 'utf8')); } catch { return { libraryPath: '' }; }
}

async function writeConfig(config) {
  await fs.mkdir(DATA, { recursive: true });
  await fs.writeFile(CONFIG_FILE, JSON.stringify(config, null, 2));
}

async function getSkillRoots() {
  const config = await readConfig();
  const libraryRoots = config.libraryPath
    ? [{ root: path.resolve(config.libraryPath), source: 'Skills 仓库', scope: 'library' }]
    : [];
  const projectPath = config.projectPath ? path.resolve(config.projectPath) : '';
  const projectRoots = projectPath
    ? [
        { root: path.join(projectPath, '.codex', 'skills'), source: 'Codex · 项目', scope: 'project' },
        { root: path.join(projectPath, '.claude', 'skills'), source: 'Claude Code · 项目', scope: 'project' }
      ]
    : [];
  return [...libraryRoots, ...defaultSkillRoots, ...projectRoots];
}

const categoryRules = [
  ['设计创意', /image|visual|design|diagram|draw|ui|ux|图|设计/i],
  ['开发工程', /code|develop|debug|test|git|plugin|api|web|开发|测试/i],
  ['内容写作', /write|content|docs|copy|article|内容|写作|文档/i],
  ['效率工具', /install|manage|browser|automation|workflow|管理|自动/i],
  ['数据分析', /data|analysis|chart|excel|sql|数据|分析/i]
];

function parseFrontmatter(text) {
  if (!text.startsWith('---')) return {};
  const end = text.indexOf('\n---', 3);
  if (end < 0) return {};
  const out = {};
  for (const line of text.slice(3, end).split(/\r?\n/)) {
    const match = line.match(/^([\w-]+):\s*["']?(.*?)["']?\s*$/);
    if (match) out[match[1]] = match[2];
  }
  return out;
}

function inferCategory(name, description) {
  const value = `${name} ${description}`;
  return categoryRules.find(([, rule]) => rule.test(value))?.[0] || '其他';
}

async function collectSkillFiles(root, depth = 0) {
  if (depth > 5) return [];
  let entries;
  try { entries = await fs.readdir(root, { withFileTypes: true }); } catch { return []; }
  const own = entries.find((entry) => entry.isFile() && entry.name.toLowerCase() === 'skill.md');
  if (own) return [path.join(root, own.name)];
  const nested = await Promise.all(entries
    .filter((entry) => entry.isDirectory() && (!entry.name.startsWith('.') || entry.name === '.agents'))
    .map((entry) => collectSkillFiles(path.join(root, entry.name), depth + 1)));
  return nested.flat();
}

async function scanSkills() {
  const seen = new Map();
  const config = await readConfig(); const descriptions = config.skillDescriptions || {}; const categories = config.skillCategories || {}; const savedTags = config.skillTags || {};
  const skillRoots = await getSkillRoots();
  for (const location of skillRoots) {
    const files = await collectSkillFiles(location.root);
    for (const file of files) {
      try {
        const content = await fs.readFile(file, 'utf8');
        const meta = parseFrontmatter(content);
        const folderName = path.basename(path.dirname(file));
        const name = meta.name || folderName;
        const description = meta.description || content
          .replace(/^---[\s\S]*?---/, '')
          .replace(/[#*_`>]/g, '')
          .trim().split(/\r?\n/).find(Boolean) || '暂无描述';
        const key = `${location.source}:${name}:${file}`;
        const id = Buffer.from(key).toString('base64url');
        const fallbackCategory = categories[id] || inferCategory(name, descriptions[id] || description);
        const tags = Array.isArray(savedTags[id]) && savedTags[id].length ? savedTags[id] : [fallbackCategory];
        seen.set(key, {
          id, name, description: descriptions[id] || description, tags,
          category: tags[0], source: location.source, scope: location.scope,
          command: `$${name}`, codexCommand: `$${name}`, claudeCommand: `/${name}`, path: file
        });
      } catch { /* skip unreadable skills */ }
    }
  }
  return [...seen.values()].sort((a, b) => a.name.localeCompare(b.name, 'zh-CN'));
}

async function chooseDirectory(description = '选择目录') {
  if (process.platform !== 'win32') throw new Error('当前目录选择器仅支持 Windows');
  const safeDescription = description.replace(/'/g, "''");
  const script = `Add-Type -AssemblyName System.Windows.Forms; $owner = New-Object System.Windows.Forms.Form; $owner.ShowInTaskbar = $false; $owner.TopMost = $true; $owner.Opacity = 0; $owner.Width = 1; $owner.Height = 1; $owner.StartPosition = 'CenterScreen'; $owner.Show(); $dialog = New-Object System.Windows.Forms.OpenFileDialog; $dialog.Title = '${safeDescription}（可点击地址栏或按 Ctrl+L 输入路径）'; $dialog.CheckFileExists = $false; $dialog.CheckPathExists = $true; $dialog.ValidateNames = $false; $dialog.FileName = '选择当前文件夹'; try { if ($dialog.ShowDialog($owner) -eq [System.Windows.Forms.DialogResult]::OK) { $selected = $dialog.FileName; if (-not (Test-Path -LiteralPath $selected -PathType Container)) { $selected = Split-Path -Parent $selected }; [Console]::OutputEncoding = [Text.Encoding]::UTF8; Write-Output $selected } } finally { $dialog.Dispose(); $owner.Close(); $owner.Dispose() }`;
  const { stdout } = await execFileAsync('powershell.exe', ['-NoProfile', '-STA', '-Command', script], { encoding: 'utf8', windowsHide: false });
  return stdout.trim();
}

async function installSkill(input) {
  const skill = (await scanSkills()).find((item) => item.id === input.skillId);
  if (!skill) throw new Error('找不到要安装的 Skill，请重新扫描');
  if (skill.source !== 'Skills 仓库') { const error = new Error('只有 Skills 仓库中的 Skill 可以安装'); error.status = 403; throw error; }
  const sourceDir = path.dirname(skill.path);
  const platforms = [...new Set(Array.isArray(input.platforms) ? input.platforms : [input.platform])];
  if (!platforms.length || platforms.some((platform) => !['codex', 'claude'].includes(platform))) throw new Error('请至少选择一个安装平台');
  let baseDir;
  if (input.scope === 'global') baseDir = os.homedir();
  else if (input.scope === 'project') {
    const projectConfig = await readConfig();
    const projectPath = String(input.projectPath || projectConfig.projectPath || '').trim();
    if (!projectPath) throw new Error('请先选择项目目录');
    const resolved = path.resolve(projectPath);
    const stat = await fs.stat(resolved).catch(() => null);
    if (!stat?.isDirectory()) throw new Error('选择的项目目录不存在');
    baseDir = resolved;
  } else throw new Error('无效的安装范围');
  const folderName = path.basename(sourceDir);
  const targets = platforms.map((platform) => {
    const skillsRoot = path.join(baseDir, platform === 'codex' ? '.codex' : '.claude', 'skills');
    return { platform, skillsRoot, targetDir: path.join(skillsRoot, folderName) };
  });
  for (const target of targets) {
    const exists = await fs.stat(target.targetDir).then(() => true).catch(() => false);
    if (exists) { const error = new Error(`目标已存在：${target.targetDir}`); error.status = 409; throw error; }
  }
  for (const target of targets) {
    await fs.mkdir(target.skillsRoot, { recursive: true });
    await fs.cp(sourceDir, target.targetDir, { recursive: true, force: false, errorOnExist: true });
  }
  // 将仓库卡片中已编辑的介绍与标签同步到新安装的 Skill（按其安装后的 id 写入配置）
  const config = await readConfig();
  config.skillDescriptions = config.skillDescriptions || {};
  config.skillTags = config.skillTags || {};
  const editedDescription = config.skillDescriptions[input.skillId];
  const editedTags = config.skillTags[input.skillId];
  let migrated = false;
  if (editedDescription || editedTags) {
    for (const target of targets) {
      const installedSource = target.platform === 'codex'
        ? (input.scope === 'project' ? 'Codex · 项目' : 'Codex')
        : (input.scope === 'project' ? 'Claude Code · 项目' : 'Claude Code');
      const newKey = `${installedSource}:${skill.name}:${path.join(target.targetDir, path.basename(skill.path))}`;
      const newId = Buffer.from(newKey).toString('base64url');
      if (editedDescription) config.skillDescriptions[newId] = editedDescription;
      if (editedTags) config.skillTags[newId] = editedTags;
    }
    await writeConfig(config);
    migrated = true;
  }
  return { targetDirs: targets.map((target) => target.targetDir), scope: input.scope, platforms, name: skill.name, migrated };
}

async function deleteSkillById(id) {
  const skill = (await scanSkills()).find((item) => item.id === id);
  if (!skill) throw new Error('找不到要删除的 Skill，请重新扫描');
  const skillDir = path.dirname(skill.path);
  let allowed = false;
  if (skill.scope === 'global') {
    const allowedRoots = defaultSkillRoots.filter((item) => item.scope === 'global').map((item) => path.resolve(item.root));
    allowed = allowedRoots.some((root) => { const relative = path.relative(root, path.resolve(skillDir)); return relative && !relative.startsWith(`..${path.sep}`) && relative !== '..' && !path.isAbsolute(relative); });
  } else if (skill.scope === 'library') {
    const config = await readConfig();
    const libRoot = config.libraryPath ? path.resolve(config.libraryPath) : '';
    const relative = libRoot ? path.relative(libRoot, path.resolve(skillDir)) : '';
    allowed = Boolean(relative && !relative.startsWith(`..${path.sep}`) && relative !== '..' && !path.isAbsolute(relative));
  } else if (skill.scope === 'project') {
    const config = await readConfig();
    const projectPath = config.projectPath ? path.resolve(config.projectPath) : '';
    const allowedRoots = projectPath
      ? [path.join(projectPath, '.codex', 'skills'), path.join(projectPath, '.claude', 'skills')].map((root) => path.resolve(root))
      : [];
    allowed = allowedRoots.some((root) => { const relative = path.relative(root, path.resolve(skillDir)); return relative && !relative.startsWith(`..${path.sep}`) && relative !== '..' && !path.isAbsolute(relative); });
  } else {
    const error = new Error('只能删除全局安装或 Skills 仓库中的 Skill'); error.status = 403; throw error;
  }
  if (!allowed) { const error = new Error('Skill 目录不在允许删除的路径中'); error.status = 403; throw error; }
  await fs.rm(skillDir, { recursive: true, force: false });
  return { ok: true, name: skill.name, deletedDir: skillDir };
}

async function inspectInstallTargets(input) {
  if (input.scope !== 'project') return { missing: [] };
  const config = await readConfig();
  const projectPath = String(input.projectPath || config.projectPath || '').trim();
  if (!projectPath) throw new Error('请先选择项目目录');
  const resolved = path.resolve(projectPath);
  const stat = await fs.stat(resolved).catch(() => null);
  if (!stat?.isDirectory()) throw new Error('选择的项目目录不存在');
  const platforms = [...new Set(Array.isArray(input.platforms) ? input.platforms : [])];
  if (!platforms.length || platforms.some((platform) => !['codex', 'claude'].includes(platform))) throw new Error('请至少选择一个安装平台');
  const missing = [];
  for (const platform of platforms) {
    const target = path.join(resolved, platform === 'codex' ? '.codex' : '.claude', 'skills');
    const targetStat = await fs.stat(target).catch(() => null);
    if (!targetStat?.isDirectory()) missing.push({ platform, target });
  }
  return { missing };
}
async function updateSkillMetadata(id, description, tagsInput) { const skill = (await scanSkills()).find((item) => item.id === id); if (!skill) throw new Error('找不到 Skill'); const tags = [...new Set((Array.isArray(tagsInput) ? tagsInput : []).map((tag) => String(tag).trim().slice(0, 30)).filter(Boolean))].slice(0, 10); if (!tags.length) throw new Error('请至少添加一个卡片标签'); const config = await readConfig(); config.skillDescriptions = config.skillDescriptions || {}; config.skillTags = config.skillTags || {}; config.skillDescriptions[id] = String(description || '').trim().slice(0, 500); config.skillTags[id] = tags; await writeConfig(config); return { description: config.skillDescriptions[id], tags }; }
function inferLocalTags(skill, content) {
  const meta = parseFrontmatter(content);
  const tags = [];
  const value = `${skill.name} ${skill.description}`;
  for (const [category, rule] of categoryRules) {
    if (rule.test(value) && !tags.includes(category)) tags.push(category);
  }
  const rawTags = String(meta.tags || '').replace(/[\[\]"']/g, '').split(/[,，;；、]+/).map((tag) => tag.trim()).filter(Boolean);
  for (const tag of rawTags) {
    if (tags.length >= 10) break;
    if (!tags.includes(tag)) tags.push(tag);
  }
  return tags;
}

function parseSummaryJson(text) {
  try { return JSON.parse(text.trim()); } catch {}
  const match = String(text).match(/\{[\s\S]*\}/);
  if (!match) return null;
  try { return JSON.parse(match[0]); } catch { return null; }
}

async function summarizeWithDeepSeek(id) {
  const skill = (await scanSkills()).find((item) => item.id === id);
  const config = await readConfig();
  if (!skill) throw new Error('找不到 Skill');
  const content = await fs.readFile(skill.path, 'utf8');
  const plainText = content.replace(/^---[\s\S]*?---/m, '').replace(/[#*_`>]/g, '').replace(/\s+/g, ' ').trim();
  const localSummary = plainText.length > 120 ? `${plainText.slice(0, 117)}…` : (plainText || skill.description);
  const localTags = inferLocalTags(skill, content);
  if (!config.deepseekApiKey) return { mode: 'local', summary: localSummary, tags: localTags };
  const response = await fetch('https://api.deepseek.com/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${config.deepseekApiKey}` },
    body: JSON.stringify({
      model: 'deepseek-chat', temperature: 0.3,
      messages: [
        { role: 'system', content: '你是 Skill 元数据整理助手。请阅读用户提供的 SKILL.md，只输出严格 JSON（不要使用 Markdown 代码块，不要输出任何其他文字），格式：{"summary":"用简体中文概括该 Skill 的用途、核心能力和适用场景，不超过120字的一段自然语言","tags":["3到5个用于分类和搜索的中文标签，每个不超过10字"]}' },
        { role: 'user', content: `Skill 名称：${skill.name}\n\nSKILL.md 完整内容：\n${content}` }
      ]
    })
  });
  if (!response.ok) throw new Error('DeepSeek 请求失败，请检查 API Key 或网络');
  const data = await response.json();
  const text = data.choices?.[0]?.message?.content || '';
  const parsed = parseSummaryJson(text);
  if (parsed) {
    const tags = Array.isArray(parsed.tags) && parsed.tags.length
      ? parsed.tags.map((tag) => String(tag).trim().slice(0, 30)).filter(Boolean).slice(0, 10)
      : localTags;
    return { mode: 'deepseek', summary: String(parsed.summary || localSummary).trim(), tags };
  }
  return { mode: 'deepseek', summary: text.trim() || localSummary, tags: localTags };
}


async function readExperts() {
  try { return JSON.parse(await fs.readFile(EXPERTS_FILE, 'utf8')); } catch { return []; }
}

async function writeExperts(experts) {
  await fs.mkdir(DATA, { recursive: true });
  await fs.writeFile(EXPERTS_FILE, JSON.stringify(experts, null, 2));
}

function json(res, status, value) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(value));
}

async function body(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  if (chunks.reduce((sum, chunk) => sum + chunk.length, 0) > 1e6) throw new Error('请求过大');
  return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
}

async function api(req, res, url) {
  if (req.method === 'GET' && url.pathname === '/api/skills') return json(res, 200, { skills: await scanSkills(), roots: await getSkillRoots(), config: await readConfig() });
  if (req.method === 'GET' && url.pathname === '/api/config') return json(res, 200, await readConfig());
  if (req.method === 'POST' && url.pathname === '/api/config') {
    const input = await body(req);
    const config = await readConfig();
    if (typeof input.libraryPath === 'string') {
      const rawPath = input.libraryPath.trim();
      if (!rawPath) return json(res, 400, { error: '请输入仓库路径' });
      const libraryPath = path.resolve(rawPath);
      const stat = await fs.stat(libraryPath).catch(() => null);
      if (!stat?.isDirectory()) return json(res, 400, { error: '输入的仓库路径不存在或不是目录' });
      config.libraryPath = libraryPath;
    }
    if (typeof input.projectPath === 'string') {
      const rawPath = input.projectPath.trim();
      if (!rawPath) return json(res, 400, { error: '请输入项目路径' });
      const projectPath = path.resolve(rawPath);
      const stat = await fs.stat(projectPath).catch(() => null);
      if (!stat?.isDirectory()) return json(res, 400, { error: '输入的项目路径不存在或不是目录' });
      config.projectPath = projectPath;
    }
    await writeConfig(config);
    return json(res, 200, config);
  }
  if (req.method === 'DELETE' && url.pathname === '/api/config/library') {
    const config = await readConfig(); config.libraryPath = ''; await writeConfig(config);
    return json(res, 200, config);
  }
  if (req.method === 'DELETE' && url.pathname === '/api/config/project') {
    const config = await readConfig(); config.projectPath = ''; await writeConfig(config);
    return json(res, 200, config);
  }
  if (req.method === 'POST' && url.pathname === '/api/select-directory') {
    const input = await body(req);
    const selectedPath = await chooseDirectory(input.purpose === 'project' ? '选择项目根目录' : '选择存放所有 Skill 的仓库目录');
    if (!selectedPath) return json(res, 200, { cancelled: true });
    return json(res, 200, { path: selectedPath });
  }
  if (req.method === 'POST' && url.pathname === '/api/install') return json(res, 201, await installSkill(await body(req)));
  if (req.method === 'POST' && url.pathname === '/api/install-targets') return json(res, 200, await inspectInstallTargets(await body(req)));
  if (req.method === 'PUT' && url.pathname.startsWith('/api/skill/')) { const input = await body(req); return json(res, 200, await updateSkillMetadata(decodeURIComponent(url.pathname.slice('/api/skill/'.length)), input.description, input.tags)); }
  if (req.method === 'POST' && url.pathname === '/api/skill-summary') { const input = await body(req); return json(res, 200, await summarizeWithDeepSeek(input.id)); }
  if (req.method === 'POST' && url.pathname === '/api/deepseek-config') { const input = await body(req); const config = await readConfig(); config.deepseekApiKey = String(input.apiKey || '').trim(); await writeConfig(config); return json(res, 200, { configured: Boolean(config.deepseekApiKey) }); }
  if (req.method === 'DELETE' && url.pathname.startsWith('/api/skills/')) {
    const id = decodeURIComponent(url.pathname.slice('/api/skills/'.length));
    return json(res, 200, await deleteSkillById(id));
  }
  if (req.method === 'GET' && url.pathname === '/api/experts') return json(res, 200, await readExperts());
  if (req.method === 'POST' && url.pathname === '/api/experts') {
    const input = await body(req);
    if (!input.name?.trim() || !Array.isArray(input.skillIds) || !input.skillIds.length) return json(res, 400, { error: '请填写专家名称并选择至少一个 Skill' });
    const experts = await readExperts();
    const expert = { id: crypto.randomUUID(), name: input.name.trim().slice(0, 60), description: String(input.description || '').trim().slice(0, 200), skillIds: input.skillIds, createdAt: new Date().toISOString() };
    experts.unshift(expert); await writeExperts(experts); return json(res, 201, expert);
  }
  if (req.method === 'DELETE' && url.pathname.startsWith('/api/experts/')) {
    const id = decodeURIComponent(url.pathname.split('/').pop());
    const experts = await readExperts(); await writeExperts(experts.filter((item) => item.id !== id)); return json(res, 200, { ok: true });
  }
  if (req.method === 'PUT' && url.pathname.startsWith('/api/experts/')) {
    const id = decodeURIComponent(url.pathname.split('/').pop());
    const input = await body(req);
    if (!input.name?.trim() || !Array.isArray(input.skillIds) || !input.skillIds.length) return json(res, 400, { error: '请填写专家名称并选择至少一个 Skill' });
    const experts = await readExperts();
    const index = experts.findIndex((item) => item.id === id);
    if (index === -1) return json(res, 404, { error: '专家不存在' });
    experts[index] = { ...experts[index], name: input.name.trim().slice(0, 60), description: String(input.description || '').trim().slice(0, 200), skillIds: input.skillIds };
    await writeExperts(experts); return json(res, 200, experts[index]);
  }
  return false;
}

const mime = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.svg': 'image/svg+xml', '.json': 'application/json; charset=utf-8' };
let EMBEDDED = null;
try { EMBEDDED = require('./public-assets'); } catch {}
async function serveStatic(res, pathname) {
  const relative = pathname === '/' ? 'index.html' : pathname.slice(1);
  if (EMBEDDED && Object.prototype.hasOwnProperty.call(EMBEDDED, relative)) {
    const content = Buffer.from(EMBEDDED[relative], 'base64');
    res.writeHead(200, { 'Content-Type': mime[path.extname(relative)] || 'application/octet-stream', 'Cache-Control': 'no-cache' }); res.end(content);
    return;
  }
  const file = path.resolve(PUBLIC, relative);
  if (!file.startsWith(PUBLIC + path.sep)) return json(res, 403, { error: 'Forbidden' });
  try {
    const content = await fs.readFile(file);
    res.writeHead(200, { 'Content-Type': mime[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-cache' }); res.end(content);
  } catch { json(res, 404, { error: 'Not found' }); }
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    if (url.pathname.startsWith('/api/')) { if (await api(req, res, url) === false) json(res, 404, { error: 'Not found' }); }
    else await serveStatic(res, url.pathname);
  } catch (error) { json(res, error.status || 500, { error: error.message || '服务器错误' }); }
});

async function openAppWindow(port) {
  const url = `http://127.0.0.1:${port}`;
  const pf = process.env.ProgramFiles || 'C:\\Program Files';
  const pfx = process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)';
  const candidates = [
    path.join(pfx, 'Google', 'Chrome', 'Application', 'chrome.exe'),
    path.join(pf, 'Google', 'Chrome', 'Application', 'chrome.exe'),
    path.join(pfx, 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
    path.join(pf, 'Microsoft', 'Edge', 'Application', 'msedge.exe')
  ];
  for (const exe of candidates) {
    try { await fs.access(exe); spawn(exe, ['--app=' + url, '--new-window'], { detached: true, stdio: 'ignore' }).unref(); return; } catch { /* try next */ }
  }
  spawn('cmd.exe', ['/c', 'start', '', url], { detached: true, stdio: 'ignore' }).unref();
}
function isOurApp(port) {
  return new Promise((resolve) => {
    const req = http.get({ host: '127.0.0.1', port, path: '/' }, (res) => {
      let body = ''; res.on('data', (c) => body += c); res.on('end', () => resolve(body.includes('Skill 管理平台') || body.includes('id="skillsView"')));
    });
    req.on('error', () => resolve(false)); req.setTimeout(800, () => { req.destroy(); resolve(false); });
  });
}
function startServer(port) {
  server.on('error', async (err) => {
    if (err.code === 'EADDRINUSE') {
      if (await isOurApp(port)) { console.log(`端口 ${port} 已有本应用在运行，直接打开窗口`); if (IS_PACKAGED) openAppWindow(port); return; }
      if (port < PORT + 10) { console.log(`端口 ${port} 被占用，尝试 ${port + 1}`); startServer(port + 1); }
      else { console.error('没有可用端口，无法启动'); process.exit(1); }
    } else { console.error('服务器启动失败：' + err.message); process.exit(1); }
  });
  server.listen(port, '127.0.0.1', () => { console.log(`Skill 管理平台已启动：http://127.0.0.1:${port}`); if (IS_PACKAGED) openAppWindow(port); });
}
startServer(PORT);
