/**
 * Nomad Arc Error Boundary Component
 * 
 * This component catches and handles JavaScript errors in the React component tree,
 * preventing the entire application from crashing and providing user‑friendly error messages.
 */

'use client'

import React, { Component, ErrorInfo, ReactNode } from 'react'

interface ErrorBoundaryProps {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: ErrorInfo) => void
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
}

/**
 * Global Error Boundary Component
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    }
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    // Update state so the next render shows the fallback UI
    return {
      hasError: true,
      error,
    }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Log error information to console
    console.error('ErrorBoundary caught an error:', error, errorInfo)
    
    // Update state to include error info
    this.setState({
      errorInfo,
    })

    // Call custom error handler
    if (this.props.onError) {
      this.props.onError(error, errorInfo)
    }

    // Optionally send error info to an error monitoring service
    this.logErrorToService(error, errorInfo)
  }

  private logErrorToService(error: Error, errorInfo: ErrorInfo): void {
    // Here you can integrate error monitoring services like Sentry, LogRocket, etc.
    // Example: console.log('Sending error to monitoring service:', error.message)
    
    // For now, just log to console
    console.log('Error details:', {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString(),
    })
  }

  private handleReset = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    })
  }

  private handleRetry = (): void => {
    // Reload the page
    window.location.reload()
  }

  render(): ReactNode {
    if (this.state.hasError) {
      // If a custom fallback is provided, use it
      if (this.props.fallback) {
        return this.props.fallback
      }

      // Otherwise render the default error UI
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
          <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 dark:bg-red-900">
                <svg
                  className="h-6 w-6 text-red-600 dark:text-red-300"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.732 16.5c-.77.833.192 2.5 1.732 2.5z"
                  />
                </svg>
              </div>
              
              <h2 className="mt-4 text-xl font-semibold text-gray-900 dark:text-gray-100">
                Oops, something went wrong!
              </h2>
              
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                The application encountered an unexpected error. Our team has been notified.
              </p>

              {/* Error details (shown in development) */}
              {typeof window !== 'undefined' && window.location.hostname === 'localhost' && this.state.error && (
                <div className="mt-4 p-3 bg-gray-100 dark:bg-gray-700 rounded text-left">
                  <h3 className="text-sm font-medium text-gray-900 dark:text-gray-200 mb-2">
                    Error Details:
                  </h3>
                  <pre className="text-xs text-red-600 dark:text-red-400 overflow-auto">
                    {this.state.error.toString()}
                  </pre>
                  {this.state.errorInfo?.componentStack && (
                    <div className="mt-2">
                      <h4 className="text-xs font-medium text-gray-900 dark:text-gray-200 mb-1">
                        Component Stack:
                      </h4>
                      <pre className="text-xs text-gray-600 dark:text-gray-400 overflow-auto">
                        {this.state.errorInfo.componentStack}
                      </pre>
                    </div>
                  )}
                </div>
              )}

              {/* Action buttons */}
              <div className="mt-6 flex flex-col sm:flex-row gap-3">
                <button
                  type="button"
                  onClick={this.handleReset}
                  className="inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Retry Component
                </button>
                
                <button
                  type="button"
                  onClick={this.handleRetry}
                  className="inline-flex justify-center items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md shadow-sm text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Refresh Page
                </button>
                
                <a
                  href="/"
                  className="inline-flex justify-center items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md shadow-sm text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Back to Home
                </a>
              </div>

              {/* Contact support */}
              <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  If the problem persists, please contact our support team.
                </p>
              </div>
            </div>
          </div>
        </div>
      )
    }

    // If no error, render children normally
    return this.props.children
  }
}

/**
 * Skill Execution Error Boundary (specialized for skill execution)
 */
