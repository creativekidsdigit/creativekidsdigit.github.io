import GeneratorWorkbench from "@/components/GeneratorWorkbench";
import { useQueryParam } from "@/lib/useQueryParam";

export default function BlogGeneratorPage() {
	const productId = useQueryParam("product");
	return (
		<GeneratorWorkbench
			kind="blog"
			title="Blog Generator"
			description="Generate full blog posts (how-to, guides, comparisons, FAQ) from one product entry."
			initialProductId={productId}
		/>
	);
}
