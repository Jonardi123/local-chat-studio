import type { AppData, Settings } from './types'
export const STORAGE_KEY = 'local-chat-studio:v1'
export const defaultSettings:Settings = { baseUrl:'http://192.168.100.6:8080/v1', apiKey:'', model:'', temperature:0.7, maxTokens:2048, systemPrompt:'You are a helpful, thoughtful assistant.', theme:'system' }
export const defaultData = ():AppData => ({ version:1, settings:{...defaultSettings}, conversations:[], activeId:null, onboarded:false })
export function normalizeBaseUrl(value:string):string { return value.trim().replace(/\/+$/, '').replace(/\/v1$/, '') + '/v1' }
export function migrateData(value:unknown):AppData {
  const fallback=defaultData(); if(!value || typeof value!=='object') return fallback
  const raw=value as Partial<AppData>; const settings=raw.settings && typeof raw.settings==='object' ? {...defaultSettings,...raw.settings} : fallback.settings
  return {version:1,settings:{...settings,baseUrl:normalizeBaseUrl(settings.baseUrl)},conversations:Array.isArray(raw.conversations)?raw.conversations:[],activeId:typeof raw.activeId==='string'?raw.activeId:null,onboarded:Boolean(raw.onboarded)}
}
export function loadData():AppData { try { const raw=localStorage.getItem(STORAGE_KEY); return raw?migrateData(JSON.parse(raw)):defaultData() } catch { return defaultData() } }
export function saveData(data:AppData):void { localStorage.setItem(STORAGE_KEY,JSON.stringify(data)) }
export function exportData(data:AppData):void { const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'}); const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url;a.download=`local-chat-backup-${new Date().toISOString().slice(0,10)}.json`;a.click();URL.revokeObjectURL(url) }
