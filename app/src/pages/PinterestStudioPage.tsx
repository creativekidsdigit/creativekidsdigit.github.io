import GeneratorWorkbench from "@/components/GeneratorWorkbench";
import { useQueryParam } from "@/lib/useQueryParam";

export default function PinterestStudioPage() {
  const productId = useQueryParam("product");
  return (
    <GeneratorWorkbench
      kind="pinterest"
      title="Pinterest Studio"
      description="Titles, descriptions, CTAs, boards, image prompts, seasonal calendars, keyword maps — all from a single product."
      initialProductId={productId}
    />
  );
}
