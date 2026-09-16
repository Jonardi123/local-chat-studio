import{createRequire}from'node:module';import fs from'node:fs/promises';import os from'node:os';import path from'node:path';import{describe,expect,it}from'vitest'
const require=createRequire(import.meta.url),{createPersistence}=require('./persistence.cjs')
type Persistence=ReturnType<typeof createPersistence>
interface PersistedMessage{id:string;role:string;content:string;createdAt:number}
interface PersistedChat{id:string;title:string;createdAt:number;updatedAt:number;messages:PersistedMessage[];activeMessageIds:string[]}
function chat(id:string):PersistedChat{return{id,title:id,createdAt:1,updatedAt:1,messages:[{id:id+'-m1',role:'user',content:'hello',createdAt:1}],activeMessageIds:[id+'-m1']}}
async function freshPersistence():Promise<{rootDir:string;persistence:Persistence}>{const rootDir=await fs.mkdtemp(path.join(os.tmpdir(),'sudon-'));return{rootDir,persistence:createPersistence(rootDir)}}
async function readConfig(rootDir:string):Promise<{conversations:PersistedChat[]}>{return JSON.parse(await fs.readFile(path.join(rootDir,'config.json'),'utf8')) as{conversations:PersistedChat[]}}
describe('desktop persistence ordering',()=>{
 it('a queued save cannot resurrect a chat deleted afterwards',async()=>{
  const{rootDir,persistence}=await freshPersistence()
  const order:string[]=[]
  const save=persistence.enqueue(async()=>{order.push('save');return persistence.sync({conversations:[chat('chat-a'),chat('chat-b')]})})
  const del=persistence.enqueue(async()=>{order.push('delete');return persistence.deleteChat('chat-a')})
  await Promise.all([save,del])
  const dirs=(await fs.readdir(path.join(rootDir,'chats'))).sort()
  const data=await readConfig(rootDir)
  expect(order).toEqual(['save','delete'])
  expect(dirs).toEqual(['chat-b'])
  expect(data.conversations.map((c:PersistedChat)=>c.id)).toEqual(['chat-b'])
 })
 it('delete removes the persisted conversation entry and stays idempotent',async()=>{
  const{rootDir,persistence}=await freshPersistence()
  await persistence.sync({conversations:[chat('only')]})
  await persistence.deleteChat('missing-id')
  expect((await readConfig(rootDir)).conversations.map((c:PersistedChat)=>c.id)).toEqual(['only'])
  await persistence.deleteChat('only')
  expect((await readConfig(rootDir)).conversations.map((c:PersistedChat)=>c.id)).toEqual([])
  expect((await fs.readdir(path.join(rootDir,'chats'))).length).toBe(0)
  await expect(persistence.deleteChat('only')).resolves.toBe(true)
 })
 it('a later save of a different chat leaves the deleted chat gone',async()=>{
  const{rootDir,persistence}=await freshPersistence()
  await persistence.sync({conversations:[chat('old')]})
  const del=persistence.enqueue(()=>persistence.deleteChat('old'))
  const save=persistence.enqueue(async()=>persistence.sync({conversations:[chat('new')]}))
  await Promise.all([del,save])
  const data=await readConfig(rootDir)
  expect(data.conversations.map((c:PersistedChat)=>c.id)).toEqual(['new'])
  expect((await fs.readdir(path.join(rootDir,'chats'))).sort()).toEqual(['new'])
 })
})