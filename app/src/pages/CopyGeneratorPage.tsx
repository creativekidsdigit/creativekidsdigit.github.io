import GeneratorWorkbench from "@/components/GeneratorWorkbench";
import { useQueryParam } from "@/lib/useQueryParam";

export default function CopyGeneratorPage() {
  const productId = useQueryParam("product");
  return (
    <GeneratorWorkbench
      kind="copy"
      title="Copy Generator"
      description="One product, every piece of sales copy you need. Pick a template, generate, edit, save."
      initialProductId={productId}
    />
  );
}
