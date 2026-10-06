import { describe, expect, it } from 'vitest'
import { detectMobile } from './device'

const MAC = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15'
const IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148'
const ANDROID = 'Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Mobile Safari/537.36'

describe('Mac oder Handy', () => {
  it('Mac ist kein Handy – iPhone, Android, iPad und die iPhone-App schon', () => {
    expect(detectMobile(false, MAC, 0)).toBe(false)
    expect(detectMobile(false, IPHONE, 5)).toBe(true)
    expect(detectMobile(false, ANDROID, 5)).toBe(true)
    expect(detectMobile(false, MAC, 5)).toBe(true) // iPad gibt sich als Mac aus
    expect(detectMobile(true, '', 0)).toBe(true)
  })
})
