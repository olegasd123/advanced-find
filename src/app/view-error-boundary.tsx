import * as React from 'react'
import { createLogger } from '../libs/utils/logger'

const logger = createLogger('crm-view-error-boundary')

interface ViewErrorBoundaryProps {
  viewName: string
  message: string
  resetKey?: string
  children: React.ReactNode
}

interface ViewErrorBoundaryState {
  hasError: boolean
}

export class ViewErrorBoundary extends React.Component<
  ViewErrorBoundaryProps,
  ViewErrorBoundaryState
> {
  state: ViewErrorBoundaryState = { hasError: false }

  static getDerivedStateFromError(): ViewErrorBoundaryState {
    return { hasError: true }
  }

  componentDidCatch(error: unknown): void {
    logger.error(`Failed to render ${this.props.viewName}`, {
      error: error instanceof Error ? error.message : String(error),
    })
  }

  componentDidUpdate(previousProps: Readonly<ViewErrorBoundaryProps>): void {
    if (this.props.resetKey !== previousProps.resetKey && this.state.hasError) {
      this.setState({ hasError: false })
    }
  }

  handleRetry = (): void => {
    this.setState({ hasError: false })
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="mt-3 rounded-lg border border-rose-300 bg-rose-50 px-4 py-3 text-rose-800">
          <div className="font-medium">Something went wrong.</div>
          <div className="mt-1 text-sm">{this.props.message}</div>
          <button
            type="button"
            onClick={this.handleRetry}
            className="mt-3 rounded border border-rose-400 px-3 py-1.5 text-sm hover:bg-rose-100"
          >
            Try again
          </button>
        </div>
      )
    }

    return this.props.children
  }
}
