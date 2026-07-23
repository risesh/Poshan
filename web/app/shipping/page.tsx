import Footer from "@/app/components/Footer";

export const metadata = {
  title: "Shipping & Returns",
  description:
    "How and when Poषण ships, delivery charges, and our returns policy for perishable, preservative-free food.",
  alternates: { canonical: "/shipping" },
};

export default function ShippingPage() {
  return (
    <>
      <header className="policy-hero">
        <div className="policy-hero__inner">
          <div className="policy-hero__label">Policy</div>
          <h1 className="policy-hero__title">Shipping &amp; Returns</h1>
          <p className="policy-hero__intro">
            Fresh, preservative free food asks for a little care in transit. Here is
            exactly how, when, and where we ship.
          </p>
          <div className="policy-hero__updated">Last updated · 22 Jul 2026</div>
        </div>
      </header>

      <section className="policy-content">
        <div className="policy-content__inner">
          <h2>How we ship</h2>
          <p>
            Every Poषण order is prepared in small batches, packed and dispatched from
            our kitchen in HSR layout, Bangalore. Because our foods are fresh and
            preservative free, we ship as soon as the food item is prepared to keep
            them in peak condition when it reaches you.
          </p>

          <h2>Processing &amp; delivery time</h2>
          <p>
            Orders are packed and dispatched within 1 business day of confirmation, and
            delivered within 2 business days of dispatch, subject to serviceability at
            your address.
            <br />
            We try to deliver the products in the morning when you are at home, since
            leaving these products out at room temperature for long periods can cause
            the product to perish/spoil.
          </p>

          <h2>Order changes &amp; cancellations</h2>
          <p>
            Once an order has been placed, it cannot be cancelled or modified, given
            the fact that we prepare every item fresh for each order for which we
            source ingredients only after the order is placed.
          </p>

          <h2>Charges</h2>
          <ul>
            <li>Minimum order value - Rs 250</li>
            <li>
              Free shipping under 5km. An extra Rs 10 per km as delivery fee for any
              distance above 5km
            </li>
            <li>Free delivery for any order above Rs 1000 in value</li>
            <li>
              Currently we only ship in Bangalore. We will refund any orders placed
              from outside of Bangalore
            </li>
          </ul>
          <p>
            Perishable orders are shipped in insulated packaging with ice packs in
            order to ensure freshness and no spoilage in transit.
          </p>

          <h2>Delivery issues</h2>
          <p>
            We are not responsible if your package gets lost or gets sent back because
            of an inaccurate address — please double check your address before you
            confirm the order. If delivery fails because no one is available to receive
            the order, further attempts may carry an additional delivery fee at 10 Rs
            per km.
          </p>

          <h2>Returns &amp; replacements</h2>
          <p>
            Because our foods are perishable, we cannot accept returns of opened items.
            If a jar arrives damaged, leaking, or spoiled, contact us within 6 hours of
            delivery with a photo and we will replace it or refund you in full. The
            refund/return will be processed within 3 working days of the return
            submission.
          </p>

          <h2>Questions</h2>
          <p>
            Write to us at lifeposhan@gmail.com or Whatsapp us at +91 79824 14408 — we
            do our best to try to respond within one business day.
          </p>
        </div>
      </section>

      <Footer compact />
    </>
  );
}
