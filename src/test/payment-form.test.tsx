import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { createPaymentMethod } = vi.hoisted(() => ({ createPaymentMethod: vi.fn() }));

/**
 * Stripe renders its fields in cross-origin iframes, which jsdom cannot host.
 * Stand them in with plain inputs that emit the same change-event shape, so the
 * form's own logic — brand detection, inline errors, submit states — is what is
 * under test.
 */
vi.mock('@stripe/react-stripe-js', () => {
  const brandOf = (value: string) => {
    if (value.startsWith('4')) return 'visa';
    if (value.startsWith('5')) return 'mastercard';
    if (value.startsWith('3')) return 'amex';
    return 'unknown';
  };

  const stripeInput =
    (testId: string, withBrand: boolean) =>
    ({ onChange }: { onChange?: (event: unknown) => void }) =>
      React.createElement('input', {
        'data-testid': testId,
        onChange: (event: React.ChangeEvent<HTMLInputElement>) => {
          const value = event.target.value;
          onChange?.({
            complete: value.startsWith('complete'),
            error: value.startsWith('error:') ? { message: value.slice(6) } : undefined,
            ...(withBrand ? { brand: brandOf(value.replace('complete', '')) } : {}),
          });
        },
      });

  return {
    CardNumberElement: stripeInput('card-number', true),
    CardExpiryElement: stripeInput('card-expiry', false),
    CardCvcElement: stripeInput('card-cvc', false),
    Elements: ({ children }: { children: React.ReactNode }) =>
      React.createElement(React.Fragment, null, children),
    useStripe: () => ({ createPaymentMethod }),
    useElements: () => ({ getElement: () => ({}) }),
  };
});

vi.mock('@/lib/stripe/client', () => ({
  isStripeConfigured: () => true,
  getStripe: async () => null,
}));

import { PaymentForm, type PaymentFormProps } from '@/components/checkout/PaymentForm';

const PAYMENT_METHOD = { id: 'pm_test_123', card: { last4: '4242' } };

const renderForm = (props: Partial<PaymentFormProps> = {}) =>
  render(React.createElement(PaymentForm, { amount: 49.99, ...props }));

/** Fills every required field with valid values. */
const fillForm = () => {
  fireEvent.change(screen.getByLabelText(/cardholder name/i), {
    target: { value: 'Ada Tester' },
  });
  fireEvent.change(screen.getByTestId('card-number'), {
    target: { value: 'complete4242424242424242' },
  });
  fireEvent.change(screen.getByTestId('card-expiry'), { target: { value: 'complete' } });
  fireEvent.change(screen.getByTestId('card-cvc'), { target: { value: 'complete' } });
  fireEvent.change(screen.getByLabelText(/street address/i), {
    target: { value: '12 Awolowo Road' },
  });
  fireEvent.change(screen.getByLabelText(/^city$/i), { target: { value: 'Lagos' } });
  fireEvent.change(screen.getByLabelText(/postal code/i), { target: { value: '100001' } });
};

const submit = () => fireEvent.click(screen.getByRole('button', { name: /pay \$/i }));

describe('PaymentForm', () => {
  beforeEach(() => {
    createPaymentMethod.mockReset();
    createPaymentMethod.mockResolvedValue({ paymentMethod: PAYMENT_METHOD });
  });

  it('renders the card fields, PayPal alternative and secure payment badge', () => {
    renderForm({ amount: 129.49 });

    expect(screen.getByTestId('card-number')).toBeInTheDocument();
    expect(screen.getByTestId('card-expiry')).toBeInTheDocument();
    expect(screen.getByTestId('card-cvc')).toBeInTheDocument();
    expect(screen.getByLabelText(/cardholder name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/street address/i)).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /paypal/i })).toBeInTheDocument();
    expect(screen.getByText(/secured by stripe/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /pay \$129\.49/i })).toBeInTheDocument();
  });

  it('updates the card brand icon as the number is entered', () => {
    renderForm();

    expect(screen.getByText(/detecting/i)).toBeInTheDocument();

    fireEvent.change(screen.getByTestId('card-number'), { target: { value: '4242' } });
    expect(screen.getByRole('img', { name: 'Visa' })).toBeInTheDocument();

    fireEvent.change(screen.getByTestId('card-number'), { target: { value: '5555' } });
    expect(screen.getByRole('img', { name: 'Mastercard' })).toBeInTheDocument();
    expect(screen.queryByRole('img', { name: 'Visa' })).not.toBeInTheDocument();
  });

  it('shows validation errors from Stripe inline against the field', () => {
    renderForm();

    fireEvent.change(screen.getByTestId('card-number'), {
      target: { value: 'error:Your card number is invalid.' },
    });

    expect(screen.getByText('Your card number is invalid.')).toBeInTheDocument();
  });

  it('blocks submission and flags incomplete fields', async () => {
    renderForm();

    submit();

    expect(await screen.findByText(/enter the name printed on your card/i)).toBeInTheDocument();
    expect(screen.getByText(/enter your full card number/i)).toBeInTheDocument();
    expect(createPaymentMethod).not.toHaveBeenCalled();
  });

  it('shows a processing spinner while the payment is in flight', async () => {
    let release!: () => void;
    const onConfirmPayment = vi.fn(() => new Promise<void>((resolve) => (release = resolve)));

    renderForm({ onConfirmPayment });
    fillForm();
    submit();

    expect(await screen.findByText(/processing payment/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /processing payment/i })).toBeDisabled();

    release();
    await waitFor(() => expect(screen.getByText(/payment successful/i)).toBeInTheDocument());
  });

  it('turns a declined card into a user-friendly message', async () => {
    const onConfirmPayment = vi
      .fn()
      .mockRejectedValue({ code: 'card_declined', decline_code: 'insufficient_funds' });

    renderForm({ onConfirmPayment });
    fillForm();
    submit();

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(/payment not completed/i);
    expect(alert).toHaveTextContent(/enough funds/i);
    // Never the raw decline code.
    expect(alert).not.toHaveTextContent(/insufficient_funds/);
  });

  it('reports card errors raised while tokenising', async () => {
    createPaymentMethod.mockResolvedValue({ error: { code: 'expired_card', type: 'card_error' } });

    renderForm();
    fillForm();
    submit();

    expect(await screen.findByText(/this card has expired/i)).toBeInTheDocument();
  });

  it('passes the billing details Stripe needs when tokenising', async () => {
    renderForm({ onConfirmPayment: vi.fn().mockResolvedValue(undefined) });
    fillForm();
    submit();

    await waitFor(() => expect(createPaymentMethod).toHaveBeenCalled());
    expect(createPaymentMethod.mock.calls[0][0]).toMatchObject({
      type: 'card',
      billing_details: {
        name: 'Ada Tester',
        address: { line1: '12 Awolowo Road', city: 'Lagos', postal_code: '100001', country: 'NG' },
      },
    });
  });

  it('offers PayPal as an alternative to the card form', () => {
    const onPayPalSelected = vi.fn();
    renderForm({ onPayPalSelected });

    fireEvent.click(screen.getByRole('radio', { name: /paypal/i }));

    expect(screen.queryByTestId('card-number')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /continue to paypal/i }));
    expect(onPayPalSelected).toHaveBeenCalled();
  });
});
