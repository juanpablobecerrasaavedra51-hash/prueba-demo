/* ============================================================================
   Puente mínimo entre la app y el proceso principal.
   Sólo expone dos cosas: una petición HTTP controlada y la versión del entorno.
   Nada de Node dentro de la página.
   ============================================================================ */
'use strict';

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('seraphDesktop', {
  httpJson: (opts) => ipcRenderer.invoke('seraph:http', {
    url: String(opts && opts.url || ''),
    method: opts && opts.method || 'POST',
    headers: (opts && opts.headers) || {},
    body: opts && opts.body != null ? String(opts.body) : '',
    timeoutMs: Number(opts && opts.timeoutMs) || 20000,
  }),
  version: () => ipcRenderer.invoke('seraph:version'),
});
