import { useEffect } from "react";
import { Toaster } from "@/shared/ui/toaster";
import { Toaster as Sonner } from "@/shared/ui/sonner";
import { TooltipProvider } from "@/shared/ui/tooltip";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HashRouter, Routes, Route, useLocation } from "react-router-dom";

import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import EmailVerification from "./pages/EmailVerification";
import ImapEmailSyncConsent from "./pages/ImapEmailSyncConsent";
import About from "./pages/About";
import ResetPassword from "./pages/ResetPassword";
import Terms from "./pages/Terms";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import PublicOffer from "./pages/PublicOffer";
import Docs from "./pages/Docs";
import DataRetentionPolicy from "./pages/DataRetentionPolicy";
import PersonalDataConsent from "./pages/PersonalDataConsent";
import PaymentResult from "./pages/PaymentResult";
import HistoryPage from "./pages/HistoryPage";
import { trackPageView } from "@/api/tracking";

const queryClient = new QueryClient();

function PageViewTracker() {
  const location = useLocation();

  useEffect(() => {
    const pagePath = `${location.pathname}${location.search}${location.hash}`;

    trackPageView({
      page_path: pagePath || "/",
      page_title: document.title,
      source: "site",
    });
  }, [location.pathname, location.search, location.hash]);

  return null;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <HashRouter>
        <PageViewTracker />

        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/history" element={<HistoryPage />} />
          <Route path="/email-verification" element={<EmailVerification />} />
          <Route path="/imap-email-sync-consent" element={<ImapEmailSyncConsent />} />
          <Route path="/about" element={<About />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="/privacy" element={<PrivacyPolicy />} />
          <Route path="/offer" element={<PublicOffer />} />
          <Route path="/docs" element={<Docs />} />
          <Route path="/data-retention" element={<DataRetentionPolicy />} />
          <Route path="/personal-data-consent" element={<PersonalDataConsent />} />
          <Route path="/payment-result" element={<PaymentResult />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </HashRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;