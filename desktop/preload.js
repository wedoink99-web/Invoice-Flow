const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('InvoiceFlowDesktop', {
  savePdf: (name, base64, auto) => ipcRenderer.invoke('pdf:save', name, base64, !!auto),
  getPdfFolder: () => ipcRenderer.invoke('pdf:getFolder'),
  choosePdfFolder: () => ipcRenderer.invoke('pdf:chooseFolder'),
  licence: {
    machine: () => ipcRenderer.invoke('licence:machine'),
    anchorGet: () => ipcRenderer.invoke('licence:anchorGet'),
    anchorSet: (start, seen) => ipcRenderer.invoke('licence:anchorSet', start, seen),
    deviceInfo: () => ipcRenderer.invoke('licence:deviceInfo'),
    deviceSign: (text) => ipcRenderer.invoke('licence:deviceSign', text)
  }
});
