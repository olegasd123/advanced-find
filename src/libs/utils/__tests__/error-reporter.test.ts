import { describe, expect, it, vi } from 'vitest'
import { createErrorReporter } from '../error-reporter'
import { Logger } from '../logger'

const createLoggerMock = (): Logger => {
  return {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }
}

describe('error-reporter', () => {
  it('reports async errors and returns user message', () => {
    const logger = createLoggerMock()
    const reporter = createErrorReporter('test-scope', logger)
    const error = new Error('Network failed')

    const userMessage = reporter.reportAsyncError({
      location: 'load app configuration',
      error,
      userMessage: 'Failed to load app configuration.',
      context: { path: '/assets/app-config.json' },
    })

    expect(userMessage).toBe('Failed to load app configuration.')
    expect(logger.error).toHaveBeenCalledTimes(1)
    expect(logger.error).toHaveBeenCalledWith('Async error in load app configuration', {
      path: '/assets/app-config.json',
      userMessage: 'Failed to load app configuration.',
      errorMessage: 'Network failed',
      errorStack: error.stack,
    })
  })

  it('reports render errors with unknown values', () => {
    const logger = createLoggerMock()
    const reporter = createErrorReporter('test-scope', logger)

    reporter.reportRenderError({
      location: 'filter view',
      error: 'Unexpected value',
      userMessage: 'The filter view failed to render.',
    })

    expect(logger.error).toHaveBeenCalledTimes(1)
    expect(logger.error).toHaveBeenCalledWith('Render error in filter view', {
      userMessage: 'The filter view failed to render.',
      errorMessage: 'Unexpected value',
      errorStack: undefined,
    })
  })
})
