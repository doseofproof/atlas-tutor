import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface State {
  error: Error | null;
  info: ErrorInfo | null;
}

/**
 * Root error boundary — sandbox-proof crash reporting.
 * Any unhandled render error lands here with the exact message + stack,
 * plus a "Reset State" button that clears storage and reloads.
 */
export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null, info: null };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    this.setState({ error, info });
  }

  reset = () => {
    // Wipe both possible storage layers, then reload fresh.
    try {
      indexedDB.deleteDatabase('atlas-tutor');
    } catch {
      /* blocked or unavailable — ignore */
    }
    try {
      localStorage.clear();
    } catch {
      /* ignore */
    }
    window.location.reload();
  };

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="mx-auto flex min-h-screen max-w-3xl items-center px-4 py-8">
        <Card className="w-full border-red-500">
          <CardHeader>
            <CardTitle className="text-red-600">Atlas Tutor hit an error</CardTitle>
            <CardDescription>
              The app crashed while rendering. The details below show exactly what broke.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-md bg-red-50 p-3 text-sm dark:bg-red-950">
              <p className="font-mono font-semibold">{this.state.error.name}: {this.state.error.message}</p>
              <pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap text-xs text-muted-foreground">
                {this.state.error.stack}
                {this.state.info?.componentStack}
              </pre>
            </div>
            <Button variant="destructive" onClick={this.reset}>Reset State & Reload</Button>
          </CardContent>
        </Card>
      </div>
    );
  }
}
