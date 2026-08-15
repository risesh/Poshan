import Footer from "@/app/components/Footer";

export const metadata = {
  title: "Contact us",
  description: "Get in touch with Poषण over WhatsApp or email.",
  alternates: { canonical: "/contact" },
};

export default function ContactPage() {
  return (
    <>
      <header className="policy-hero">
        <div className="policy-hero__inner">
          <div className="policy-hero__label">Get in touch</div>
          <h1 className="policy-hero__title">Contact us</h1>
          <p className="policy-hero__intro">
            Questions about an order, a product, or anything else — pick whichever
            works best for you.
          </p>
        </div>
      </header>

      <section className="policy-content">
        <div className="policy-content__inner">
          <div className="contact-options">
            <a
              href="https://wa.me/917982414408?text=Hi%2C%20I%20have%20a%20question%20for%20you%20-%20"
              className="contact-option"
              target="_blank"
              rel="noopener noreferrer"
            >
              <span className="contact-option__icon" aria-hidden="true">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M20.5 11.5a8.5 8.5 0 1 1-3.8-7.1" />
                  <path d="M20.5 11.5c0 4.7-3.8 8.5-8.5 8.5a8.5 8.5 0 0 1-4.3-1.2L3 20l1.3-4.5a8.5 8.5 0 0 1-1.3-4.5" />
                </svg>
              </span>
              <span>
                <span className="contact-option__title">Chat on WhatsApp</span>
                <span className="contact-option__detail">+91 79824 14408</span>
              </span>
            </a>

            <a href="mailto:lifeposhan@gmail.com" className="contact-option">
              <span className="contact-option__icon" aria-hidden="true">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <rect x="3" y="5" width="18" height="14" rx="2" />
                  <path d="m3 7 9 6 9-6" />
                </svg>
              </span>
              <span>
                <span className="contact-option__title">Email us</span>
                <span className="contact-option__detail">lifeposhan@gmail.com</span>
              </span>
            </a>
          </div>
        </div>
      </section>

      <Footer compact />
    </>
  );
}
