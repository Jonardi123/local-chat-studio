import { afterEach, expect, it, vi } from 'vitest'
import { streamChat } from './api'
import { defaultSettings } from './storage'

afterEach(() => vi.unstubAllGlobals())

it.each([false, true])('stops at DONE and releases the stream (split chunks: %s)', async (split) => {
  const token = 'data: {"choices":[{"delta":{"content":"Hello"}}]}\n\n'
  const done = 'data: [DONE]\n\n'
  const late = 'data: {"choices":[{"delta":{"content":"late"}}]}\n\n'
  const read = vi.fn()
  for (const chunk of split ? [token, done + late] : [token + done + late]) {
    read.mockResolvedValueOnce({ done: false, value: new TextEncoder().encode(chunk) })
  }
  read.mockRejectedValue(new Error('Read past the completion marker'))
  const reader = { read, cancel: vi.fn().mockResolvedValue(undefined), releaseLock: vi.fn() }
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, body: { getReader: () => reader } }))
  const onToken = vi.fn()
  const result = await streamChat({ settings: defaultSettings, messages: [], signal: new AbortController().signal, onToken })
  expect(result.content).toBe('Hello')
  expect(onToken).toHaveBeenCalledExactlyOnceWith('Hello')
  expect(reader.cancel).toHaveBeenCalledOnce()
  expect(reader.releaseLock).toHaveBeenCalledOnce()
})
