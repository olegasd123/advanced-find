import * as React from 'react'
import { createErrorReporter } from '../libs/utils/error-reporter'

const errorReporter = createErrorReporter('crm-view-error-boundary')

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

  componentDidCatch(error: unknown, errorInfo: React.ErrorInfo): void {
    errorReporter.reportRenderError({
      location: this.props.viewName,
      error,
      userMessage: this.props.message,
      context: {
        componentStack: errorInfo.componentStack,
      },
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
