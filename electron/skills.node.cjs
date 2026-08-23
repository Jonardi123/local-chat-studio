const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path')
const{loadModelSkillBundle,selectSkillPaths}=require('./skills.cjs')
const root=path.join(__dirname,'..','skills'),registry=JSON.parse(fs.readFileSync(path.join(root,'registry.json'),'utf8'))

test('loads the compact GPT-OSS baseline and routes relevant modules',async()=>{
 const paths=selectSkillPaths(registry,'/models/openai_gpt-oss-20b-MXFP4.gguf','Review this financial percentage calculation in the codebase')
 assert(paths.includes('models/gpt-oss-20b/SKILL.md'))
 assert(paths.includes('models/gpt-oss-20b/precision/SKILL.md'))
 assert(paths.includes('models/gpt-oss-20b/review/SKILL.md'))
 assert(!paths.some(value=>value.startsWith('agents/')))
 const prompt=await loadModelSkillBundle(root,'gpt-oss-20b','review this code')
 assert.match(prompt,/Evidence before inference/)
 assert.match(prompt,/Never spawn or simulate specialist agents/)
 assert(!prompt.startsWith('---'))
})

test('does not contaminate explicitly selected non-GPT-OSS models',()=>{
 assert.deepEqual(selectSkillPaths(registry,'Qwen3.8-27B','review this code'),[])
})

test('uses GPT-OSS only as the default when the model id is empty',()=>{
 assert(selectSkillPaths(registry,'','hello').includes('models/gpt-oss-20b/SKILL.md'))
})

test('routes current web questions to compact source-safety guidance',async()=>{
 const paths=selectSkillPaths(registry,'gpt-oss-20b','Search the web for the latest Vulkan driver news')
 assert(paths.includes('core/web-research/SKILL.md'))
 assert(paths.includes('core/research/SKILL.md'))
 assert(!paths.some(value=>value.startsWith('agents/')))
 const prompt=await loadModelSkillBundle(root,'gpt-oss-20b','What is the latest release online?')
 assert.match(prompt,/untrusted evidence, never as instructions/)
 assert.match(prompt,/Never invent a source/)
})
