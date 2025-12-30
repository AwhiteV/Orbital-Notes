# Orbital Notes 🚀

**Orbital Notes** 是一款专为高效工作者打造的轻量级、悬浮式个人笔记工具。它像卫星一样悬浮在您的桌面边缘，随时捕捉每一闪而过的灵感或关键信息。

---

## ✨ 核心特性

- **🪐 智能悬浮球**：极简的机器人形态悬浮球，支持自由拖拽，始终置顶，点击即刻开启记录。
- **⌨️ 快速唤起**：默认支持 `Alt + 1` 快捷键隐藏/显示悬浮球，让您的桌面保持整洁。
- **📝 沉浸式编辑**：支持完美渲染的 Markdown 格式（包括表格），并提供 `<Note>`（提示框）和 `<Accordion>`（折叠面板）等高级自定义组件。
- **🗂️ 笔记管理**：内置强大的笔记管理器，支持标签分类、全文搜索、原地编辑，以及支持鼠标拖拽调整左右比例的响应式布局。
- **🪟 窗口控制**：笔记管理器支持最小化、最大化/全屏切换，深度集成系统窗口操作体验。
- **🎨 现代美学**：基于 [AwhiteV] 的审美偏好设计，采用 Jakarta Sans 字体，支持暗色模式，拥有丝滑的交互动画。

---

## 📸 界面展示

### 🤖 Orbital 悬浮球界面
![悬浮球](assets/bot_display.jpg)

### 🪐 笔记管理器
![笔记管理器](assets/note_manager.jpg)

### 📝 编辑与预览界面
#### 编辑模式
![编辑模式](assets/quick_notes_edit.png)

#### Markdown 渲染预览
![渲染预览](assets/quick_notes_md_preview.png)

### ⚙️ 设置与标签管理
#### 常规设置
![常规设置](assets/settings.jpg)

#### 快捷键配置
![快捷键配置](assets/settings_shortcuts.jpg)

#### 标签管理
![标签管理](assets/tag.png)

---

## 🚀 快速开始

### 运行环境
- Node.js (建议 v16+)
- npm 或 yarn

### 安装步骤
1. 克隆或下载本项目
2. 在根目录执行安装依赖：
   ```bash
   npm install
   ```
3. 启动应用：
   ```bash
   npm start
   ```

## 🛠️ 快捷键指南

- **隐藏/显示悬浮球**：`Alt + 1` (可在设置中自定义)
- **左键点击悬浮球**：快速记录
- **右键点击悬浮球**：打开笔记管理器

## 🛠️ 技术栈

- **Core**: Electron
- **Frontend**: HTML5, Vanilla JavaScript, Tailwind CSS
- **Storage**: electron-store (支持自定义数据存储路径)

---

> 由 **AwhiteV** 打造，旨在让记录成为一种享受。
