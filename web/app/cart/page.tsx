import CartPageBody from "@/app/components/CartPageBody";
import Footer from "@/app/components/Footer";

// Personal cart contents — zero public search value, same reasoning as
// orders/checkout.
export const metadata = {
  title: "Your cart",
  description: "Your Poषण cart.",
  robots: { index: false, follow: false },
};

export default function CartPage() {
  return (
    <>
      <CartPageBody />
      <Footer compact />
    </>
  );
}
