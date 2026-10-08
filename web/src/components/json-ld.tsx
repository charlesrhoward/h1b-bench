import type { JsonLdNode } from "@/lib/json-ld";

/**
 * Structured data for search engines and AI crawlers. `<` is escaped so a value such as an
 * employer name can never close the script tag.
 */
export default function JsonLd({ data }: { data: JsonLdNode }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }}
    />
  );
}
