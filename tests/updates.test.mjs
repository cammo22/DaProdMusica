import test from 'node:test';import assert from 'node:assert/strict';import {releaseForUpdates,androidAsset} from '../src/updates.js';
test('Updates open the actual newest preview rather than redirecting to an older stable release',()=>{const release=(tag,extra={})=>({tag_name:tag,html_url:`https://github.com/cammo22/DaProdMusica/releases/tag/${tag}`,draft:false,...extra});const preview=release('v0.3.0',{prerelease:true});assert.equal(releaseForUpdates([release('v0.2.0'),preview,release('v0.4.0',{draft:true}),release('v9.0.0',{html_url:'https://example.com'})]),preview);assert.equal(releaseForUpdates(null),null);});

test('Android updates select only the matching release APK with a complete SHA-256 digest',()=>{
 const tag='v0.5.0',name='DaProdMusica-0.5.0-Android-arm64.apk';
 const asset={name,browser_download_url:`https://github.com/cammo22/DaProdMusica/releases/download/${tag}/${name}`,digest:'sha256:'+'ab'.repeat(32)};
 assert.equal(androidAsset({tag_name:tag,assets:[asset]}),asset);
 for(const patch of [
  {name:'DaProdMusica-0.4.0-Android-arm64.apk'},
  {name:'DaProdMusica-0.5.0-Windows-x64.exe'},
  {browser_download_url:asset.browser_download_url.replace('github.com','example.org')},
  {browser_download_url:asset.browser_download_url.replace('/v0.5.0/','/v0.4.0/')},
  {browser_download_url:asset.browser_download_url+'?download=1'},
  {digest:undefined},{digest:'sha256:abc'},{digest:'sha256:'+'zz'.repeat(32)}
 ])assert.equal(androidAsset({tag_name:tag,assets:[{...asset,...patch}]}),null,JSON.stringify(patch));
 assert.equal(androidAsset({tag_name:tag,assets:[]}),null);
 assert.equal(androidAsset(null),null);
});
