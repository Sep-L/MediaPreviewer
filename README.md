# MediaPreviewer

一个基于 **Tauri 2 + Vue 3 + TypeScript** 构建的本地媒体文件预览工具，专为 Windows 平台设计。

## 功能特性

- **拖拽加载**：直接将文件夹拖入窗口，递归扫描并展示所有媒体文件
- **多文件夹支持**：同时加载多个文件夹，按目录结构分组显示
- **缩略图预览**：调用 Windows Shell API 生成高质量缩略图，支持懒加载
- **图片预览模式**：全屏预览图片，支持缩放（滚轮）、拖拽平移、左右旋转、上下张切换
- **文件类型过滤**：按文件类型（全部 / 图片 / 其他）筛选显示
- **网格大小调节**：`Ctrl + 滚轮` 调整缩略图大小，支持配置缩放步长和最大尺寸上限
- **侧边栏导航**：文件夹树形导航，支持展开/折叠，点击快速滚动定位
- **右键菜单**：复制文件路径、在资源管理器中定位、删除文件、查看文件详情
- **文件夹管理**：从列表移除文件夹 / 永久删除文件夹（带确认弹窗）
- **最近文件夹**：记录最近打开的文件夹，方便快速重新加载
- **窗口状态持久化**：记忆窗口位置和大小
- **响应式布局**：侧边栏收起/展开时，图片区域平滑过渡，自动适配容器宽度

## 技术栈

| 层级 | 技术 |
|------|------|
| 前端框架 | Vue 3 + TypeScript (Composition API) |
| 构建工具 | Vite 6 |
| 桌面运行时 | Tauri 2 |
| 后端语言 | Rust |
| UI 组件库 | Element Plus |

## 项目结构

```
MediaPreviewer/
├── src/                        # 前端源码
│   ├── App.vue                 # 主应用组件（布局、状态、事件协调）
│   ├── main.ts                 # 入口文件
│   ├── components/             # UI 组件
│   │   ├── Sidebar.vue         # 侧边栏文件夹导航
│   │   ├── FileCard.vue        # 文件卡片（缩略图 + 文件名）
│   │   ├── PreviewModal.vue    # 图片全屏预览弹窗
│   │   ├── EmptyState.vue      # 空状态页（含最近文件夹）
│   │   ├── ContextMenu.vue     # 右键上下文菜单
│   │   ├── FileInfoPanel.vue   # 文件详情面板
│   │   ├── ConfirmDialog.vue   # 确认操作弹窗
│   │   ├── ZoomStepSelector.vue    # 缩放步长选择器
│   │   └── CurrentZoomSelector.vue # 当前缩放比例选择器
│   ├── composables/            # Vue 组合式函数
│   │   ├── useThumbnail.ts     # 缩略图加载与缓存管理
│   │   ├── usePreview.ts       # 图片预览状态（缩放/旋转/导航）
│   │   └── useRecentFolders.ts # 最近文件夹记录
│   └── types/                  # TypeScript 类型定义
│       └── index.ts
├── src-tauri/                  # Rust 后端源码
│   ├── src/
│   │   ├── lib.rs              # Tauri 命令实现
│   │   └── main.rs             # 程序入口
│   ├── Cargo.toml
│   └── tauri.conf.json         # Tauri 应用配置
├── index.html
├── package.json
├── vite.config.ts
└── tsconfig.json
```

## Tauri 后端命令

| 命令 | 说明 |
|------|------|
| `get_all_files` | 递归扫描多个文件夹，返回按目录分组的文件列表 |
| `get_thumbnail` | 调用 Windows Shell API 生成指定尺寸的缩略图（PNG） |
| `get_image_info` | 获取图片的宽度、高度、格式信息 |
| `get_file_stats` | 获取文件的创建时间和修改时间 |
| `open_in_explorer` | 在 Windows 资源管理器中定位并高亮文件 |
| `delete_file` | 删除指定文件（移入回收站） |
| `delete_folder` | 递归删除指定文件夹（移入回收站） |

## 支持的图片格式

`jpg` / `jpeg` / `png` / `gif` / `bmp` / `webp` / `ico` / `tiff` / `tif` / `avif` / `heic` / `heif` / `jxl` / `jfif` / `pjpeg` / `pjp`

## 开发环境

**前置要求：**
- [Node.js](https://nodejs.org/) 18+
- [Rust](https://www.rust-lang.org/tools/install) (stable)
- [Tauri CLI 前置依赖](https://tauri.app/start/prerequisites/)（仅 Windows）

**安装依赖：**
```bash
npm install
```

**开发模式：**
```bash
npm run tauri dev
```

**构建发布包：**
```bash
npm run tauri build
```

## 键盘快捷键

| 快捷键 | 功能 |
|--------|------|
| `Ctrl + 滚轮` | 调整缩略图大小 |
| `Ctrl + B` | 显示/隐藏侧边栏 |
| `Esc` | 关闭预览 / 清空当前加载的文件夹 |
| `←` / `→` | 预览模式下切换上一张/下一张 |
| `滚轮` | 预览模式下缩放图片 |
| `R` | 预览模式下向右旋转图片 |
| `Shift + R` | 预览模式下向左旋转图片 |
| `0` | 预览模式下重置缩放 |

## 布局与响应式

### 侧边栏切换动画

侧边栏收起/展开时，主内容区域宽度平滑过渡（350ms），图片卡片自动适配新宽度：

- **侧边栏展开**：主内容区变窄，图片自动缩小
- **侧边栏收起**：主内容区变宽，图片自动放大

卡片宽度使用 CSS 百分比变量 `--grid-percent`，浏览器原生响应容器变化，无需 JS 干预，确保过渡流畅无闪烁。

### 缩放控制

- **当前缩放比例**：控制每行显示的图片数量（10% = 一行10张，50% = 一行2张）
- **缩放步长**：`Ctrl + 滚轮` 每次调整的幅度（默认 1%）
- 配置自动保存到 `localStorage`，下次启动时恢复

## 缩略图加载策略

- **并发加载**：每批 16 个缩略图并发请求，充分利用多核 CPU
- **全量缓存**：加载后的缩略图保留在内存中，切换文件夹不清理，避免重复生成
- **缓存清理**：仅在应用卸载或加载新文件夹时清理旧缓存

## 文件删除

文件删除操作使用 Windows 回收站机制（`SHFileOperation` + `FOF_ALLOWUNDO`），误删文件可从回收站恢复。

## 平台支持

目前仅支持 **Windows**（缩略图生成依赖 Windows Shell API，删除操作依赖 Windows 回收站）。
