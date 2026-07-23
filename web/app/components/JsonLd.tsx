// Renders a schema.org JSON-LD block — invisible to visitors, read only by
// search/AI crawlers (SEO-ROADMAP.md §2). `data` is typed `object` rather
// than a schema.org type since each call site owns its own shape; keeping
// this component itself schema-agnostic means it never needs updating as
// new JSON-LD types (Organization, Product, Recipe, FAQPage, ...) are added.
export default function JsonLd({ data }: { data: object }) {
  return (
    <script
      type="application/ld+json"
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
