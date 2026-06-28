import { useEffect, useRef } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import Shell from "./components/Shell";
import { ToastViewport, toast } from "./components/Toast";
import { STORAGE_ERROR_EVENT } from "./lib/storage";
import DashboardPage from "./pages/DashboardPage";
import ProductsPage from "./pages/ProductsPage";
import ProductDetailPage from "./pages/ProductDetailPage";
import CopyGeneratorPage from "./pages/CopyGeneratorPage";
import PinterestStudioPage from "./pages/PinterestStudioPage";
import SeoStudioPage from "./pages/SeoStudioPage";
import EmailMarketingPage from "./pages/EmailMarketingPage";
import BlogGeneratorPage from "./pages/BlogGeneratorPage";
import SocialMediaPage from "./pages/SocialMediaPage";
import SalesFunnelsPage from "./pages/SalesFunnelsPage";
import PromptLibraryPage from "./pages/PromptLibraryPage";
import ContentLibraryPage from "./pages/ContentLibraryPage";
import AnalyticsPage from "./pages/AnalyticsPage";
import CampaignAnalyticsPage from "./pages/CampaignAnalyticsPage";
import CampaignDetailPage from "./pages/CampaignDetailPage";
import CampaignBuilderPage from "./pages/CampaignBuilderPage";
import PublishingWorkspacePage from "./pages/PublishingWorkspacePage";
import ResearchPage from "./pages/ResearchPage";
import OpportunityDetailPage from "./pages/OpportunityDetailPage";
import SettingsPage from "./pages/SettingsPage";

export default function App() {
  // Surface persistent-write failures to the user so silent IDB rejections
  // (out-of-quota, transaction crash, incognito storage policy, etc.) don't
  // become silent data loss. storage.ts dispatches one event per failure;
  // we throttle to one toast per minute to avoid spamming when the user
  // continues to edit while quota is full.
  const lastNotifiedRef = useRef<number>(0);
  useEffect(() => {
    function handler(e: Event) {
      const ce = e as CustomEvent<{ op: string; key: string; error: unknown }>;
      const now = Date.now();
      if (now - lastNotifiedRef.current < 60_000) return;
      lastNotifiedRef.current = now;
      toast.error(
        "Couldn't save to local storage — your browser may be out of room. " +
          "Export a backup from Settings before continuing."
      );
      // Keep the diagnostic record for the developer console.
      // eslint-disable-next-line no-console
      console.warn("[App] storage error event", ce.detail);
    }
    window.addEventListener(STORAGE_ERROR_EVENT, handler);
    return () => window.removeEventListener(STORAGE_ERROR_EVENT, handler);
  }, []);

  return (
    <>
      <Routes>
        <Route element={<Shell />}>
          <Route index element={<DashboardPage />} />
          <Route path="products" element={<ProductsPage />} />
          <Route path="products/:id" element={<ProductDetailPage />} />
          <Route path="copy" element={<CopyGeneratorPage />} />
          <Route path="pinterest" element={<PinterestStudioPage />} />
          <Route path="seo" element={<SeoStudioPage />} />
          <Route path="email" element={<EmailMarketingPage />} />
          <Route path="blog" element={<BlogGeneratorPage />} />
          <Route path="social" element={<SocialMediaPage />} />
          <Route path="funnels" element={<SalesFunnelsPage />} />
          <Route path="builder" element={<CampaignBuilderPage />} />
          <Route path="campaigns" element={<CampaignAnalyticsPage />} />
          <Route path="campaigns/:id" element={<CampaignDetailPage />} />
          <Route
            path="campaigns/:id/publish"
            element={<PublishingWorkspacePage />}
          />
          <Route path="research" element={<ResearchPage />} />
          <Route path="research/:id" element={<OpportunityDetailPage />} />
          <Route path="prompts" element={<PromptLibraryPage />} />
          <Route path="library" element={<ContentLibraryPage />} />
          <Route path="analytics" element={<AnalyticsPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
      <ToastViewport />
    </>
  );
}
