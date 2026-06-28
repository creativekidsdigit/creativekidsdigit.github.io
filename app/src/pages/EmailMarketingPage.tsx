import GeneratorWorkbench from "@/components/GeneratorWorkbench";
import { useQueryParam } from "@/lib/useQueryParam";

export default function EmailMarketingPage() {
  const productId = useQueryParam("product");
  return (
    <GeneratorWorkbench
      kind="email"
      title="Email Marketing"
      description="Launches, welcome, abandoned cart, newsletter, promo, holiday, upsell, full nurture sequences."
      initialProductId={productId}
    />
  );
}
