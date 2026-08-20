# SkillForge

一个本地运行的 Codex 与 Claude Code Skills 管理工具。它可以扫描本机 Skills，将其整理成可搜索、可分类的卡片墙，支持查看、编辑介绍、安装、复用和组合「专家」。界面采用现代极简设计语言（参考 Linear / Raycast / Vercel），支持深浅色主题。

> 数据默认保存在本机，服务仅监听 `127.0.0.1`。

## 功能特性

- 自动扫描 Codex 与 Claude Code 的全局及当前项目 Skills
- 手动指定独立的 Skills 仓库目录
- 按名称、介绍、标签和来源搜索，标签以胶囊筛选
- 为每个 Skill 添加最多 10 个自定义标签
- 区分展示「Skills 仓库 / 全局安装 / 项目级安装」，同名全局 Skill 自动合并
- 从 Skills 仓库同时或分别安装到 Codex、Claude Code（全局 / 项目级）
- 仓库卡片提供 **安装 / 使用 / 删除**；全局卡片提供 **使用 / 删除**
- 勾选卡片可 **批量使用 / 批量安装 / 批量删除**（删除为纯确认弹窗，不再逐个勾选）
- 支持删除 Skills 仓库中的源 Skill 与已全局安装的 Skill，删除前会做路径安全校验
- 点击卡片查看独立详情，并可继续编辑、安装或使用
- 手动编辑 Skill 的介绍与标签，不修改原始 `SKILL.md`
- 可选接入 DeepSeek，读取完整 `SKILL.md` 生成中文介绍
- 将多个 Skills 组合为可复用的「专家」，支持**创建、编辑、删除**
- 新建专家只从 Skills 仓库中挑选 Skill；复制的专家口令会**注明 Skills 仓库路径**
- 一键复制专家 / Skill 口令，供 Codex、Claude Code 直接使用
- 内置「**关于**」页面：简明操作手册与联系方式
- 支持深色与浅色主题；动效遵循 `prefers-reduced-motion` 无障碍规范

## 环境要求

