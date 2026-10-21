const { app, BrowserWindow, shell, Menu } = require('electron');
const path = require('path');

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) app.quit();

let win = null;
const external = (url) => /^(https?|mailto|tel):/i.test(url);

function createWindow() {
  Menu.setApplicationMenu(null);
  win = new BrowserWindow({
    width: 1280,
    height: 850,
    minWidth: 900,
    minHeight: 600,
    title: 'InvoiceFlow',
    icon: path.join(__dirname, 'www', 'icon-512.png'),
    backgroundColor: '#f1f2f4',
    webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true }
  });
  win.loadFile(path.join(__dirname, 'www', 'index.html'));
  // WhatsApp / email / web links open in the normal browser or mail program
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (external(url)) shell.openExternal(url);
    return { action: 'deny' };
  });
  win.webContents.on('will-navigate', (e, url) => {
    if (!url.startsWith('file:')) {
      e.preventDefault();
      if (external(url)) shell.openExternal(url);
    }
  });
  win.on('closed', () => { win = null; });
}

app.on('second-instance', () => {
  if (win) { if (win.isMinimized()) win.restore(); win.focus(); }
});
app.whenReady().then(createWindow);
app.on('window-all-closed', () => app.quit());
