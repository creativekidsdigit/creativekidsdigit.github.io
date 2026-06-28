import { Routes, Route, Navigate } from "react-router-dom";
import Shell from "./components/Shell";
import { ToastViewport } from "./components/Toast";
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
import SettingsPage from "./pages/SettingsPage";

export default function App() {
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
          <Route path="campaigns" element={<CampaignAnalyticsPage />} />
          <Route path="campaigns/:id" element={<CampaignDetailPage />} />
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
