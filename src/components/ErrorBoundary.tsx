import React from 'react';

interface ErrorBoundaryState {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      message: error.message || 'An unexpected error occurred.',
    };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-6">
          <div className="max-w-md w-full glass-3d-tile rounded-2xl border border-red-200 p-6 space-y-4">
            <h2 className="text-base font-bold text-red-700">
              সিস্টেম ত্রুটি / Application Error
            </h2>
            <p className="text-xs text-slate-700 break-words font-mono-num bg-white/80 p-3 rounded-xl border border-slate-200 max-h-48 overflow-auto">
              {this.state.message}
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="btn-3d w-full py-2.5 px-4 bg-[#B91C1C] hover:bg-[#991B1B] text-white text-xs font-semibold rounded-xl cursor-pointer"
            >
              রিলোড করুন / Reload App
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
