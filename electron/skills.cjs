const fs=require('node:fs/promises'),path=require('node:path')

const stripFrontmatter=text=>text.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/,'').trim()
const safeSkillPath=(root,relative)=>{const resolved=path.resolve(root,String(relative));return resolved.startsWith(path.resolve(root)+path.sep)?resolved:null}
function selectModelProfile(registry,model){
 const value=String(model??'').toLowerCase(),entries=Object.entries(registry.models??{})
 if(!value&&registry.defaultModel)return registry.models?.[registry.defaultModel]??null
 return entries.find(([,profile])=>(profile.match??[]).some(fragment=>value.includes(String(fragment).toLowerCase())))?.[1]??null
}
function selectSkillPaths(registry,model,task){
 const profile=selectModelProfile(registry,model);if(!profile)return[]
 const selected=new Set(profile.always??[]),text=String(task??'')
 for(const route of profile.routes??[])if((route.patterns??[]).some(pattern=>new RegExp(pattern,'i').test(text)))for(const skill of route.skills??[])selected.add(skill)
 return[...selected]
}
async function readSkills(root,paths){const contents=[];for(const relative of paths){const file=safeSkillPath(root,relative);if(!file)continue;const content=await fs.readFile(file,'utf8').catch(()=>null);if(content)contents.push(stripFrontmatter(content))}return contents.join('\n\n')}
async function registryAt(root){try{return JSON.parse(await fs.readFile(path.join(root,'registry.json'),'utf8'))}catch{return{}}}
async function loadModelSkillBundle(root,model,task){const registry=await registryAt(root);return readSkills(root,selectSkillPaths(registry,model,task))}
async function loadAgentSkill(root,name){const registry=await registryAt(root),entry=registry.agents?.[String(name)];return entry?readSkills(root,[entry.skill]):''}

module.exports={loadAgentSkill,loadModelSkillBundle,selectModelProfile,selectSkillPaths,stripFrontmatter}
