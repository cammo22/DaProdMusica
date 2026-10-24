import {readFile,writeFile} from 'node:fs/promises';
const version=process.argv[2];if(!/^\d+\.\d+\.\d+$/.test(version))throw Error('Use a semantic version');
for(const file of ['package.json','package-lock.json','src-tauri/tauri.conf.json']){const value=JSON.parse(await readFile(file,'utf8'));value.version=version;if(value.packages?.[''])value.packages[''].version=version;await writeFile(file,JSON.stringify(value,null,2)+'\n');}
for(const file of ['src/core.js','src-tauri/Cargo.toml']){const value=await readFile(file,'utf8');await writeFile(file,file.endsWith('.js')?value.replace(/VERSION = '[^']+'/,`VERSION = '${version}'`):value.replace(/^version = "[^"]+"/m,`version = "${version}"`));}
