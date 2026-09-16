const fs=require('node:fs/promises'),path=require('node:path')
const safe=id=>String(id).replace(/[^a-zA-Z0-9_-]/g,'')
function createPersistence(rootDir){
 const chats=()=>path.join(rootDir,'chats'),config=()=>path.join(rootDir,'config.json')
 async function json(file,fallback){try{return JSON.parse(await fs.readFile(file,'utf8'))}catch{return fallback}}
 async function records(file){const lines=await fs.readFile(file,'utf8').catch(()=>'');return lines.split('\n').filter(Boolean).flatMap(line=>{try{return[JSON.parse(line)]}catch{return[]}})}
 async function load(){
  const data=await json(config(),null);if(!data)return null
  const loaded=new Map()
  for(const c of data.conversations??[]){const dir=path.join(chats(),safe(c.id)),meta=await json(path.join(dir,'metadata.json'),{}),raw=await records(path.join(dir,'messages.jsonl')),latest=new Map(raw.map(m=>[m.id,m])),ids=meta.activeMessageIds??[...latest.keys()];loaded.set(c.id,{...c,...meta,messages:ids.map(id=>latest.get(id)).filter(Boolean),checkpoint:await json(path.join(dir,'checkpoint.json'),undefined)})}
  for(const c of loaded.values())if(c.parentChatId&&c.parentMessageId){const parent=loaded.get(c.parentChatId);if(parent){const at=parent.messages.findIndex(m=>m.id===c.parentMessageId);if(at>=0)c.messages=[...parent.messages.slice(0,at+1),...c.messages]}}
  data.conversations=[...loaded.values()];return data
 }
 async function sync(data){
  await fs.mkdir(chats(),{recursive:true})
  for(const c of data.conversations??[]){
   const dir=path.join(chats(),safe(c.id));await fs.mkdir(path.join(dir,'attachments'),{recursive:true})
   const file=path.join(dir,'messages.jsonl'),raw=await records(file),latest=new Map(raw.map(m=>[m.id,m])),parentAt=c.parentMessageId?c.messages.findIndex(m=>m.id===c.parentMessageId):-1,own=parentAt>=0?c.messages.slice(parentAt+1):c.messages,fresh=own.filter(m=>m.content&&latest.get(m.id)?.content!==m.content)
   if(fresh.length)await fs.appendFile(file,fresh.map(m=>JSON.stringify(m)).join('\n')+'\n')
   await fs.writeFile(path.join(dir,'metadata.json'),JSON.stringify({version:1,id:c.id,title:c.title,createdAt:c.createdAt,updatedAt:c.updatedAt,parentChatId:c.parentChatId,parentMessageId:c.parentMessageId,activeMessageIds:own.filter(m=>m.content).map(m=>m.id)},null,2))
   if(c.checkpoint)await fs.writeFile(path.join(dir,'checkpoint.json'),JSON.stringify(c.checkpoint,null,2))
  }
  const compact={...data,conversations:(data.conversations??[]).map(c=>({...c,messages:[]}))};await fs.writeFile(config(),JSON.stringify(compact,null,2));return true
 }
 async function deleteChat(id){
  const chatId=safe(id);if(!chatId)return true
  const data=await json(config(),null)
  if(data){data.conversations=(data.conversations??[]).filter(c=>c.id!==id);const compact={...data,conversations:data.conversations.map(c=>({...c,messages:[]}))};await fs.writeFile(config(),JSON.stringify(compact,null,2))}
  await fs.rm(path.join(chats(),chatId),{recursive:true,force:true});return true
 }
 let queue=Promise.resolve()
 function enqueue(operation){queue=queue.then(operation);return queue}
 return{load,sync,deleteChat,enqueue}
}
module.exports={createPersistence}