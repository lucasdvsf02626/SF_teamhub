import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCw, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { logClientError, logToLocalStorage } from "@/lib/client-error-logger";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  copied: boolean;
}

// Store errors in localStorage for remote debugging
const storeErrorLog = (error: Error, errorInfo: ErrorInfo | null) => {
  logToLocalStorage('error_boundary', {
    message: error.message,
    stack: error.stack,
    componentStack: errorInfo?.componentStack,
    url: window.location.href,
    userAgent: navigator.userAgent,
  });

  // Also send to Supabase
  logClientError({
    errorMessage: error.message,
    errorStack: error.stack,
    componentStack: errorInfo?.componentStack || undefined,
    context: 'error_boundary',
    extraData: { url: window.location.href },
  });
};

// Helper to get all stored error logs (auth + boundary)
export const getStoredErrorLogs = () => {
  try {
    const authLogs = JSON.parse(localStorage.getItem('sf_auth_error_logs') || '[]');
    const boundaryLogs = JSON.parse(localStorage.getItem('sf_error_boundary_logs') || '[]');
    return { authLogs, boundaryLogs };
  } catch {
    return { authLogs: [], boundaryLogs: [] };
  }
};

// Helper to export logs as text
export const exportErrorLogs = () => {
  const { authLogs, boundaryLogs } = getStoredErrorLogs();
  return JSON.stringify({ authLogs, boundaryLogs }, null, 2);
};

// Helper to clear stored logs
export const clearStoredErrorLogs = () => {
  localStorage.removeItem('sf_auth_error_logs');
  localStorage.removeItem('sf_error_boundary_logs');
};

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null, copied: false };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error, errorInfo: null };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
    this.setState({ errorInfo });
    
    // Store in localStorage AND send to Supabase
    storeErrorLog(error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = "/";
  };

  handleCopyError = () => {
    const errorDetails = {
      message: this.state.error?.message,
      stack: this.state.error?.stack,
      componentStack: this.state.errorInfo?.componentStack,
      url: window.location.href,
      timestamp: new Date().toISOString(),
      allLogs: getStoredErrorLogs(),
    };
    
    navigator.clipboard.writeText(JSON.stringify(errorDetails, null, 2)).then(() => {
      this.setState({ copied: true });
      setTimeout(() => this.setState({ copied: false }), 2000);
    });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
          <div className="max-w-md w-full text-center space-y-6">
            <div className="w-16 h-16 mx-auto rounded-full bg-destructive/10 flex items-center justify-center">
              <AlertTriangle className="w-8 h-8 text-destructive" />
            </div>
            
            <div className="space-y-2">
              <h1 className="text-2xl font-bold text-foreground">Something went wrong</h1>
              <p className="text-muted-foreground">
                We're sorry, but something unexpected happened. Please try refreshing the page.
              </p>
            </div>

            {this.state.error && (
              <div className="text-left bg-muted/50 rounded-lg p-4 text-sm overflow-auto max-h-40">
                <p className="font-mono text-destructive break-all">
                  {this.state.error.toString()}
                </p>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button onClick={this.handleReload} className="gap-2">
                <RefreshCw className="w-4 h-4" />
                Refresh Page
              </Button>
              <Button variant="outline" onClick={this.handleGoHome}>
                Go to Home
              </Button>
            </div>

            {/* Copy error button for debugging */}
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={this.handleCopyError}
              className="text-muted-foreground text-xs"
            >
              {this.state.copied ? (
                <>
                  <Check className="w-3 h-3 mr-1" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3 mr-1" />
                  Copy error details for support
                </>
              )}
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
