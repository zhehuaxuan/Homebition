# Electron Desktop Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wrap the existing Homebition Vue app in an Electron shell using electron-vite + electron-builder. Vue source code (`src/`) unchanged — all changes are additive in `client/`.

**Architecture:** Add `electron/` directory under `client/` containing main process and preload script. Modify `package.json` and `vite.config.js` minimally. No changes to `src/`, `public/`, or `index.html`.

**Tech Stack:** electron (runtime), electron-vite (build tool), electron-builder (packaging), electron-store (persistence).

**Note:** `electron-vite` manages three Vite configs internally (main, preload, renderer) — it wraps around the existing `vite.config.js` for the renderer process. The existing Vue build pipeline is preserved for Web output. The electron-vite config is additive and does not break `npm run dev` / `npm run build`.

---

## Task 1: Install dependencies

**Files:**
- Modify: `client/package.json`

**Interfaces:**
- Consumes: existing Vue + Vite dependencies
- Produces: updated `package.json` with new electron-related scripts

- [ ] **Step 1: Add devDependencies**

Add to `client/package.json` `devDependencies`:
```json
"electron": "^33.0.0",
"electron-vite": "^2.4.0",
"electron-builder": "^25.0.0"
```

- [ ] **Step 2: Add dependencies**

Add to `client/package.json` `dependencies`:
```json
"electron-store": "^10.0.0"
```

- [ ] **Step 3: Add scripts**

Add to `client/package.json` `scripts`:
```json
"electron:dev": "electron-vite dev",
"electron:build": "electron-vite build && electron-builder"
```

- [ ] **Step 4: Run npm install**

```bash
cd client && npm install
```

---

## Task 2: Create electron-vite config

**Files:**
- Create: `client/electron.vite.config.js`

**Interfaces:**
- Consumes: existing `vite.config.js` renderer config
- Produces: a three-entry electron-vite config (main/preload/renderer)

- [ ] **Step 1: Create electron.vite.config.js**

Write `client/electron.vite.config.js`:
```javascript
import { resolve } from 'path'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import vue from '@vitejs/plugin-vue'
import vueJsx from '@vitejs/plugin-vue-jsx'
import AutoImport from 'unplugin-auto-import/vite'
import Components from 'unplugin-vue-components/vite'
import { ElementPlusResolver } from 'unplugin-vue-components/resolvers'

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    build: {
      rollupOptions: {
        input: { index: resolve(__dirname, 'electron/main.js') }
      }
    }
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    build: {
      rollupOptions: {
        input: { index: resolve(__dirname, 'electron/preload.js') }
      }
    }
  },
  renderer: {
    root: '.',
    build: {
      rollupOptions: {
        input: resolve(__dirname, 'index.html')
      }
    },
    resolve: {
      alias: {
        '@': resolve(__dirname, 'src')
      }
    },
    plugins: [
      vue(),
      AutoImport({
        resolvers: [ElementPlusResolver()],
        imports: ['vue'],
        dts: true
      }),
      Components({
        resolvers: [ElementPlusResolver({ importStyle: 'sass' })]
      }),
      vueJsx()
    ]
  }
})
```

Key design: `renderer.root: '.'` means it uses the existing `index.html` at `client/` level. The `vite.config.js` for web remains untouched.

---

## Task 3: Create Electron main process

**Files:**
- Create: `client/electron/main.js`

**Interfaces:**
- Consumes: `electron-store` for persistent state, `electron` APIs
- Produces: BrowserWindow, tray, menu, preload bridge

- [ ] **Step 1: Create main.js with window management**

