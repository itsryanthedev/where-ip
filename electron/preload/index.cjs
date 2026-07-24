'use strict';

const { contextBridge, ipcRenderer } = require('electron');
const { IPC_CHANNELS } = require('../shared/ipc-channels.cjs');

contextBridge.exposeInMainWorld('whereipDesktop', {
  lookupPublicIp: (providerId) =>
    ipcRenderer.invoke(IPC_CHANNELS.lookupPublicIp, providerId),
  openExternalLink: (linkId) =>
    ipcRenderer.invoke(IPC_CHANNELS.openExternalLink, linkId),
  getAppVersion: () => ipcRenderer.sendSync(IPC_CHANNELS.getAppVersion),
});
