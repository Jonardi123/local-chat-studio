import { describe, expect, it } from 'vitest'
import { makeId } from './id'
describe('message IDs',()=>{it('uses randomUUID when available',()=>{expect(makeId({randomUUID:()=> 'native-id'})).toBe('native-id')});it('creates a UUID when packaged contexts omit randomUUID',()=>{const id=makeId({getRandomValues:array=>{array.fill(7);return array}});expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/)})})
