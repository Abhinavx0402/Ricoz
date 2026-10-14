/**
 * Financial calculation utilities to prevent JavaScript floating-point errors.
 * Internally calculates in integer minor units (cents) before formatting to standard 2-decimal currency.
 */

export function toCents(amount: number): number {
  return Math.round(Number(amount) * 100);
}

export function fromCents(cents: number): number {
  return Number((cents / 100).toFixed(2));
}

export function calculateTax(amount: number, taxRatePercentage: number): number {
  const amountCents = toCents(amount);
  const taxCents = Math.round((amountCents * taxRatePercentage) / 100);
  return fromCents(taxCents);
}

export function calculateSubtotal(items: Array<{ unitPrice: number; quantity: number }>): number {
  const totalCents = items.reduce((acc, item) => {
    return acc + toCents(item.unitPrice) * item.quantity;
  }, 0);
  return fromCents(totalCents);
}

export function roundMoney(amount: number): number {
  return Number(amount.toFixed(2));
}
