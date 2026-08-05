import { Component, type ReactNode, type ErrorInfo } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error("Uncaught error caught by ErrorBoundary:", error, errorInfo);
  }

  private handleReset = (): void => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  private handleClearStorageAndReset = (): void => {
    localStorage.clear();
    window.location.reload();
  };

  public render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#F4F2EC] flex items-center justify-center p-6 text-[#152238]">
          <div className="bg-white border border-[#E1DCCC] p-8 max-w-lg w-full rounded-sm shadow-sm font-sans">
            <h1 className="font-serif text-2xl text-[#9B3B3B] mb-2">Une erreur est survenue</h1>
            <p className="text-sm text-[#3D4A63] mb-4">
              L'application a rencontré un problème inattendu. Vos données sauvegardées sont conservées.
            </p>
            {this.state.error && (
              <pre className="bg-[#FBFAF7] p-3 text-xs text-[#9B3B3B] border border-[#E1DCCC] rounded-sm mb-6 overflow-x-auto max-h-40">
                {this.state.error.toString()}
              </pre>
            )}
            <div className="flex gap-3">
              <button
                onClick={this.handleReset}
                className="flex-1 py-2 px-4 bg-[#152238] text-white text-xs uppercase tracking-wider font-semibold rounded-sm hover:bg-[#20314f] transition-colors"
              >
                Recharger l'application
              </button>
              <button
                onClick={this.handleClearStorageAndReset}
                className="py-2 px-4 border border-[#9B3B3B] text-[#9B3B3B] text-xs uppercase tracking-wider font-semibold rounded-sm hover:bg-red-50 transition-colors"
              >
                Réinitialiser la mémoire
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
