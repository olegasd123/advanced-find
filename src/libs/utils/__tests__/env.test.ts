import { describe, expect, it } from 'vitest'
import { readIntegerEnv } from '../env'

describe('readIntegerEnv', () => {
  it('returns fallback when value is missing', () => {
    expect(readIntegerEnv(undefined, { fallback: 120, minValue: 1 })).toBe(120)
  })

  it('returns fallback when value is not a number', () => {
    expect(readIntegerEnv('abc', { fallback: 6, minValue: 0 })).toBe(6)
  })

  it('returns fallback when value is below minimum', () => {
    expect(readIntegerEnv('-1', { fallback: 6, minValue: 0 })).toBe(6)
  })

  it('returns parsed integer when value is valid', () => {
    expect(readIntegerEnv('250', { fallback: 120, minValue: 1 })).toBe(250)
  })
})
