// src/components/Header.tsx
import { useCart } from "@/hooks/useCart";

export function Header() {
  const { items } = useCart();
  return <header>Cart Items: {items.length}</header>;
}