export class SkillErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    }
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error,
    }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('Skill execution error:', error, errorInfo)
    
    this.setState({
      errorInfo,
    })

    // Log skill execution error
    this.logSkillError(error, errorInfo)
  }

  private logSkillError(error: Error, errorInfo: ErrorInfo): void {
    // Here you can log skill‑specific error information
    console.log('Skill error details:', {
      type: 'skill_execution_error',
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString(),
    })
  }

  private handleRetry = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    })
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="p-4 border border-red-200 dark:border-red-800 rounded-lg bg-red-50 dark:bg-red-900/20">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg
                className="h-5 w-5 text-red-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.732 16.5c-.77.833.192 2.5 1.732 2.5z"
                />
              </svg>
            </div>
            
            <div className="ml-3 flex-1">
              <h3 className="text-sm font-medium text-red-800 dark:text-red-300">
                Skill Execution Failed
              </h3>
              
              <div className="mt-2 text-sm text-red-700 dark:text-red-400">
                <p>
                  {this.state.error?.message || 'An unknown error occurred during execution'}
                </p>
                
                {process.env.NODE_ENV === 'development' && this.state.error?.stack && (
                  <details className="mt-2">
                    <summary className="cursor-pointer text-xs">View Technical Details</summary>
                    <pre className="mt-1 text-xs overflow-auto p-2 bg-red-100 dark:bg-red-900/30 rounded">
                      {this.state.error.stack}
                    </pre>
                  </details>
                )}
              </div>
              
              <div className="mt-3">
                <button
                  type="button"
                  onClick={this.handleRetry}
                  className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                >
                  Retry
                </button>
              </div>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

/**
 * Transaction Error Boundary (specialized for transaction execution)
 */
export class TransactionErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    }
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error,
    }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('Transaction error:', error, errorInfo)
    
    this.setState({
      errorInfo,
    })

    // Log transaction error
    this.logTransactionError(error, errorInfo)
  }

  private logTransactionError(error: Error, errorInfo: ErrorInfo): void {
    console.log('Transaction error details:', {
      type: 'transaction_error',
      message: error.message,
      timestamp: new Date().toISOString(),
    })
  }

  private handleRetry = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    })
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="p-4 border border-yellow-200 dark:border-yellow-800 rounded-lg bg-yellow-50 dark:bg-yellow-900/20">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg
                className="h-5 w-5 text-yellow-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.732 16.5c-.77.833.192 2.5 1.732 2.5z"
                />
              </svg>
            </div>
            
            <div className="ml-3 flex-1">
              <h3 className="text-sm font-medium text-yellow-800 dark:text-yellow-300">
                Transaction Execution Failed
              </h3>
              
              <div className="mt-2 text-sm text-yellow-700 dark:text-yellow-400">
                <p>
                  A problem occurred during transaction execution. This could be due to network issues, insufficient gas, or contract interaction failure.
                </p>
                
                {this.state.error?.message && (
                  <p className="mt-1 font-medium">{this.state.error.message}</p>
                )}
              </div>
              
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  onClick={this.handleRetry}
                  className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded shadow-sm text-white bg-yellow-600 hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500"
                >
                  Retry Transaction
                </button>
                
                <button
                  type="button"
                  onClick={() => window.location.reload()}
                  className="inline-flex items-center px-3 py-1.5 border border-gray-300 dark:border-gray-600 text-xs font-medium rounded shadow-sm text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
                >
                  Check Network
                </button>
              </div>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

/**
 * Higher‑Order Component: wraps a component with an error boundary
 */
export function withErrorBoundary<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  errorBoundaryProps?: Partial<ErrorBoundaryProps>
): React.ComponentType<P> {
  const displayName = WrappedComponent.displayName || WrappedComponent.name || 'Component'
  
  const ComponentWithErrorBoundary: React.FC<P> = (props) => {
    return (
      <ErrorBoundary {...errorBoundaryProps}>
        <WrappedComponent {...props} />
      </ErrorBoundary>
    )
  }
  
  ComponentWithErrorBoundary.displayName = `withErrorBoundary(${displayName})`
  
  return ComponentWithErrorBoundary
}

/**
 * Hook for using error handling
 */
export function useErrorHandler(): {
  handleError: (error: Error, context?: string) => void
  resetError: () => void
} {
  const [error, setError] = React.useState<Error | null>(null)
  
  const handleError = React.useCallback((error: Error, context?: string) => {
    console.error(`Error in ${context || 'unknown context'}:`, error)
    setError(error)
    
    // Here you can integrate error reporting services
    // reportErrorToService(error, { context })
  }, [])
  
  const resetError = React.useCallback(() => {
    setError(null)
  }, [])
  
  return {
    handleError,
    resetError,
  }
}