// src/App.tsx
import { Header } from "@/components/Header";
import { ProductCard } from "@/components/ProductCard";
import { CartDrawer } from "@/components/CartDrawer";
import { useCart } from "@/hooks/useCart";

export function App() {
  const { items } = useCart();
  return (
    <main>
      <Header />
      <ProductCard product={{ id: "1", name: "Laptop", price: 999 }} />
      <CartDrawer />
    </main>
  );
}
