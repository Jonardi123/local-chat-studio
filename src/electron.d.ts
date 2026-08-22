import type{AppData,ArchiveHit}from'./types'
declare global{interface Window{sudoNStore?:{load:()=>Promise<AppData|null>;sync:(data:AppData)=>Promise<boolean>;search:(query:string,chatId?:string)=>Promise<ArchiveHit[]>;skill:(name:string)=>Promise<string|null>;clear:()=>Promise<boolean>}}}
export{}
