'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import Button from './ui/Button';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);

    // Handle chunk loading errors specifically
    if (error.name === 'ChunkLoadError' || error.message.includes('Loading chunk')) {
      console.log('ChunkLoadError detected, attempting recovery...');
      // Force a page reload to get fresh chunks
      window.location.reload();
    }
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: undefined });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background">
          <div className="max-w-md w-full bg-card p-6 rounded-lg shadow-lg border">
            <h2 className="text-xl font-semibold text-card-foreground mb-4">
              Something went wrong
            </h2>
            <p className="text-muted-foreground mb-4">
              We encountered an error while loading the application. This might be due to a network issue.
            </p>
            {this.state.error?.name === 'ChunkLoadError' && (
              <p className="text-sm text-muted-foreground mb-4">
                A loading error occurred. We'll refresh the page to fix this.
              </p>
            )}
            <Button onClick={this.handleRetry} className="w-full">
              Reload Page
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
