import { createLogger, Logger } from './logger'

type ErrorChannel = 'render' | 'async'

interface ReportErrorParams {
  location: string
  error: unknown
  userMessage: string
  context?: Record<string, unknown>
}

interface ErrorReporter {
  reportRenderError(params: ReportErrorParams): string
  reportAsyncError(params: ReportErrorParams): string
}

const getErrorDetails = (
  error: unknown
): {
  errorMessage: string
  errorStack?: string
} => {
  if (error instanceof Error) {
    return {
      errorMessage: error.message,
      errorStack: error.stack,
    }
  }

  return {
    errorMessage: String(error),
  }
}

const getChannelLabel = (channel: ErrorChannel): string => {
  return channel === 'render' ? 'Render' : 'Async'
}

const reportError = (
  logger: Logger,
  channel: ErrorChannel,
  { location, error, userMessage, context }: ReportErrorParams
): string => {
  const details = getErrorDetails(error)

  logger.error(`${getChannelLabel(channel)} error in ${location}`, {
    ...context,
    userMessage,
    errorMessage: details.errorMessage,
    errorStack: details.errorStack,
  })

  return userMessage
}

export const createErrorReporter = (
  scope: string,
  logger: Logger = createLogger(scope)
): ErrorReporter => {
  return {
    reportRenderError(params) {
      return reportError(logger, 'render', params)
    },
    reportAsyncError(params) {
      return reportError(logger, 'async', params)
    },
  }
}

export type { ErrorReporter, ReportErrorParams }
