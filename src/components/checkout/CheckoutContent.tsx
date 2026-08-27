'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { PaymentMethod } from '@stripe/stripe-js';
import { CheckCircle2, ShoppingBag } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { PaymentForm } from '@/components/checkout/PaymentForm';
import { StripeProvider } from '@/components/checkout/StripeProvider';
import { useCartStore, type CartItem } from '@/lib/hooks/use-cart-store';
import { formatUsdc } from '@/lib/utils';

export function CheckoutContent() {
  const { items, getTotalPrice, clearCart } = useCartStore();
  /** Snapshot taken at payment time — the cart is emptied on success. */
  const [receipt, setReceipt] = useState<{ items: CartItem[]; total: number } | null>(null);

  const total = getTotalPrice();

  const handleSuccess = (_paymentMethod: PaymentMethod) => {
    setReceipt({ items, total });
    clearCart();
  };

  if (receipt) {
    return (
      <section className="mx-auto max-w-2xl rounded-2xl border border-leaf-500/30 bg-white p-8 text-center shadow-card">
        <CheckCircle2 className="mx-auto h-12 w-12 text-leaf-600" aria-hidden="true" />
        <h1 className="mt-4 text-2xl font-semibold text-ink-900">Payment received</h1>
        <p className="mt-2 text-ink-600">
          We&apos;ve charged {formatUsdc(receipt.total)}. You now have access to{' '}
          {receipt.items.length} course{receipt.items.length === 1 ? '' : 's'}.
        </p>

        <ul className="mt-6 space-y-2 text-left">
          {receipt.items.map((item) => (
            <li
              key={item.courseId}
              className="flex items-center justify-between rounded-lg bg-ink-50 px-4 py-3"
            >
              <span className="text-sm font-medium text-ink-900">{item.course.title}</span>
              <span className="text-sm text-ink-600">{formatUsdc(item.course.price)}</span>
            </li>
          ))}
        </ul>

        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link href="/dashboard/courses">
            <Button variant="primary" size="lg">
              Start learning
            </Button>
          </Link>
          <Link href="/courses">
            <Button variant="tertiary" size="lg">
              Browse more courses
            </Button>
          </Link>
        </div>
      </section>
    );
  }

  if (items.length === 0) {
    return (
      <section className="mx-auto max-w-lg rounded-2xl border border-ink-200 bg-white p-10 text-center shadow-card">
        <ShoppingBag className="mx-auto h-12 w-12 text-ink-200" aria-hidden="true" />
        <h1 className="mt-4 text-xl font-semibold text-ink-900">There&apos;s nothing to pay for</h1>
        <p className="mt-2 text-sm text-ink-600">
          Add a course to your cart and it will show up here, ready for checkout.
        </p>
        <Link href="/courses" className="mt-6 inline-block">
          <Button variant="primary" size="lg">
            Browse courses
          </Button>
        </Link>
      </section>
    );
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_20rem]">
      <section className="rounded-2xl border border-ink-200 bg-white p-6 shadow-card sm:p-8">
        <h1 className="text-xl font-semibold text-ink-900">Payment</h1>
        <p className="mt-1 text-sm text-ink-600">
          Enter your card details to complete the purchase.
        </p>

        <StripeProvider>
          <PaymentForm amount={total} onSuccess={handleSuccess} className="mt-6" />
        </StripeProvider>
      </section>

      <aside className="lg:sticky lg:top-6 lg:self-start">
        <div className="rounded-2xl border border-ink-200 bg-white p-6 shadow-card">
          <h2 className="text-base font-semibold text-ink-900">Order summary</h2>

          <ul className="mt-4 space-y-3 border-b border-ink-100 pb-4">
            {items.map((item) => (
              <li key={item.courseId} className="flex items-start justify-between gap-3">
                <span className="text-sm text-ink-700">{item.course.title}</span>
                <span className="shrink-0 text-sm font-medium text-ink-900">
                  {formatUsdc(item.course.price)}
                </span>
              </li>
            ))}
          </ul>

          <div className="mt-4 flex items-center justify-between">
            <span className="text-sm font-semibold text-ink-900">Total</span>
            <span className="text-xl font-bold text-hamplard-primary">{formatUsdc(total)}</span>
          </div>
        </div>
      </aside>
    </div>
  );
}
