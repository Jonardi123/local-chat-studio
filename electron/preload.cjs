const{contextBridge,ipcRenderer}=require('electron')
contextBridge.exposeInMainWorld('sudoNStore',{
 load:()=>ipcRenderer.invoke('store:load'),sync:data=>ipcRenderer.invoke('store:sync',data),search:(query,chatId)=>ipcRenderer.invoke('history:search',{query,chatId}),skill:name=>ipcRenderer.invoke('skill:load',name),modelSkills:(model,task)=>ipcRenderer.invoke('skill:model',model,task),clear:()=>ipcRenderer.invoke('store:clear'),checkUpdate:()=>ipcRenderer.invoke('update:check'),downloadUpdate:()=>ipcRenderer.invoke('update:download'),onUpdateProgress:callback=>{const listener=(_event,value)=>callback(value);ipcRenderer.on('update:progress',listener);return()=>ipcRenderer.removeListener('update:progress',listener)}
})
