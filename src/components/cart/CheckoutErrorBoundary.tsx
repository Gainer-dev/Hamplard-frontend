'use client';

import React from 'react';
import Link from 'next/link';
import { AlertTriangle, LifeBuoy, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface CheckoutErrorBoundaryProps {
  children: React.ReactNode;
  onReset?: () => void;
}

interface CheckoutErrorBoundaryState {
  hasError: boolean;
  resetKey: number;
}

export class CheckoutErrorBoundary extends React.Component<
  CheckoutErrorBoundaryProps,
  CheckoutErrorBoundaryState
> {
  state: CheckoutErrorBoundaryState = {
    hasError: false,
    resetKey: 0,
  };

  static getDerivedStateFromError(): Partial<CheckoutErrorBoundaryState> {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('Checkout flow crashed', error, info.componentStack);
  }

  private handleRetry = () => {
    this.props.onReset?.();
    this.setState((state) => ({
      hasError: false,
      resetKey: state.resetKey + 1,
    }));
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          role="alert"
          className="flex h-full min-h-80 flex-col items-center justify-center bg-white px-6 py-12 text-center"
        >
          <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-rose-50">
            <AlertTriangle className="h-8 w-8 text-rose-600" aria-hidden="true" />
          </div>
          <h2 className="text-xl font-semibold text-ink-900">Checkout hit a snag</h2>
          <p className="mt-2 max-w-sm text-sm leading-6 text-ink-500">
            Your cart is safe. Try the checkout again, or contact support if the problem
            continues.
          </p>
          <div className="mt-6 flex w-full max-w-xs flex-col gap-3 sm:flex-row">
            <Button
              type="button"
              fullWidth
              onClick={this.handleRetry}
              icon={<RefreshCw className="h-4 w-4" />}
            >
              Try again
            </Button>
            <Link
              href="/help"
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-ink-200 px-4 py-2 text-sm font-medium text-ink-900 transition-colors hover:bg-ink-50"
            >
              <LifeBuoy className="h-4 w-4" aria-hidden="true" />
              Contact support
            </Link>
          </div>
        </div>
      );
    }

    return <React.Fragment key={this.state.resetKey}>{this.props.children}</React.Fragment>;
  }
}
