/* ============================================================================
   Seraph Augeo · escritorio
   Abre el HTML autocontenido en una ventana propia y hace, desde el proceso
   principal, las peticiones a los proveedores de IA. Así la app se comporta
   igual con cualquier proveedor: sin CORS, sin servidor local y sin que la
   clave pase por el motor del navegador.
   ============================================================================ */
'use strict';

const { app, BrowserWindow, ipcMain, shell, Menu } = require('electron');
const path = require('path');
const fs = require('fs');
const http = require('http');
const https = require('https');

const MAX_BYTES = 4 * 1024 * 1024;

/* El HTML se busca en el paquete instalado y, en desarrollo, junto al proyecto. */
function htmlPath() {
  const candidates = [
    path.join(process.resourcesPath || '', 'app', 'seraph-augeo-v3.html'),
    path.join(process.resourcesPath || '', 'seraph-augeo-v3.html'),
    path.join(__dirname, 'app', 'seraph-augeo-v3.html'),
    path.join(__dirname, '..', 'seraph-augeo-v3.html'),
  ];
  for (const c of candidates) {
    try { if (c && fs.existsSync(c)) return c; } catch (e) { /* sigue */ }
  }
  return candidates[candidates.length - 1];
}

/* Una petición HTTP/HTTPS mínima, con límite de tiempo y de tamaño. */
function request(o) {
  const opts = o || {};
  return new Promise((resolve) => {
    let u;
    try { u = new URL(String(opts.url || '')); } catch (e) {
      return resolve({ status: 0, text: '', error: 'url-invalida' });
    }
    if (u.protocol !== 'http:' && u.protocol !== 'https:') {
      return resolve({ status: 0, text: '', error: 'url-invalida' });
    }

    const lib = u.protocol === 'https:' ? https : http;
    const headers = Object.assign({}, opts.headers || {});
    const body = opts.body ? String(opts.body) : '';
    if (body) headers['Content-Length'] = Buffer.byteLength(body);

    let done = false;
    const finish = (v) => { if (!done) { done = true; resolve(v); } };

    const req = lib.request({
      protocol: u.protocol,
      hostname: u.hostname,
      port: u.port || undefined,
      path: u.pathname + u.search,
      method: opts.method || (body ? 'POST' : 'GET'),
      headers,
    }, (res) => {
      let data = '';
      res.setEncoding('utf8');
      res.on('data', (chunk) => {
        data += chunk;
        if (data.length > MAX_BYTES) { req.destroy(); finish({ status: res.statusCode, text: data.slice(0, MAX_BYTES) }); }
      });
      res.on('end', () => finish({ status: res.statusCode || 0, text: data }));
      res.on('error', () => finish({ status: 0, text: '', error: 'red' }));
    });

    req.setTimeout(Math.max(2000, Number(opts.timeoutMs) || 20000), () => {
      req.destroy();
      finish({ status: 0, text: '', error: 'timeout' });
    });
    req.on('error', (e) => {
      const t = String((e && e.code) || '');
      finish({ status: 0, text: '', error: t === 'ETIMEDOUT' ? 'timeout' : t === 'ECONNREFUSED' ? 'sin-conexion' : 'cors-o-red' });
    });

    if (body) req.write(body);
    req.end();
  });
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1180,
    height: 900,
    minWidth: 360,
    minHeight: 560,
    backgroundColor: '#07070a',
    title: 'Seraph Augeo',
    autoHideMenuBar: true,
    show: false,
    icon: path.join(__dirname, 'build', 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      spellcheck: false,
    },
  });

  win.once('ready-to-show', () => win.show());
  win.loadFile(htmlPath());

  /* Los enlaces externos se abren en el navegador del sistema, nunca dentro. */
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:/i.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });
  win.webContents.on('will-navigate', (ev, url) => {
    if (!url.startsWith('file://')) {
      ev.preventDefault();
      if (/^https?:/i.test(url)) shell.openExternal(url);
    }
  });

  return win;
}

app.whenReady().then(() => {
  Menu.setApplicationMenu(null);
  ipcMain.handle('seraph:http', (ev, opts) => request(opts));
  ipcMain.handle('seraph:version', () => ({ app: app.getVersion(), electron: process.versions.electron, platform: process.platform }));
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
