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
/* ---- licence: computer code + trial anchor files (outside browser storage, so clearing data does not restart the trial) ---- */
const crypto = require('crypto');
const { execFile } = require('child_process');
const anchorFiles = () => [
  path.join(app.getPath('userData'), 'licence-anchor.json'),
  path.join(app.getPath('appData'), 'InvoiceFlow-licence-anchor.json')
];
function readAnchors() {
  let start = 0, seen = 0;
  anchorFiles().forEach((f) => {
    try {
      const j = JSON.parse(fs.readFileSync(f, 'utf8'));
      const s = Number(j.start) || 0, n = Number(j.seen) || 0;
      if (s && (!start || s < start)) start = s;
      if (n > seen) seen = n;
    } catch (e) {}
  });
  return { start, seen };
}
ipcMain.handle('licence:anchorGet', () => readAnchors());
ipcMain.handle('licence:anchorSet', (e, start, seen) => {
  const now = Date.now(), cur = readAnchors();
  let s = Number(start) || 0, n = Math.min(Number(seen) || 0, now + 2 * 86400000);
  if (cur.start && (!s || cur.start < s)) s = cur.start;
  if (cur.seen > n) n = cur.seen;
  anchorFiles().forEach((f) => { try { fs.writeFileSync(f, JSON.stringify({ start: s, seen: n })); } catch (err) {} });
  return true;
});
function machineFile() { return path.join(app.getPath('userData'), 'licence-machine.json'); }
function fmtMachine(hex) { return hex.toUpperCase().slice(0, 16).replace(/(.{4})(?=.)/g, '$1-'); }
ipcMain.handle('licence:machine', () => new Promise((resolve) => {
  const fallback = () => {
    try { const j = JSON.parse(fs.readFileSync(machineFile(), 'utf8')); if (j.m) return resolve(j.m); } catch (e) {}
    const m = fmtMachine(crypto.randomBytes(8).toString('hex'));
    try { fs.writeFileSync(machineFile(), JSON.stringify({ m })); } catch (e) {}
    resolve(m);
  };
  if (process.platform !== 'win32') return fallback();
  execFile('reg', ['query', 'HKLM\\SOFTWARE\\Microsoft\\Cryptography', '/v', 'MachineGuid'], { windowsHide: true, timeout: 8000 }, (err, out) => {
    const mt = !err && /MachineGuid\s+REG_SZ\s+(\S+)/i.exec(String(out));
    if (!mt) return fallback();
    resolve(fmtMachine(crypto.createHash('sha256').update('tillflow-machine:' + mt[1]).digest('hex')));
  });
}));
/* ---- licence: security-chip key (TPM when Windows has one, otherwise Windows' protected software store) ---- */
const DEV_PS = `
$ErrorActionPreference = 'Stop'
$name = 'InvoiceFlowLicence'
$mode = $args[0]
function Get-DevKey($prov) {
  $p = New-Object System.Security.Cryptography.CngProvider($prov)
  if ([System.Security.Cryptography.CngKey]::Exists($name, $p)) { return [System.Security.Cryptography.CngKey]::Open($name, $p) }
  $cp = New-Object System.Security.Cryptography.CngKeyCreationParameters
  $cp.Provider = $p
  $cp.KeyUsage = [System.Security.Cryptography.CngKeyUsages]::Signing
  return [System.Security.Cryptography.CngKey]::Create([System.Security.Cryptography.CngAlgorithm]::ECDsaP256, $name, $cp)
}
$key = $null; $hw = ''
foreach ($pair in @(@('Microsoft Platform Crypto Provider', 'tpm'), @('Microsoft Software Key Storage Provider', 'software'))) {
  try { $key = Get-DevKey $pair[0]; $hw = $pair[1]; break } catch { $key = $null }
}
if ($key -eq $null) { throw 'no key' }
if ($mode -eq 'info') {
  $blob = $key.Export([System.Security.Cryptography.CngKeyBlobFormat]::EccPublicBlob)
  $x = ($blob[8..39] | ForEach-Object { $_.ToString('x2') }) -join ''
  $y = ($blob[40..71] | ForEach-Object { $_.ToString('x2') }) -join ''
  Write-Output (@{ ok = $true; x = $x; y = $y; hw = $hw } | ConvertTo-Json -Compress)
} else {
  $msg = [System.Text.Encoding]::UTF8.GetBytes($args[1])
  $ec = New-Object System.Security.Cryptography.ECDsaCng($key)
  $ec.HashAlgorithm = [System.Security.Cryptography.CngAlgorithm]::Sha256
  $sig = $ec.SignData($msg)
  $b64 = [Convert]::ToBase64String($sig).Replace('+', '-').Replace('/', '_').TrimEnd('=')
  Write-Output (@{ ok = $true; sig = $b64 } | ConvertTo-Json -Compress)
}
`;
function runDev(args) {
  return new Promise((resolve) => {
    if (process.platform !== 'win32') return resolve({ ok: false });
    const script = Buffer.from(DEV_PS, 'utf16le').toString('base64');
    // the script reads its arguments from the environment-free command line after -EncodedCommand
    execFile('powershell.exe', ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command',
      '& ([ScriptBlock]::Create([Text.Encoding]::Unicode.GetString([Convert]::FromBase64String(\'' + script + '\')))) ' + args.map((a) => "'" + String(a).replace(/'/g, "''") + "'").join(' ')],
      { windowsHide: true, timeout: 30000 }, (err, out) => {
        if (err) return resolve({ ok: false });
        try { resolve(JSON.parse(String(out).trim().split(/\r?\n/).pop())); } catch (e) { resolve({ ok: false }); }
      });
  });
}
let devInfoCache = null;
ipcMain.handle('licence:deviceInfo', async () => {
  if (devInfoCache && devInfoCache.ok) return devInfoCache;
  devInfoCache = await runDev(['info']);
  return devInfoCache;
});
ipcMain.handle('licence:deviceSign', (e, text) => runDev(['sign', String(text)]));
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