Write `client/electron/main.js`:
```javascript
const { app, BrowserWindow, Tray, Menu, nativeImage } = require('electron')
const { join } = require('path')
const Store = require('electron-store')

const store = new Store({
  defaults: {
    windowBounds: { width: 1280, height: 800 },
    backendUrl: 'http://localhost:3000'
  }
})

let mainWindow = null
let tray = null

function createWindow() {
  const { width, height } = store.get('windowBounds')

  mainWindow = new BrowserWindow({
    width,
    height,
    minWidth: 900,
    minHeight: 600,
    show: false,
    webPreferences: {
      preload: join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  // Load renderer
  if (process.env.ELECTRON_RENDERER_URL) {
    mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL)
  } else {
    mainWindow.loadFile(join(__dirname, '../dist/index.html'))
  }

  // Show when ready
  mainWindow.once('ready-to-show', () => {
    mainWindow.show()
  })

  // Save window bounds on resize/move
  mainWindow.on('resize', () => {
    const bounds = mainWindow.getBounds()
    store.set('windowBounds', { width: bounds.width, height: bounds.height })
  })
  mainWindow.on('move', () => {
    const bounds = mainWindow.getBounds()
    store.set('windowBounds', { width: bounds.width, height: bounds.height })
  })

  // Minimize to tray instead of closing
  mainWindow.on('close', (event) => {
    if (!app.isQuitting) {
      event.preventDefault()
      mainWindow.hide()
    }
  })
}

// Create tray
function createTray() {
  const icon = nativeImage.createEmpty()
  tray = new Tray(icon)
  tray.setToolTip('Homebition')

  const contextMenu = Menu.buildFromTemplate([
    { label: '显示窗口', click: () => { mainWindow.show(); mainWindow.focus() } },
    { type: 'separator' },
    { label: '退出', click: () => { app.isQuitting = true; app.quit() } }
  ])
  tray.setContextMenu(contextMenu)

  tray.on('double-click', () => {
    mainWindow.show()
    mainWindow.focus()
  })
}

// Create application menu
function createMenu() {
  const template = [
    { label: '文件', submenu: [{ role: 'quit', label: '退出' }] },
    { label: '编辑', submenu: [{ role: 'undo' }, { role: 'redo' }, { type: 'separator' }, { role: 'cut' }, { role: 'copy' }, { role: 'paste' }] },
    { label: '视图', submenu: [{ role: 'reload' }, { role: 'forceReload' }, { role: 'toggleDevTools' }, { type: 'separator' }, { role: 'resetZoom' }, { role: 'zoomIn' }, { role: 'zoomOut' }] },
    { label: '窗口', submenu: [{ role: 'minimize' }, { role: 'close' }] },
    { label: '帮助', submenu: [{ label: '关于 Homebition', click: () => { /* TODO */ } }] }
  ]
  Menu.setApplicationMenu(Menu.buildFromTemplate(template))
}

app.whenReady().then(() => {
  createMenu()
  createWindow()
  createTray()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
```

Note: `const Store = require('electron-store')` uses CJS require since electron-vite's main process config uses `externalizeDepsPlugin()` which keeps node modules external.

---

## Task 4: Create preload script

**Files:**
- Create: `client/electron/preload.js`

**Interfaces:**
- Consumes: Electron contextBridge API
- Produces: `window.electronAPI` for renderer process

- [ ] **Step 1: Create preload.js**

Write `client/electron/preload.js`:
```javascript
const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  openDevTools: () => ipcRenderer.send('open-dev-tools'),
  onNotification: (callback) => {
    ipcRenderer.on('notification', (_event, data) => callback(data))
  }
})
```

- [ ] **Step 2: Add IPC handlers to main.js**

Append to `main.js` `app.whenReady()` block:
```javascript
ipcMain.handle('get-app-version', () => app.getVersion())
ipcMain.on('open-dev-tools', () => mainWindow.webContents.openDevTools())
```

---

## Task 5: Create electron-builder config

**Files:**
- Create: `client/electron-builder.yml`

**Interfaces:**
- Consumes: electron-vite build output at `client/out/`
- Produces: platform installers at `client/dist_electron/`

- [ ] **Step 1: Create electron-builder.yml**

Write `client/electron-builder.yml`:
```yaml
appId: com.homebition.app
productName: Homebition
directories:
  output: dist_electron
  buildResources: build
files:
  - '!**/*'
extraResources:
  - from: out/
    to: ''
    filter:
      - '**/*'
win:
  target:
    - target: nsis
      arch:
        - x64
  icon: build/icon.png
nsis:
  oneClick: false
  allowToChangeInstallationDirectory: true
mac:
  target:
    - target: dmg
      arch:
        - x64
  icon: build/icon.png
linux:
  target:
    - target: AppImage
      arch:
        - x64
```

Note: electron-builder reads `out/` as the source (electron-vite's build output directory). If electron-vite defaults to `dist/` instead, adjust the extraResources path.

---

## Task 6: Create tray icon

- [ ] **Step 1: Add default icon**

Create a placeholder icon at `client/build/icon.png` (at least 256×256 for Windows/macOS). This is required for building installers.

For development, the tray icon can use `nativeImage.createFromDataURL()` or a generated small PNG.

---

## Task 7: Verify development flow

- [ ] **Step 1: Test `npm run electron:dev`**

```bash
cd client && npm run electron:dev
```

Expected: Vite dev server starts, Electron window opens loading the app, hot reload works on Vue file changes.

- [ ] **Step 2: Test `npm run electron:build`**

```bash
cd client && npm run electron:build
```

Expected: electron-vite compiles main/preload/renderer to `out/`, electron-builder packages into `dist_electron/Homebition Setup x.x.x.exe`.

---

## Rollback Plan

If the electron integration causes issues:
1. `git checkout -- client/package.json client/vite.config.js` to revert modified files
2. `git clean -fd client/electron/` to remove new files
3. `git clean -f client/electron-builder.yml`
4. `npm install` to restore original lockfile state

Web build (`npm run dev` / `npm run build`) is completely unaffected by the electron additions.
