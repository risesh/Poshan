import CartPageBody from "@/app/components/CartPageBody";
import Footer from "@/app/components/Footer";

export const metadata = {
  title: "Your cart — Poषण",
  description: "Your Poषण cart.",
};

export default function CartPage() {
  return (
    <>
      <CartPageBody />
      <Footer compact />
    </>
  );
}
