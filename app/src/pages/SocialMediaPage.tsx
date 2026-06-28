import GeneratorWorkbench from "@/components/GeneratorWorkbench";
import { useQueryParam } from "@/lib/useQueryParam";

export default function SocialMediaPage() {
  const productId = useQueryParam("product");
  return (
    <GeneratorWorkbench
      kind="social"
      title="Social Media"
      description="Platform-native copy for Pinterest, Facebook, Instagram, LinkedIn, X, Threads, and TikTok."
      initialProductId={productId}
    />
  );
}
