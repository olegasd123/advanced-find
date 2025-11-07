type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface Logger {
  debug(message: string, context?: Record<string, unknown>): void;
  info(message: string, context?: Record<string, unknown>): void;
  warn(message: string, context?: Record<string, unknown>): void;
  error(message: string, context?: Record<string, unknown>): void;
}

const consoleMap: Record<LogLevel, (message?: unknown, ...optionalParams: unknown[]) => void> = {
  debug: console.debug ?? console.log,
  info: console.info ?? console.log,
  warn: console.warn ?? console.log,
  error: console.error ?? console.log,
};

function formatContext(context?: Record<string, unknown>): Record<string, unknown> | undefined {
  if (!context || Object.keys(context).length === 0) {
    return undefined;
  }

  return context;
}

export function createLogger(scope: string): Logger {
  function log(level: LogLevel, message: string, context?: Record<string, unknown>): void {
    const payload = formatContext(context);
    const prefix = `[${scope}]`;

    if (payload) {
      consoleMap[level](`${prefix} ${message}`, payload);
      return;
    }

    consoleMap[level](`${prefix} ${message}`);
  }

  return {
    debug(message, context) {
      log('debug', message, context);
    },
    info(message, context) {
      log('info', message, context);
    },
    warn(message, context) {
      log('warn', message, context);
    },
    error(message, context) {
      log('error', message, context);
    },
  };
}

