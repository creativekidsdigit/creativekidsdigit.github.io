import GeneratorWorkbench from "@/components/GeneratorWorkbench";
import { useQueryParam } from "@/lib/useQueryParam";

export default function SeoStudioPage() {
  const productId = useQueryParam("product");
  return (
    <GeneratorWorkbench
      kind="seo"
      title="SEO Studio"
      description="Keyword maps, meta packs, schema, internal linking, topic clusters, on-page checklists."
      initialProductId={productId}
    />
  );
}
