// src/components/CartDrawer.tsx
import { useCart } from "@/hooks/useCart";
import { formatCurrency } from "@/utils/formatters";

export function CartDrawer() {
  const { items } = useCart();
  const total = items.reduce((acc, item) => acc + item.price, 0);
  return (
    <aside>
      <h2>Your Cart</h2>
      <div>Total: {formatCurrency(total)}</div>
    </aside>
  );
}
