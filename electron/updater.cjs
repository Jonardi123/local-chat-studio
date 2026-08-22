const ASSET_PATTERNS={darwin:/mac-universal\.dmg$/i,win32:/win-x64\.exe$/i,linux:/linux-x86_64\.AppImage$/i}
function versionParts(value){return String(value).replace(/^v/,'').split('.').slice(0,3).map(part=>Number.parseInt(part,10)||0)}
function isNewer(latest,current){const a=versionParts(latest),b=versionParts(current);for(let i=0;i<3;i+=1){if(a[i]!==b[i])return a[i]>b[i]}return false}
function selectAsset(release,platform){const pattern=ASSET_PATTERNS[platform];return pattern?(release.assets??[]).find(asset=>pattern.test(asset.name)):undefined}
module.exports={isNewer,selectAsset}
