import type{AppData,ArchiveHit,UpdateInfo,UpdateProgress}from'./types'
declare global{interface Window{sudoNStore?:{load:()=>Promise<AppData|null>;sync:(data:AppData)=>Promise<boolean>;search:(query:string,chatId?:string)=>Promise<ArchiveHit[]>;skill:(name:string)=>Promise<string|null>;modelSkills:(model:string,task:string)=>Promise<string>;clear:()=>Promise<boolean>;checkUpdate:()=>Promise<UpdateInfo>;downloadUpdate:()=>Promise<{path:string}>;onUpdateProgress:(callback:(progress:UpdateProgress)=>void)=>()=>void}}}
export{}
