const { app, BrowserWindow, shell, Menu, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

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
    webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true, preload: path.join(__dirname, 'preload.js') }
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

/* ---- PDF saving ---- */
const cfgFile = () => path.join(app.getPath('userData'), 'pdf-folder.json');
function pdfFolder() {
  try {
    const f = JSON.parse(fs.readFileSync(cfgFile(), 'utf8')).folder;
    if (f) return f;
  } catch (e) {}
  return app.getPath('downloads');
}
ipcMain.handle('pdf:getFolder', () => pdfFolder());
ipcMain.handle('pdf:chooseFolder', async () => {
  const r = await dialog.showOpenDialog(win, {
    title: 'Choose the folder where PDFs are saved',
    defaultPath: pdfFolder(),
    properties: ['openDirectory', 'createDirectory']
  });
  if (!r.canceled && r.filePaths[0]) {
    fs.writeFileSync(cfgFile(), JSON.stringify({ folder: r.filePaths[0] }));
  }
  return pdfFolder();
});
ipcMain.handle('pdf:save', (e, name, base64, auto) => {
  const dir = pdfFolder();
  fs.mkdirSync(dir, { recursive: true });
  const safe = path.basename(String(name)).replace(/[\\/:*?"<>|]+/g, ' ') || 'document.pdf';
  let full = path.join(dir, safe);
  const data = Buffer.from(String(base64), 'base64');
  try {
    fs.writeFileSync(full, data);
  } catch (err) {
    // the old copy may be open in a PDF viewer: save beside it with a time stamp
    full = path.join(dir, safe.replace(/\.pdf$/i, '') + ' ' + Date.now() + '.pdf');
    fs.writeFileSync(full, data);
  }
  if (!auto) shell.showItemInFolder(full);
  return { path: full };
});

app.on('second-instance', () => {
  if (win) { if (win.isMinimized()) win.restore(); win.focus(); }
});
app.whenReady().then(createWindow);
app.on('window-all-closed', () => app.quit());
