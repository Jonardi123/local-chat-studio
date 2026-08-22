import type{Checkpoint,ChatRequestMessage,ContextState,Conversation,Message,Settings}from'./types'
export const CONTEXT_LIMIT=16384, CHECKPOINT_AT=8000, TARGET_AFTER_COMPACTION=6000
export const estimateTokens=(text:string)=>Math.max(1,Math.ceil(text.length/4))
const messageTokens=(m:{content:string})=>estimateTokens(m.content)+6
export function createCheckpoint(messages:Message[]):Checkpoint|undefined{
 if(messages.reduce((n,m)=>n+messageTokens(m),0)<CHECKPOINT_AT)return undefined
 let kept=0,split=messages.length
 while(split>0&&kept<TARGET_AFTER_COMPACTION){split--;kept+=messageTokens(messages[split])}
 if(split<2)return undefined
 const older=messages.slice(0,split), bullets=older.slice(-12).map(m=>`${m.role==='user'?'User':'Assistant'}: ${m.content.replace(/\s+/g,' ').slice(0,280)}`)
 return{summary:`Earlier conversation (${older.length} messages):\n${bullets.join('\n')}`,throughMessageId:older.at(-1)!.id,estimatedTokens:estimateTokens(bullets.join('\n')),updatedAt:Date.now()}
}
export function buildContext(chat:Conversation,settings:Settings):ContextState{
 const checkpoint=chat.checkpoint??createCheckpoint(chat.messages), through=checkpoint?chat.messages.findIndex(m=>m.id===checkpoint.throughMessageId):-1
 const recent=through>=0?chat.messages.slice(through+1):chat.messages
 const messages:ChatRequestMessage[]=[]
 if(settings.systemPrompt)messages.push({role:'system',content:settings.systemPrompt})
 if(checkpoint)messages.push({role:'system',content:`Conversation checkpoint (raw history remains archived):\n${checkpoint.summary}`})
 messages.push(...recent.filter(m=>m.content).map(m=>({role:m.role,content:m.content})))
 return{messages,usedTokens:messages.reduce((n,m)=>n+messageTokens(m),0),checkpoint,compacted:Boolean(checkpoint)}
}
export const contextPercent=(tokens:number)=>Math.min(100,Math.round(tokens/CONTEXT_LIMIT*100))
