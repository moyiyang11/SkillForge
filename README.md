# Skills 管理平台

一个本地运行的 Codex 与 Claude Code Skills 管理工具。它可以扫描本机 Skills，将其整理成可搜索、可分类的卡片墙，并支持安装、复制使用口令和组合专家。

> 数据默认保存在本机，服务仅监听 `127.0.0.1`。

## 功能特性

- 自动扫描 Codex 与 Claude Code 的全局及当前项目 Skills
- 手动指定独立的 Skills 仓库目录
- 按名称、描述和来源搜索
- 按能力分类筛选
- 区分展示仓库、全局安装和项目级安装的 Skills
- 从 Skills 仓库安装到 Codex 或 Claude Code
- 支持全局安装与项目级安装
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
git clone <你的仓库地址>
cd skill管理平台
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

只有来自“Skills 仓库”的卡片会显示安装按钮。安装时可以选择平台与范围：

| 平台 | 全局安装位置 | 项目级安装位置 |
| --- | --- | --- |
| Codex | `~/.codex/skills` | `项目根目录/.codex/skills` |
| Claude Code | `~/.claude/skills` | `项目根目录/.claude/skills` |

如果目标位置已经存在同名目录，平台会停止安装，不会覆盖原文件。

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

- `data/config.json`：保存所选 Skills 仓库的本地绝对路径
- `data/experts.json`：保存用户创建的专家组合
- 本地服务仅绑定 `127.0.0.1`，不会主动向局域网或公网开放
- 上传 GitHub 前，建议运行 `git status --short --ignored` 确认本地数据未被跟踪

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
