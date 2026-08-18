const state = { skills: [], experts: [], category: '全部', query: '', view: 'skills', installSkillId: '', useSkillId: '', projectPath: '' };
const $ = (selector) => document.querySelector(selector);
const escapeHtml = (value = '') => String(value).replace(/[&<>'"]/g, (char) => ({ '&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;' }[char]));

function toast(message) { const el = $('#toast'); el.textContent = message; el.classList.add('show'); clearTimeout(toast.timer); toast.timer = setTimeout(() => el.classList.remove('show'), 2200); }
async function request(url, options) { const response = await fetch(url, options); const data = await response.json(); if (!response.ok) throw new Error(data.error || '请求失败'); return data; }
async function copy(text, message = '口令已复制，可以粘贴到 Codex 使用') { await navigator.clipboard.writeText(text); toast(message); }

function renderFilters() {
  const categories = ['全部', ...new Set(state.skills.map((item) => item.category))];
  $('#filters').innerHTML = categories.map((name) => `<button class="filter ${state.category === name ? 'active' : ''}" data-category="${escapeHtml(name)}">${escapeHtml(name)}</button>`).join('');
}
function visibleSkills() {
  const q = state.query.toLowerCase(); return state.skills.filter((skill) => (state.category === '全部' || skill.category === state.category) && (!q || `${skill.name} ${skill.description} ${skill.source}`.toLowerCase().includes(q)));
}
function renderSkills() {
  const skills = visibleSkills(); $('#skillCount').textContent = skills.length;
  const card = (skill) => `<article class="card"><div class="card-top"><div class="skill-icon">${escapeHtml(skill.name.slice(0,1).toUpperCase())}</div><span class="source">${escapeHtml(skill.source)}</span></div><h3>${escapeHtml(skill.name)}</h3><p>${escapeHtml(skill.description)}</p><div class="card-foot"><span class="category">${escapeHtml(skill.category)}</span><div class="card-actions">${skill.source === 'Skills 仓库' ? `<button class="install" data-install="${skill.id}">安装</button>` : ''}<button class="use" data-use="${skill.id}">使用 →</button></div></div></article>`;
  const library = skills.filter((skill) => skill.scope === 'library'); const global = skills.filter((skill) => skill.scope === 'global'); const project = skills.filter((skill) => skill.scope === 'project');
  $('#libraryGrid').innerHTML = library.map(card).join(''); $('#globalGrid').innerHTML = global.map(card).join(''); $('#projectGrid').innerHTML = project.map(card).join('');
  $('#libraryCount').textContent = library.length; $('#globalCount').textContent = global.length; $('#projectCount').textContent = project.length;
  $('#libraryGroup').classList.toggle('hidden', library.length === 0); $('#globalGroup').classList.toggle('hidden', global.length === 0); $('#projectGroup').classList.toggle('hidden', project.length === 0);
  $('#emptySkills').classList.toggle('hidden', skills.length > 0);
}
function renderExperts() {
  $('#expertCount').textContent = state.experts.length; $('#emptyExperts').classList.toggle('hidden', state.experts.length > 0);
  $('#expertGrid').innerHTML = state.experts.map((expert) => { const skills = expert.skillIds.map((id) => state.skills.find((item) => item.id === id)).filter(Boolean); return `<article class="expert-card"><div class="skill-icon">✦</div><h3>${escapeHtml(expert.name)}</h3><p>${escapeHtml(expert.description || '组合多个 Skill，按任务自动选用。')}</p><div class="chips">${skills.map((skill) => `<span class="chip">${escapeHtml(skill.name)}</span>`).join('') || '<span class="chip">Skill 已移动</span>'}</div><div class="expert-actions"><button class="primary" data-expert-use="${expert.id}">复制专家口令</button><button class="danger" data-delete="${expert.id}">删除</button></div></article>`; }).join('');
}
function renderPicker() { $('#skillPicker').innerHTML = state.skills.map((skill) => `<label class="pick"><input type="checkbox" name="skill" value="${skill.id}"><span><b>${escapeHtml(skill.name)}</b><small>${escapeHtml(skill.source)} · ${escapeHtml(skill.category)}</small></span></label>`).join('') || '<div class="pick">尚未扫描到 Skill</div>'; }

async function loadSkills() {
  const button = $('#rescan'); button.classList.add('loading'); button.textContent = '↻ 扫描中…';
  try { const data = await request('/api/skills'); state.skills = data.skills; const libraryPath = data.config?.libraryPath || ''; $('#libraryPath').textContent = libraryPath || '尚未选择，将扫描默认目录'; renderFilters(); renderSkills(); renderPicker(); const sources = [...new Set(state.skills.map((item) => item.source))]; $('#sourceSummary').textContent = sources.length ? `来源：${sources.join('、')}` : '未发现 Skill，请检查扫描目录'; renderExperts(); }
  catch (error) { toast(error.message); } finally { button.classList.remove('loading'); button.textContent = '↻ 重新扫描'; }
}
async function loadExperts() { try { state.experts = await request('/api/experts'); renderExperts(); } catch (error) { toast(error.message); } }
function switchView(view) { state.view = view; document.querySelectorAll('.nav').forEach((el) => el.classList.toggle('active', el.dataset.view === view)); $('#skillsView').classList.toggle('hidden', view !== 'skills'); $('#expertsView').classList.toggle('hidden', view !== 'experts'); $('#pageTitle').textContent = view === 'skills' ? '发现趁手的 Skill' : '我的专家'; $('#pageDesc').textContent = view === 'skills' ? '集中管理 Codex 与 Claude Code 的能力扩展。' : '组合能力，让 Codex 在对话中自动选择合适的 Skill。'; $('.sidebar').classList.remove('open'); }
function expertPrompt(expert) { const skills = expert.skillIds.map((id) => state.skills.find((item) => item.id === id)).filter(Boolean); return `在接下来的整段对话中，请作为「${expert.name}」工作。\n${expert.description ? `目标：${expert.description}\n` : ''}根据我的任务，主动判断并使用以下 Skill：\n${skills.map((skill) => `- ${skill.command}：${skill.description}`).join('\n')}\n如果多个 Skill 适用，请合理编排使用顺序；开始任务前无需逐项询问。`; }

document.addEventListener('click', async (event) => {
  const nav = event.target.closest('[data-view]'); if (nav) switchView(nav.dataset.view);
  const filter = event.target.closest('[data-category]'); if (filter) { state.category = filter.dataset.category; renderFilters(); renderSkills(); }
  const use = event.target.closest('[data-use]'); if (use) { const skill = state.skills.find((item) => item.id === use.dataset.use); if (skill) { state.useSkillId = skill.id; $('#useSkillName').textContent = skill.name; $('#codexCommand').textContent = skill.codexCommand || `$${skill.name}`; $('#claudeCommand').textContent = skill.claudeCommand || `/${skill.name}`; $('#useDialog').showModal(); } }
  const platform = event.target.closest('[data-use-platform]'); if (platform) { const skill = state.skills.find((item) => item.id === state.useSkillId); if (skill) { const isCodex = platform.dataset.usePlatform === 'codex'; await copy(isCodex ? (skill.codexCommand || `$${skill.name}`) : (skill.claudeCommand || `/${skill.name}`), `${isCodex ? 'Codex' : 'Claude Code'} 口令已复制`); $('#useDialog').close(); } }
  const install = event.target.closest('[data-install]'); if (install) { const skill = state.skills.find((item) => item.id === install.dataset.install); if (skill) { state.installSkillId = skill.id; state.projectPath = ''; $('#installSkillName').textContent = skill.name; $('#projectPath').textContent = '尚未选择项目'; document.querySelector('input[name=scope][value=global]').checked = true; document.querySelector('input[name=installPlatform][value=claude]').checked = true; $('#projectSelect').classList.add('hidden'); updateInstallTarget(); $('#installDialog').showModal(); } }
  const expertUse = event.target.closest('[data-expert-use]'); if (expertUse) { const expert = state.experts.find((item) => item.id === expertUse.dataset.expertUse); if (expert) await copy(expertPrompt(expert), '专家口令已复制'); }
  const remove = event.target.closest('[data-delete]'); if (remove && confirm('确定删除这个专家吗？')) { await request(`/api/experts/${remove.dataset.delete}`, { method:'DELETE' }); await loadExperts(); toast('专家已删除'); }
});
$('#search').addEventListener('input', (event) => { state.query = event.target.value; renderSkills(); });
$('#rescan').addEventListener('click', loadSkills); $('#newExpert').addEventListener('click', () => $('#expertDialog').showModal()); $('#emptyCreate').addEventListener('click', () => $('#expertDialog').showModal()); $('#menuBtn').addEventListener('click', () => $('.sidebar').classList.toggle('open'));
document.querySelectorAll('[data-close-dialog]').forEach((button) => button.addEventListener('click', () => $('#expertDialog').close()));
document.querySelectorAll('[data-close-install]').forEach((button) => button.addEventListener('click', () => $('#installDialog').close()));
document.querySelectorAll('[data-close-use]').forEach((button) => button.addEventListener('click', () => $('#useDialog').close()));
function updateInstallTarget() { const scope = document.querySelector('input[name=scope]:checked')?.value || 'global'; const platform = document.querySelector('input[name=installPlatform]:checked')?.value || 'claude'; const folder = platform === 'codex' ? '.codex' : '.claude'; $('#installTarget').textContent = scope === 'global' ? `~/${folder}/skills` : `项目根目录/${folder}/skills`; $('#projectSelect').classList.toggle('hidden', scope !== 'project'); }
document.querySelectorAll('input[name=scope], input[name=installPlatform]').forEach((radio) => radio.addEventListener('change', updateInstallTarget));
async function browseDirectory(purpose, button) { const original = button.textContent; button.disabled = true; button.textContent = '等待系统窗口…'; try { const result = await request('/api/select-directory', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ purpose }) }); if (result.cancelled) return; if (purpose === 'library') { await request('/api/config', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ libraryPath:result.path }) }); toast('Skills 仓库已设置'); await loadSkills(); } else { state.projectPath = result.path; $('#projectPath').textContent = result.path; } } catch (error) { toast(error.message); } finally { button.disabled = false; button.textContent = original; } }
$('#chooseLibrary').addEventListener('click', (event) => browseDirectory('library', event.currentTarget));
$('#chooseProject').addEventListener('click', (event) => browseDirectory('project', event.currentTarget));
$('#clearLibrary').addEventListener('click', async () => { if (!confirm('确定清空 Skills 仓库路径吗？')) return; try { await request('/api/config/library', { method:'DELETE' }); toast('Skills 仓库路径已清空'); await loadSkills(); } catch (error) { toast(error.message); } });
$('#themeToggle').addEventListener('click', () => { const dark = document.documentElement.dataset.theme !== 'dark'; document.documentElement.dataset.theme = dark ? 'dark' : ''; localStorage.setItem('theme', dark ? 'dark' : 'light'); $('#themeToggle').innerHTML = dark ? '<span>☀</span> 切换浅色模式' : '<span>☾</span> 切换深色模式'; });
$('#expertForm').addEventListener('submit', async (event) => { event.preventDefault(); const skillIds = [...document.querySelectorAll('input[name=skill]:checked')].map((item) => item.value); try { await request('/api/experts', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ name:$('#expertName').value, description:$('#expertDescription').value, skillIds }) }); event.target.reset(); $('#expertDialog').close(); await loadExperts(); switchView('experts'); toast('专家创建成功'); } catch (error) { toast(error.message); } });
$('#installForm').addEventListener('submit', async (event) => { event.preventDefault(); const scope = document.querySelector('input[name=scope]:checked').value; const platform = document.querySelector('input[name=installPlatform]:checked').value; if (scope === 'project' && !state.projectPath) return toast('请先选择项目目录'); const submit = event.submitter; submit.disabled = true; submit.textContent = '安装中…'; try { const result = await request('/api/install', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ skillId:state.installSkillId, scope, platform, projectPath:state.projectPath }) }); $('#installDialog').close(); toast(`安装成功：${result.targetDir}`); await loadSkills(); } catch (error) { toast(error.message); } finally { submit.disabled = false; submit.textContent = '确认安装'; } });

if (localStorage.getItem('theme') === 'dark') { document.documentElement.dataset.theme = 'dark'; $('#themeToggle').innerHTML = '<span>☀</span> 切换浅色模式'; }
Promise.all([loadSkills(), loadExperts()]);
