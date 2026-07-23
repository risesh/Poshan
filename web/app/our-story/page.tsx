import Footer from "@/app/components/Footer";

export const metadata = {
  title: "Our story",
  description:
    "Why Poषण began, how we make our food, and what we believe — foods that heal, made in small batches with no exaggerated claims.",
  alternates: { canonical: "/our-story" },
};

export default function OurStoryPage() {
  return (
    <>
      <header className="story-hero">
        <h1 className="story-hero__title">A daily spoon, not a box of supplements</h1>
      </header>

      <section className="story-columns">
        <div className="story-columns__grid">
          <div>
            <div className="story-columns__label">Why we began</div>
            <p className="story-columns__text">
              Poषण Life foods started because of our own struggles with health caused
              by the daily stressors in an increasingly fast paced and a life away
              from nature.
              <br />
              Over time, we discovered that gentle care and nutrition can solve a lot
              of problems that seem insurmountable when you&apos;re running from one
              doctor to the next.
              <br />
              We felt that there was a need for products that allow users to live
              life without worrying about the quality and nutritiousness of their
              foods.
            </p>
          </div>
          <div>
            <div className="story-columns__label">How we make</div>
            <p className="story-columns__text">
              We make every product in small batches and often even make some
              products only when they&apos;re ordered, so that you get the freshest
              and best experience.
              <br />
              <br />
              There are NO preservatives, fillers or stabilizers in our products and
              our products are meant to be packed, shipped and consumed fresh.
            </p>
          </div>
        </div>
      </section>

      <section className="principles">
        <div className="principles__inner">
          <div className="principles__label">What we believe</div>
          <div className="principles__list">
            <div className="principles__item">
              <div className="principles__number">01</div>
              <div>
                <h3 className="principles__title">Foods Should Heal</h3>
                <p className="principles__text">
                  What you eat doesn&apos;t just fill your stomach, it also
                  determines your mental and physical health
                </p>
              </div>
            </div>
            <div className="principles__item">
              <div className="principles__number">02</div>
              <div>
                <h3 className="principles__title">Clean and Nutritious</h3>
                <p className="principles__text">
                  Made from the best, clean and delicious ingredients
                </p>
              </div>
            </div>
            <div className="principles__item">
              <div className="principles__number">03</div>
              <div>
                <h3 className="principles__title">No Exaggerated Health Claims</h3>
                <p className="principles__text">
                  We stay away from Superfood fads, magical properties, panaceas
                  etc. Our diets should be balanced and above all tasty
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer compact />
    </>
  );
}