- Windows 10/11
- [Node.js](https://nodejs.org/) 18 或更高版本（运行）
- Codex 或 Claude Code（按需安装）
- [bun](https://bun.sh)（仅打包 exe 时需要，`npm install -g bun`）

运行不依赖第三方 npm 软件包，无需执行 `npm install`。

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

## 打包为单文件 exe

可打包为便携单文件 exe，双击即启动本地服务，并自动弹出**独立应用窗口**（Chrome / Edge 应用模式，无标签栏、无地址栏，像桌面软件）：

```powershell
npm run build:exe
```

- 产物：`dist/skill-forge.exe`（约 95MB，内置运行时与全部静态资源，无控制台窗口）
- 数据保存在 **exe 旁边的 `data/` 文件夹**
- 双击 exe：应用已在运行则直接打开其窗口；否则自动启动服务并打开窗口
- 端口 4173 被占用时自动顺延，或复用正在运行的本应用实例
- 首次运行若被 SmartScreen 拦截（未签名 exe）：右键 → 属性 → 勾选「解除锁定」

## Skills 扫描范围

平台默认扫描以下目录中的 `SKILL.md`：

| 类型 | Codex | Claude Code |
| --- | --- | --- |
| 全局安装 | `~/.codex/skills` | `~/.claude/skills` |
| 当前项目 | `.codex/skills` | `.claude/skills` |

还可以在页面顶部点击「浏览文件夹」，选择一个独立的 Skills 仓库。仓库中的每个 Skill 应使用独立目录，并包含 `SKILL.md`：

```text
skills-library/
├── image-helper/
│   └── SKILL.md
└── content-writer/
    ├── SKILL.md
    └── references/
```

未选择仓库时，顶部会显示斜体提示「尚未选择 Skills 目录，请选择一个目录」。

## 安装 Skills

只有来自「Skills 仓库」的卡片会显示安装按钮。安装时可以同时选择一个或两个平台，并选择安装范围：

| 平台 | 全局安装位置 | 项目级安装位置 |
| --- | --- | --- |
| Codex | `~/.codex/skills` | `项目根目录/.codex/skills` |
| Claude Code | `~/.claude/skills` | `项目根目录/.claude/skills` |

全局目标位置会显示当前电脑上的实际绝对路径，因此更换电脑或用户名后会自动适配。项目级安装会先检查所选项目中的智能体目录；如果 `.codex/skills` 或 `.claude/skills` 不存在，平台会询问是否自动创建。

如果任一目标位置已经存在同名目录，平台会停止本次安装，不会覆盖原文件，也不会只完成部分平台的安装。

## 管理 Skills

- 卡片右上角「⋯」菜单收纳编辑等次级操作；卡片底部直接提供主操作按钮
- 点击 Skill 卡片的非按钮区域，可打开独立详情弹窗
- 同名的 Codex 与 Claude Code 全局 Skill 会合并为一张卡片
- 删除操作（单个或批量）均为**纯确认弹窗**：只读列出待删 Skill 与路径，确认后删除
- 删除仅允许作用于当前用户的 `.codex/skills`、`.claude/skills` 与 **Skills 仓库**目录内

### 编辑介绍与标签

每个 Skill 都可以在平台中编辑介绍，并逐个新增或删除卡片标签。每个 Skill 最多保存 10 个标签。

这些修改只保存在 SkillForge 的本地配置中，不会修改原始 `SKILL.md`。编辑后的标签会同步用于卡片展示、搜索和顶部筛选。

## AI 中文总结（可选）

页面右上角提供「配置 DeepSeek」入口：

- 配置 DeepSeek API Key 后，平台会读取对应的完整 `SKILL.md`，调用 `deepseek-chat` 生成不超过 120 字的简体中文介绍，并推荐一组卡片标签。
- 未配置 API Key 时，使用完整 `SKILL.md` 的正文生成本地基础摘要，并根据分类规则与 frontmatter 标签生成推荐标签，不发起网络请求。
- AI 结果会同时填入介绍编辑框并替换为推荐的卡片标签，用户点击「保存」后才会写入本地配置。
- 无论使用哪种模式，平台都不会修改原始 `SKILL.md`。

> 使用 DeepSeek 时，完整 `SKILL.md` 内容会发送给 DeepSeek API。请勿对包含密钥、私人信息或其他敏感内容的 Skill 使用在线总结。

## 使用 Skills

点击卡片上的「使用」，选择目标平台后复制对应口令：

```text
Codex:       $skill-name
Claude Code: /skill-name
```

将复制的口令粘贴到对应工具的对话中即可。

## 专家组合

「专家」可以组合多个相关 Skills，例如内容创作、配图设计或代码审查。

- 新建 / 编辑专家时，只能从 **Skills 仓库** 中挑选 Skill
- 复制的专家口令会注明 **Skills 仓库路径**，让模型知道这些 Skill 的存放位置
- 创建后可在卡片上继续编辑或删除专家
- 复制专家口令后，模型会在后续对话中根据任务自动选择并编排对应的 Skill

## 本地数据与隐私

以下文件包含本机配置或用户数据，已通过 `.gitignore` 排除：

```text
data/config.json
data/experts.json
```

- `data/config.json`：保存 Skills 仓库路径、自定义介绍、标签和可选的 DeepSeek API Key
- `data/experts.json`：保存用户创建的专家组合
- 本地服务仅绑定 `127.0.0.1`，不会主动向局域网或公网开放
- 打包为 exe 后，数据保存在 exe 旁边的 `data/` 文件夹
- 上传 GitHub 前，建议运行 `git status` 和 `git diff --cached`，确认本地配置与敏感信息未进入暂存区
- 不要使用 `git add -f data/config.json`，也不要将 DeepSeek API Key 写入源代码

## 关于与联系

侧边栏「ℹ 关于」页面内含本操作手册的简明版与联系方式。使用中遇到问题或有任何建议，欢迎联系作者：**QQ 347605045**。

## 项目结构

```text
.
├── public/                    # 前端静态资源（打包时内联进 exe）
│   ├── index.html             # 页面结构
│   ├── app.js                 # 前端交互与接口调用
│   ├── styles.css             # 基础样式与设计层
│   ├── install.css            # 安装与分组样式
│   └── manual-path.css        # 目录选择相关样式
├── scripts/
│   └── build-exe.js           # exe 打包脚本（内联资源 + bun 编译）
├── data/                      # 本地配置与用户数据（不提交）
├── dist/                      # 打包产物（不提交）
├── server.js                  # HTTP 服务、扫描、安装及删除逻辑
├── package.json
└── README.md
```

## 注意事项

- 原生目录选择窗口目前针对 Windows 实现。
- 选择目录时可以点击地址栏，或按 `Ctrl+L` 输入完整路径。
- 修改服务端代码后需要重新启动服务。
- 不建议将监听地址修改为 `0.0.0.0`，否则可能向局域网暴露本机 Skills 路径。
- 删除 Skills 仓库中的 Skill 会真正删除仓库内对应的源文件夹，请留意确认弹窗中的路径。

## 参与开发

欢迎通过 Issue 提交问题或功能建议，也可以 Fork 项目后提交 Pull Request。
