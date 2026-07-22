const { app, BrowserWindow, Tray, Menu, nativeImage, ipcMain, protocol, net } = require('electron')
const { join, extname } = require('path')
const { readFileSync, writeFileSync, existsSync, mkdirSync } = require('fs')

// Simple JSON file store (replaces electron-store which is ESM-only)
function createStore(defaults) {
  const filePath = join(app.getPath('userData'), 'config.json')
  let data = { ...defaults }

  try {
    if (existsSync(filePath)) {
      const raw = readFileSync(filePath, 'utf-8')
      data = { ...data, ...JSON.parse(raw) }
    }
  } catch (_) { /* ignore corrupt config, use defaults */ }

  return {
    get(key) { return data[key] },
    set(key, value) { data[key] = value; this._save() },
    _save() {
      try {
        const dir = join(app.getPath('userData'))
        if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
        writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8')
      } catch (_) { /* best-effort save */ }
    }
  }
}

const store = createStore({
  windowBounds: { width: 1280, height: 800 },
  backendUrl: 'http://47.103.67.107'
})

const MIME_TYPES = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.mjs': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.eot': 'application/vnd.ms-fontobject',
  '.wasm': 'application/wasm'
}

let mainWindow = null
let tray = null

// Register privileged custom protocol before app.ready
protocol.registerSchemesAsPrivileged([
  {
    scheme: 'homebition',
    privileges: {
      standard: true,
      secure: true,
      allowServiceWorkers: true,
      supportFetchAPI: true,
      corsEnabled: true,
      stream: true
    }
  }
])

function createWindow() {
  const { width, height } = store.get('windowBounds')

  mainWindow = new BrowserWindow({
    width,
    height,
    minWidth: 900,
    minHeight: 600,
    show: false,
    webPreferences: {
      preload: join(__dirname, process.env.ELECTRON_RENDERER_URL ? 'preload.js' : '../preload/index.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: false
    }
  })

  // Bypass CORS — inject permissive headers on all responses
  mainWindow.webContents.session.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Access-Control-Allow-Origin': ['*'],
        'Access-Control-Allow-Headers': ['*'],
        'Access-Control-Allow-Methods': ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS']
      }
    })
  })

  // Load renderer (dev server or built files via custom protocol)
  if (process.env.ELECTRON_RENDERER_URL) {
    mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL)
  } else {
    mainWindow.loadURL('homebition://localhost/index.html')
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow.show()
  })

  // Persist window bounds
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

function createTray() {
  const iconPath = join(__dirname, '../build/icon-tray.png')
  const icon = nativeImage.createFromPath(iconPath)
  tray = new Tray(icon)
  tray.setToolTip('Homebition')

  const contextMenu = Menu.buildFromTemplate([
    {
      label: '显示窗口',
      click: () => { mainWindow.show(); mainWindow.focus() }
    },
    { type: 'separator' },
    {
      label: '退出',
      click: () => { app.isQuitting = true; app.quit() }
    }
  ])
  tray.setContextMenu(contextMenu)

  tray.on('double-click', () => {
    mainWindow.show()
    mainWindow.focus()
  })
}

function createMenu() {
  const template = [
    {
      label: '文件',
      submenu: [{ role: 'quit', label: '退出' }]
    },
    {
      label: '编辑',
      submenu: [
        { role: 'undo' }, { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' }, { role: 'copy' }, { role: 'paste' }
      ]
    },
    {
      label: '视图',
      submenu: [
        { role: 'reload' }, { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' }, { role: 'zoomIn' }, { role: 'zoomOut' }
      ]
    },
    { label: '窗口', submenu: [{ role: 'minimize' }, { role: 'close' }] },
    {
      label: '帮助',
      submenu: [
        { label: '关于 Homebition', click: () => {} }
      ]
    }
  ]
  Menu.setApplicationMenu(Menu.buildFromTemplate(template))
}

app.whenReady().then(() => {
  // Handle custom protocol — serve static files from renderer output
  // Use readFileSync (supports asar virtual paths) instead of net.fetch (doesn't)
  protocol.handle('homebition', (request) => {
    let filePath
    try {
      // URL format: homebition://localhost/path/to/file
      const urlPath = request.url.slice('homebition://localhost'.length)
      filePath = join(__dirname, '../renderer', urlPath)
      const content = readFileSync(filePath)
      const ext = extname(urlPath)
      const contentType = MIME_TYPES[ext] || 'application/octet-stream'
      return new Response(content, {
        headers: { 'content-type': contentType }
      })
    } catch (err) {
      console.error('[protocol] 404:', err.message, 'for', request.url, 'resolved to', filePath)
      return new Response('Not Found', { status: 404 })
    }
  })

  createMenu()
  createWindow()
  createTray()

  // IPC handlers
  ipcMain.handle('get-app-version', () => app.getVersion())
  ipcMain.handle('get-backend-url', () => store.get('backendUrl'))
  ipcMain.handle('set-backend-url', (_event, url) => {
    store.set('backendUrl', url)
  })
  ipcMain.on('open-dev-tools', () => mainWindow.webContents.openDevTools())

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
