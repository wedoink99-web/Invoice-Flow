const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('InvoiceFlowDesktop', {
  savePdf: (name, base64, auto) => ipcRenderer.invoke('pdf:save', name, base64, !!auto),
  getPdfFolder: () => ipcRenderer.invoke('pdf:getFolder'),
  choosePdfFolder: () => ipcRenderer.invoke('pdf:chooseFolder')
});
