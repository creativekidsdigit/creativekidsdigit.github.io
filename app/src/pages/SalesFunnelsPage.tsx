import GeneratorWorkbench from "@/components/GeneratorWorkbench";
import { useQueryParam } from "@/lib/useQueryParam";

export default function SalesFunnelsPage() {
  const productId = useQueryParam("product");
  return (
    <GeneratorWorkbench
      kind="funnel"
      title="Sales Funnels"
      description="Lead magnets, tripwires, upsell pages, and bundle strategies — all built around your product."
      initialProductId={productId}
    />
  );
}
