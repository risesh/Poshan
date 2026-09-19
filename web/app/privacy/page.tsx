import Footer from "@/app/components/Footer";

export const metadata = {
  title: "Privacy Policy",
  description:
    "What Poषण collects, why, and the control you keep over your personal data.",
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  return (
    <>
      <header className="policy-hero">
        <div className="policy-hero__inner">
          <div className="policy-hero__label">Legal</div>
          <h1 className="policy-hero__title">Privacy Policy</h1>
          <p className="policy-hero__intro">
            What we collect, why, and the control you keep over it.
          </p>
          <div className="policy-hero__updated">Last updated · 22 Jul 2026</div>
        </div>
      </header>

      <section className="policy-content">
        <div className="policy-content__inner">
          <h2>Our promise</h2>
          <p>
            We built Poषण on transparency and traceability — and that applies to your
            data as much as to our sourcing. We collect only what we need to get good
            food to your door.
          </p>

          <h2>What we collect</h2>
          <ul>
            <li>
              Account holder&apos;s info, contact &amp; delivery details — name,
              address, email, phone, gender and date of birth
            </li>
            <li>Order history and preferences</li>
            <li>
              Payment information, processed securely by our payment partner — we never
              store card numbers
            </li>
            <li>Basic usage data — pages visited, device type — to improve the site</li>
          </ul>

          <h2>How we use it</h2>
          <p>
            To process and deliver your orders, keep you updated on their status,
            respond to your questions, and — only if you opt in — send occasional notes
            about new offers, product launches etc. You can unsubscribe from any email
            or whatsapp messages from your mail client or whatsapp accounts.
          </p>

          <h2>Who we share it with</h2>
          <p>
            We share delivery related details only with the partners who help us
            operate our delivery. Each is bound by their own data protection
            obligations. We never sell your personal information to anyone.
          </p>

          <h2>How long we keep it</h2>
          <p>
            We retain your account and order data for as long as your account is not
            deactivated explicitly by the user.
          </p>

          <h2>How we keep it safe</h2>
          <p>
            We use encryption for payment data in transit, limit internal access to
            your data on a need-to-know basis, and review our security practices
            regularly.
          </p>

          <h2>Children&apos;s privacy</h2>
          <p>
            Our services are meant for adults. We do not knowingly collect personal
            data from anyone under 18.
          </p>

          <h2>Your choices</h2>
          <p>
            You may ask us to access, correct, or delete your personal data at any
            time. Whatsapp us at +91 96466 18898 or write to us at
            lifeposhan@gmail.com and we will act within 30 days.
          </p>

          <h2>Questions or complaints about your data</h2>
          <p>
            For any privacy-related request or complaint, write to us at
            lifeposhan@gmail.com. We will respond within 30 days, in line with the
            Digital Personal Data Protection Act, 2023.
          </p>

          <h2>Cookies</h2>
          <p>
            We use a small number of cookies to keep your cart and session working and
            to understand how the site is used.
          </p>
        </div>
      </section>

      <Footer compact />
    </>
  );
}
