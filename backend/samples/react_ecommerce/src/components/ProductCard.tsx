// src/components/ProductCard.tsx
import { Product } from "@/types";
import { formatCurrency } from "@/utils/formatters";
import { useCart } from "@/hooks/useCart";

export function ProductCard({ product }: { product: Product }) {
  const { addItem } = useCart();
  return (
    <div>
      <h3>{product.name}</h3>
      <p>{formatCurrency(product.price)}</p>
      <button onClick={() => addItem(product)}>Add</button>
    </div>
  );
}
