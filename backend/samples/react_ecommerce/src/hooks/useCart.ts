// src/hooks/useCart.ts
import { fetchProducts } from "@/services/api";
import { CartItem, Product } from "@/types";

export function useCart() {
  const items: CartItem[] = [];
  const addItem = (p: Product) => items.push({ ...p, quantity: 1 });
  return { items, addItem, fetchProducts };
}
