'use strict';

const fs = require('node:fs');
const path = require('node:path');
const {
  app,
  BrowserWindow,
  ipcMain,
  Menu,
  net,
  protocol,
  session,
  shell,
} = require('electron');

const { IPC_CHANNELS } = require('../shared/ipc-channels.cjs');
const {
  assertTrustedIpcSender,
  isTrustedIpcSender,
} = require('../shared/ipc-trust.cjs');
const { resolveAllowedLink } = require('../shared/links.cjs');
const { lookupPublicIp } = require('../shared/provider-lookup.cjs');
const {
  PROTOCOL_HOST,
  PROTOCOL_SCHEME,
  resolveProtocolPath,
} = require('../shared/protocol.cjs');

const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'none'",
  "frame-ancestors 'none'",
].join('; ');

protocol.registerSchemesAsPrivileged([
  {
    scheme: PROTOCOL_SCHEME,
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      corsEnabled: true,
      stream: true,
    },
  },
]);

/** @type {BrowserWindow | null} */
let mainWindow = null;

function getDistRoot() {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, 'dist-desktop');
  }
  return path.join(__dirname, '..', '..', 'dist-desktop');
}

function getPreloadPath() {
  return path.join(__dirname, '..', 'preload', 'index.cjs');
}

/**
 * @param {string} filePath
 */
function contentTypeFor(filePath) {
  switch (path.extname(filePath).toLowerCase()) {
    case '.html':
      return 'text/html; charset=utf-8';
    case '.js':
      return 'text/javascript; charset=utf-8';
    case '.css':
      return 'text/css; charset=utf-8';
    case '.json':
    case '.webmanifest':
      return 'application/json; charset=utf-8';
    case '.svg':
      return 'image/svg+xml';
    case '.png':
      return 'image/png';
    case '.jpg':
    case '.jpeg':
      return 'image/jpeg';
    case '.ico':
      return 'image/x-icon';
    case '.woff':
      return 'font/woff';
    case '.woff2':
      return 'font/woff2';
    default:
      return 'application/octet-stream';
  }
}

function registerAppProtocol() {
  const distRoot = getDistRoot();

  protocol.handle(PROTOCOL_SCHEME, async (request) => {
    const resolved = resolveProtocolPath(distRoot, request.url);
    if ('error' in resolved) {
      return new Response(resolved.error, {
        status: 400,
        headers: { 'content-type': 'text/plain; charset=utf-8' },
      });
    }

    let filePath = resolved.filePath;
    if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
      filePath = path.join(filePath, 'index.html');
    }

    if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
      const spaFallback = path.join(distRoot, 'index.html');
      if (fs.existsSync(spaFallback)) {
        filePath = spaFallback;
      } else {
        return new Response('Not found', {
          status: 404,
          headers: { 'content-type': 'text/plain; charset=utf-8' },
        });
      }
    }

    const body = fs.readFileSync(filePath);
    return new Response(body, {
      status: 200,
      headers: {
        'content-type': contentTypeFor(filePath),
        'cache-control': 'no-cache',
      },
    });
  });
}

function applyContentSecurityPolicy() {
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    const responseHeaders = { ...details.responseHeaders };
    responseHeaders['Content-Security-Policy'] = [CONTENT_SECURITY_POLICY];
    callback({ responseHeaders });
  });
}

function registerIpcHandlers() {
  ipcMain.handle(IPC_CHANNELS.lookupPublicIp, async (event, providerId) => {
    assertTrustedIpcSender(event, mainWindow?.webContents);
    return lookupPublicIp(providerId);
  });

  ipcMain.handle(IPC_CHANNELS.openExternalLink, async (event, linkId) => {
    assertTrustedIpcSender(event, mainWindow?.webContents);
    const url = resolveAllowedLink(linkId);
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:') {
      throw new Error('Only HTTPS external links are permitted');
    }
    await shell.openExternal(url);
  });

  ipcMain.on(IPC_CHANNELS.getAppVersion, (event) => {
    // Sync IPC must not throw: reject untrusted callers with an empty return.
    if (!isTrustedIpcSender(event, mainWindow?.webContents)) {
      event.returnValue = undefined;
      return;
    }
    event.returnValue = app.getVersion();
  });
}

function denyPermissionRequests() {
  session.defaultSession.setPermissionRequestHandler(
    (_webContents, _permission, callback) => {
      callback(false);
    },
  );
}

/**
 * @param {Electron.BrowserWindow} window
 */
function attachNavigationGuards(window) {
  window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));

  window.webContents.on('will-navigate', (event, url) => {
    const allowedPrefix = `${PROTOCOL_SCHEME}://${PROTOCOL_HOST}`;
    if (!url.startsWith(allowedPrefix)) {
      event.preventDefault();
    }
  });
}

function createMainWindow() {
  const window = new BrowserWindow({
    width: 960,
    height: 720,
    minWidth: 420,
    minHeight: 560,
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: getPreloadPath(),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
      allowRunningInsecureContent: false,
      experimentalFeatures: false,
    },
  });

  attachNavigationGuards(window);

  window.once('ready-to-show', () => {
    window.show();
  });

  void window.loadURL(`${PROTOCOL_SCHEME}://${PROTOCOL_HOST}/`);
  return window;
}

function buildApplicationMenu() {
  const isMac = process.platform === 'darwin';
  const template = [
    ...(isMac
      ? [
          {
            label: app.name,
            submenu: [
              { role: 'about' },
              { type: 'separator' },
              { role: 'services' },
              { type: 'separator' },
              { role: 'hide' },
              { role: 'hideOthers' },
              { role: 'unhide' },
              { type: 'separator' },
              { role: 'quit' },
            ],
          },
        ]
      : []),
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        ...(isMac ? [{ role: 'pasteAndMatchStyle' }, { role: 'selectAll' }] : [
          { type: 'separator' },
          { role: 'selectAll' },
        ]),
      ],
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'togglefullscreen' },
        ...(process.env.WHEREIP_ELECTRON_DEVTOOLS === '1'
          ? [{ role: 'toggleDevTools' }]
          : []),
      ],
    },
    {
      role: 'window',
      submenu: [{ role: 'minimize' }, { role: 'close' }],
    },
  ];

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) {
        mainWindow.restore();
      }
      mainWindow.focus();
    }
  });

  app.whenReady().then(() => {
    // Ensure Chromium networking is initialized before protocol.handle.
    void net;
    registerAppProtocol();
    applyContentSecurityPolicy();
    denyPermissionRequests();
    registerIpcHandlers();
    buildApplicationMenu();
    mainWindow = createMainWindow();

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        mainWindow = createMainWindow();
      }
    });
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      app.quit();
    }
  });
}
