# SkillForge

一个本地运行的 Codex 与 Claude Code Skills 管理工具。它可以扫描本机 Skills，将其整理成可搜索、可分类的卡片墙，并支持查看、编辑介绍、安装、复用和组合专家。

> 数据默认保存在本机，服务仅监听 `127.0.0.1`。

## 功能特性

- 自动扫描 Codex 与 Claude Code 的全局及当前项目 Skills
- 手动指定独立的 Skills 仓库目录
- 按名称、介绍、标签和来源搜索
- 为每个 Skill 添加最多 10 个自定义标签，并按标签筛选
- 区分展示仓库、全局安装和项目级安装的 Skills
- 同名全局 Skill 自动合并展示，并标明已安装的智能体
- 从 Skills 仓库同时或分别安装到 Codex、Claude Code
- 支持全局安装与项目级安装，显示实际目标路径
- 项目级目标目录缺失时，可确认后自动创建
- 按智能体选择并删除已全局安装的 Skill
- 点击卡片查看独立详情，并可继续编辑、安装或使用
- 手动编辑 Skill 的平台介绍，不修改原始 `SKILL.md`
- 可选接入 DeepSeek，读取完整 `SKILL.md` 并生成中文介绍
- 为 Codex 和 Claude Code 分别复制使用口令
- 将多个 Skills 组合为可复用的“专家”
- 支持深色与浅色主题
- 适配桌面端与移动端布局

## 环境要求

- Windows 10/11
- [Node.js](https://nodejs.org/) 18 或更高版本
- Codex 或 Claude Code（按需安装）

项目不依赖第三方 npm 软件包，无需执行 `npm install`。

## 快速开始

```powershell
git clone https://github.com/moyiyang11/SkillForge.git
cd SkillForge
npm start
```

浏览器访问 <http://127.0.0.1:4173>。

开发与检查命令：

```powershell
npm run dev
npm run check
```

## Skills 扫描范围

平台默认扫描以下目录中的 `SKILL.md`：

| 类型 | Codex | Claude Code |
| --- | --- | --- |
| 全局安装 | `~/.codex/skills` | `~/.claude/skills` |
| 当前项目 | `.codex/skills` | `.claude/skills` |

还可以在页面顶部点击“浏览文件夹”，选择一个独立的 Skills 仓库。仓库中的每个 Skill 应使用独立目录，并包含 `SKILL.md`：

```text
skills-library/
├── image-helper/
│   └── SKILL.md
└── content-writer/
    ├── SKILL.md
    └── references/
```

## 安装 Skills

只有来自“Skills 仓库”的卡片会显示安装按钮。安装时可以同时选择一个或两个平台，并选择安装范围：

| 平台 | 全局安装位置 | 项目级安装位置 |
| --- | --- | --- |
| Codex | `~/.codex/skills` | `项目根目录/.codex/skills` |
| Claude Code | `~/.claude/skills` | `项目根目录/.claude/skills` |

全局目标位置会显示当前电脑上的实际绝对路径，因此更换电脑或用户名后会自动适配。项目级安装会先检查所选项目中的智能体目录；如果 `.codex/skills` 或 `.claude/skills` 不存在，平台会询问是否自动创建。

如果任一目标位置已经存在同名目录，平台会停止本次安装，不会覆盖原文件，也不会只完成部分平台的安装。

## 管理 Skills

- 点击 Skill 卡片的非按钮区域，可打开独立详情弹窗。
- 详情中会显示名称、来源、标签和介绍，并提供编辑、安装（仓库 Skill）和使用入口。
- 同名的 Codex 与 Claude Code 全局 Skill 会合并为一张卡片。
- 删除合并后的全局 Skill 时，可以手动选择从 Codex、Claude Code 或两者中删除。
- 删除仅允许作用于当前用户的 `.codex/skills` 和 `.claude/skills` 目录。

### 编辑介绍与标签

每个 Skill 都可以在平台中编辑介绍，并逐个新增或删除卡片标签。每个 Skill 最多保存 10 个标签。

这些修改只保存在 SkillForge 的本地配置中，不会修改原始 `SKILL.md`。编辑后的标签会同步用于卡片展示、搜索和顶部筛选。

## AI 中文总结（可选）

页面右上角提供“配置 DeepSeek”入口：

- 配置 DeepSeek API Key 后，平台会读取对应的完整 `SKILL.md`，调用 `deepseek-chat` 生成不超过 120 字的简体中文介绍。
- 未配置 API Key 时，使用完整 `SKILL.md` 的正文生成本地基础摘要，不发起网络请求。
- AI 结果只会填入介绍编辑框，用户点击“保存”后才会写入本地配置。
- 无论使用哪种模式，平台都不会修改原始 `SKILL.md`。

> 使用 DeepSeek 时，完整 `SKILL.md` 内容会发送给 DeepSeek API。请勿对包含密钥、私人信息或其他敏感内容的 Skill 使用在线总结。

## 使用 Skills

点击卡片上的“使用”，选择目标平台后复制对应口令：

```text
Codex:       $skill-name
Claude Code: /skill-name
```

将复制的口令粘贴到对应工具的对话中即可。

## 专家组合

“专家”可以组合多个相关 Skills，例如内容创作、配图设计或代码审查。创建专家后，可以复制包含相关 Skills 的提示词，让模型在后续对话中根据任务选择能力。

## 本地数据与隐私

以下文件包含本机配置或用户数据，已通过 `.gitignore` 排除：

```text
data/config.json
data/experts.json
```

- `data/config.json`：保存 Skills 仓库路径、自定义介绍、标签和可选的 DeepSeek API Key
- `data/experts.json`：保存用户创建的专家组合
- 本地服务仅绑定 `127.0.0.1`，不会主动向局域网或公网开放
- 上传 GitHub 前，建议运行 `git status` 和 `git diff --cached`，确认本地配置与敏感信息未进入暂存区
- 不要使用 `git add -f data/config.json`，也不要将 DeepSeek API Key 写入源代码

## 项目结构

```text
.
├── public/
│   ├── index.html          # 页面结构
│   ├── app.js              # 前端交互与接口调用
│   ├── styles.css          # 基础样式
│   ├── install.css         # 安装与分组样式
│   └── manual-path.css     # 目录选择相关样式
├── data/                   # 本地配置与用户数据（不提交）
├── server.js               # HTTP 服务、扫描及安装逻辑
├── package.json
└── README.md
```

## 注意事项

- 原生目录选择窗口目前针对 Windows 实现。
- 选择目录时可以点击地址栏，或按 `Ctrl+L` 输入完整路径。
- 修改服务端代码后需要重新启动服务。
- 不建议将监听地址修改为 `0.0.0.0`，否则可能向局域网暴露本机 Skills 路径。

## 参与开发

欢迎通过 Issue 提交问题或功能建议，也可以 Fork 项目后提交 Pull Request。
