// Mac only: give the app a free "ad-hoc" signature so newer Macs (M1-M4) will run it.
const path = require('path');
const { execFileSync } = require('child_process');
exports.default = async function (context) {
  if (context.electronPlatformName !== 'darwin') return;
  const app = path.join(context.appOutDir, context.packager.appInfo.productFilename + '.app');
  execFileSync('codesign', ['--force', '--deep', '--sign', '-', app], { stdio: 'inherit' });
};
