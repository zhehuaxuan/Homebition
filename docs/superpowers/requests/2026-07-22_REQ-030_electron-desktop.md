---
title: Electron 桌面端需求分析
date: 2026-07-22
status: draft
---

# REQ-030: Electron 桌面端

## 1. 背景与目标

现有 Homebition 为 B/S 架构（Express 后端 + Vue 前端），运行在浏览器中。需要一个桌面端应用，复用现有 Vue 代码和服务端接口，同时提供更原生的桌面体验。

## 2. 架构原则

- **1 个服务端 + N 个客户端**：Express 后端独立运行，桌面端与浏览器是平级客户端
- **Vue 代码零改动**：所有 `src/` 下的组件、路由、API 调用在 Web 和 Desktop 间完全共享
- **增量集成**：在现有 `client/` 项目内新增 Electron 层，不影响现有 Web 开发流程

## 3. 方案选型

采用 **electron-vite + electron-builder** 方案：

| 考量点 | 选择 |
|--------|------|
| 构建工具 | electron-vite（Vite 官方生态推荐，兼容现有 Vite 配置） |
| 打包工具 | electron-builder（支持 exe/dmg/AppImage） |
| 窗口配置持久化 | electron-store |

## 4. 目录结构

```
client/
├── electron/                  ← 新增
│   ├── main.js                ← Electron 主进程
│   └── preload.js             ← 预加载脚本
├── src/                       ← 现有 Vue 代码（不变）
├── index.html                 ← 现有入口（不变）
├── vite.config.js             ← 加 electron-vite 适配
├── electron-builder.yml       ← 新增：打包配置
└── package.json               ← 加依赖和脚本
```

## 5. 功能设计

### 5.1 窗口管理
- 默认 1280×800，居中显示
- 窗口位置和大小持久化（`electron-store`）
- 关闭窗口最小化到托盘，不退出

### 5.2 系统托盘
- 托盘常驻图标
- 右键菜单：显示窗口、退出

### 5.3 原生菜单
- 标准菜单栏（文件、编辑、视图、窗口、帮助）
- F12 打开开发者工具

### 5.4 Preload API
通过 `contextBridge` 暴露给渲染进程：

```js
window.electronAPI = {
  getAppVersion(),     // 获取版本号
  onNotification(cb),  // 接收通知
  openDevTools(),      // 打开开发者工具
}
```

### 5.5 后端地址配置
- 默认 `http://localhost:3000`
- 首次启动或设置页面可配置
- 通过 `electron-store` 持久化

## 6. 开发与构建命令

| 命令 | 说明 |
|------|------|
| `npm run dev` | Web 开发（不变） |
| `npm run build` | Web 构建（不变） |
| `npm run electron:dev` | 桌面端开发（Vite + Electron 热更新） |
| `npm run electron:build` | 打包桌面安装包 |

## 7. 打包与分发

| 平台 | 安装包格式 |
|------|-----------|
| Windows | Homebition Setup x.x.x.exe（NSIS 安装包） |
| macOS | Homebition-x.x.x.dmg |
| Linux | Homebition-x.x.x.AppImage |

执行 `npm run electron:build` 输出到 `client/dist_electron/`。

## 8. 改动范围

**新增 3 个文件：**
- `client/electron/main.js`
- `client/electron/preload.js`
- `client/electron-builder.yml`

**修改 2 个文件：**
- `client/package.json`（加依赖：`electron`、`electron-vite`、`electron-builder`、`electron-store`）
- `client/vite.config.js`（加 electron-vite 适配）

**Vue 源码零改动。**
