// src/utils/formatters.ts
export function formatCurrency(amount: number): string {
  return `$${amount.toFixed(2)}`;
}
