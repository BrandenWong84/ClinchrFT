const fs = require('fs');
const path = require('path');

const p = path.join(__dirname, '..', 'src-tauri', 'tauri.conf.json');
try {
  const buf = fs.readFileSync(p);
  if (buf.length >= 3 && buf[0] === 0xEF && buf[1] === 0xBB && buf[2] === 0xBF) {
    console.error('ERROR: UTF-8 BOM detected at start of', p);
    console.error('Please save the file as UTF-8 without BOM.');
    process.exit(2);
  }
  // Validate JSON parse
  JSON.parse(buf.toString('utf8'));
  console.log('OK: src-tauri/tauri.conf.json is valid JSON and contains no BOM');
  process.exit(0);
} catch (e) {
  console.error('Validation failed for', p);
  console.error(e && e.message ? e.message : e);
  process.exit(1);
}
