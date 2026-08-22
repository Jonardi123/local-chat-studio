type RandomSource = { randomUUID?: () => string; getRandomValues?: (array: Uint8Array<ArrayBuffer>) => Uint8Array<ArrayBuffer> }
export function makeId(source: RandomSource = globalThis.crypto): string {
  if (typeof source?.randomUUID === 'function') return source.randomUUID()
  const bytes = new Uint8Array(new ArrayBuffer(16))
  if (typeof source?.getRandomValues === 'function') source.getRandomValues(bytes)
  else for (let i=0;i<bytes.length;i+=1) bytes[i]=Math.floor(Math.random()*256)
  bytes[6]=(bytes[6]&0x0f)|0x40; bytes[8]=(bytes[8]&0x3f)|0x80
  const hex=[...bytes].map(value=>value.toString(16).padStart(2,'0')).join('')
  return `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`
}
