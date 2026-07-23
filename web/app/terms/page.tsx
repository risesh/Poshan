import Footer from "@/app/components/Footer";

export const metadata = {
  title: "Terms & Conditions",
  description:
    "The terms that govern your use of the Poषण website and your purchase of our products.",
  alternates: { canonical: "/terms" },
};

export default function TermsPage() {
  return (
    <>
      <header className="policy-hero">
        <div className="policy-hero__inner">
          <div className="policy-hero__label">Legal</div>
          <h1 className="policy-hero__title">Terms &amp; Conditions</h1>
          <div className="policy-hero__updated">Last updated · 22 Jul 2026</div>
        </div>
      </header>

      <section className="policy-content">
        <div className="policy-content__inner">
          {/* FSSAI Registration No. is still pending — fill in once issued. */}
          <h2>Who we are</h2>
          <p>
            Poषण is operated by Poshan Life LLP, with its principal place of business
            at Building 282, Lotus Nest, S-1, 2nd floor, sector 3, HSR layout. FSSAI
            Registration No: [ADD ONCE ISSUED].
          </p>

          <h2>Agreement</h2>
          <p>
            These terms govern your use of the Poषण website and your purchase of our
            products. By placing an order you agree to them.
          </p>

          <h2>Eligibility</h2>
          <p>
            You must be at least 18 years old to place an order on this site. By
            ordering, you confirm that you meet this requirement.
          </p>

          <h2>Our products</h2>
          <p>
            Poषण makes small-batch foods and snacks. We make no claim that any product
            clinically diagnoses, treats, cures, or prevents any condition.
          </p>

          <h2>Orders &amp; pricing</h2>
          <p>
            All prices are in Indian Rupees and include applicable taxes. We may
            correct pricing errors and cancel affected orders with a full refund.
          </p>

          <h2>Accounts</h2>
          <p>
            You are responsible for keeping your account details accurate and your
            password secure. Let us know promptly of any unauthorised use. We may
            suspend or terminate an account if we reasonably believe these terms have
            been violated.
          </p>

          <h2>Acceptable use</h2>
          <p>
            You agree not to misuse the site, resell our products without written
            consent, or reproduce our brand marks, photography, or copy without
            permission.
          </p>

          <h2>Our intellectual property</h2>
          <p>
            All content on this site — including our brand name, logo, packaging
            design, photography, and written content — belongs to Poshan Life LLP and
            may not be copied, reused, or reproduced without our written permission.
          </p>

          <h2>Liability</h2>
          <p>
            Always read the ingredients on each batch label before consuming,
            particularly if you have allergies or are pregnant. Consult a physician for
            medical concerns. To the extent permitted by law, our liability for any
            order is limited to the amount you paid for it. We are not liable for
            delays or failures caused by events outside our reasonable control,
            including natural disasters, strikes, or supply disruptions.
          </p>

          <h2>Changes to these terms</h2>
          <p>
            We may update these terms from time to time. We&apos;ll flag material
            changes via email or a notice on this page. Continuing to use the site
            after changes go live means you accept the updated terms.
          </p>

          <h2>Governing law</h2>
          <p>
            These terms are governed by the laws of India, and disputes fall under the
            jurisdiction of the courts of Bangalore, Karnataka. If any part of these
            terms is found unenforceable, the remainder will continue to apply.
          </p>

          <h2>Questions or complaints</h2>
          <p>
            For any complaint about your order or our service, write to us at
            lifeposhan@gmail.com. We try to acknowledge every complaint within 2
            business days and resolve it within 30 days.
          </p>
        </div>
      </section>

      <Footer compact />
    </>
  );
}
