import GeneratorWorkbench from "@/components/GeneratorWorkbench";
import { useQueryParam } from "@/lib/useQueryParam";

export default function BlogGeneratorPage() {
  const productId = useQueryParam("product");
  return (
    <GeneratorWorkbench
      kind="blog"
      title="Blog Generator"
      description="How-to articles, buying guides, comparisons, educational posts, FAQ articles — all SEO-optimized."
      initialProductId={productId}
    />
  );
}
