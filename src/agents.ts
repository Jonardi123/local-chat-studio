import type{AgentName,AgentRun}from'./types';import{makeId}from'./id'
export const AGENTS:Record<AgentName,{label:string;role:string;prompt:string}>={
 grace:{label:'Grace',role:'Debugger',prompt:'Debug from evidence. Reproduce, isolate root cause, avoid symptom patches, and report verification.'},
 ada:{label:'Ada',role:'Architect',prompt:'Analyze architecture, boundaries, interfaces, dependencies, and a minimal implementation plan before code.'},
 knuth:{label:'Knuth',role:'Reviewer',prompt:'Review correctness, complexity, subtle logic risks, and unnecessary changes. Prefer precise findings over rewrites.'},
 margaret:{label:'Margaret',role:'Tester',prompt:'Test assumptions, edge cases, failures, persistence, and regressions. Return concrete evidence and gaps.'},
 linus:{label:'Linus',role:'Systems',prompt:'Investigate Linux, processes, build/runtime configuration, and performance using measured host evidence.'},
 turing:{label:'Turing',role:'Researcher',prompt:'Research unfamiliar technical questions, compare viable approaches, state uncertainty, and recommend from evidence.'}
}
const aliases=Object.keys(AGENTS)as AgentName[]
export function requestedAgents(text:string):AgentName[]{const lower=text.toLowerCase();if(!/\b(agent|agents|sub-agent|subagent)\b/.test(lower))return[];const named=aliases.filter(name=>lower.includes(name));if(named.length)return named;return /debug|crash|fail/.test(lower)?['grace']:/architect|plan|design/.test(lower)?['ada']:/test|reliab/.test(lower)?['margaret']:['ada','knuth']}
export function newAgentRun(name:AgentName):AgentRun{const a=AGENTS[name];return{id:makeId(),name,label:a.label,role:a.role,status:'waiting'}}
