// Node 18+ script — finds frontend @tauri uses and Rust #[tauri::command] functions,
// writes allowlist-report.json and exits non-zero if tauri.conf.json.allowlist.all === true.

const fs = require('fs');
const path = require('path');

function readFiles(dir, exts){
  const out = [];
  const stack = [dir];
  while(stack.length){
    const p = stack.pop();
    if(!fs.existsSync(p)) continue;
    for(const name of fs.readdirSync(p)){
      const fp = path.join(p,name);
      const st = fs.statSync(fp);
      if(st.isDirectory()) stack.push(fp);
      else {
        if(exts.includes(path.extname(name))) out.push(fp);
      }
    }
  }
  return out;
}

function scanPatterns(files, patterns){
  const used = new Set();
  for(const f of files){
    const s = fs.readFileSync(f,'utf8');
    for(const [key, rx] of Object.entries(patterns)){
      if(rx.test(s)) used.add(key);
    }
  }
  return [...used];
}

// allow overriding repo root (useful for tests)
const repoRoot = process.env.CLINCHRFT_REPO_ROOT ? path.resolve(process.env.CLINCHRFT_REPO_ROOT) : path.resolve(__dirname,'..');
const frontFiles = readFiles(path.join(repoRoot,'src'),['.ts','.tsx','.js','.jsx']);
const rustFiles = readFiles(path.join(repoRoot,'src-tauri','src'),['.rs']);

const frontPatterns = {
  'invoke': /invoke\s*\(/,
  'window.tauri': /window\.tauri/,
  '@tauri-api': /@tauri-apps\/api/
};

// extract specific @tauri-apps/api modules (e.g. @tauri-apps/api/fs)
const tauriModuleRe = /@tauri-apps\/api\/([a-zA-Z0-9_-]+)/g;

const rustPatterns = {
  'tauri_command': /#\s*\[\s*(?:tauri::command|command)\s*]/,
  'tauri::api': /tauri::api::/
};

const frontendUses = scanPatterns(frontFiles, frontPatterns);
const rustUses = scanPatterns(rustFiles, rustPatterns);

// extract command fn names from Rust files (supports both `tauri::command` and `command`)
const commandNames = [];
for(const f of rustFiles){
  const s = fs.readFileSync(f,'utf8');
  if(/#\s*\[\s*(?:tauri::command|command)\s*]/.test(s)){
    const re = /#\s*\[\s*(?:tauri::command|command)\s*]\s*[\r\n\s]*pub\s+fn\s+([a-zA-Z0-9_]+)/g;
    let m;
    while((m=re.exec(s))){ commandNames.push(m[1]); }
  }
}

// detect specific frontend @tauri-apps/api modules
const frontendModules = new Set();
for(const f of frontFiles){
  const s = fs.readFileSync(f,'utf8');
  let m;
  while((m = tauriModuleRe.exec(s))){ frontendModules.add(m[1]); }
}

// Map certain frontend module labels to clearer allowlist keys for reviewers
const moduleLabelMap = {
  'tauri': 'invoke'
};
const frontendModulesMapped = [...frontendModules].map(m => moduleLabelMap[m] || m);

// read tauri.conf.json allowlist
let tauriConf = {};
const confPath = path.join(repoRoot,'src-tauri','tauri.conf.json');
if(fs.existsSync(confPath)){
  try { tauriConf = JSON.parse(fs.readFileSync(confPath,'utf8')); } catch(e) { /* ignore */ }
}

const allowAll = tauriConf?.tauri?.allowlist?.all === true;

const report = {
  timestamp: new Date().toISOString(),
  frontendUses,
  frontendModules: [...frontendModules],
  frontendModulesMapped,
  rustUses,
  commandNames,
  tauriAllowlist: tauriConf?.tauri?.allowlist || null,
  allowAll
};

fs.writeFileSync(path.join(repoRoot,'allowlist-report.json'), JSON.stringify(report,null,2), 'utf8');

console.log('allowlist-report.json written. Summary:');
console.log(JSON.stringify({frontendUses, frontendModules: [...frontendModules], frontendModulesMapped, rustUses, commandNames, allowAll}, null, 2));

if(allowAll){
  console.error('ERROR: tauri.conf.json allowlist.all is true — please replace with a minimal allowlist.');
  process.exit(1);
}
process.exit(0);
