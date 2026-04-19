import { Toaster } from "@/shared/ui/toaster";
import { Toaster as Sonner } from "@/shared/ui/sonner";
import { TooltipProvider } from "@/shared/ui/tooltip";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HashRouter, Routes, Route } from "react-router-dom";

import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import EmailVerification from "./pages/EmailVerification";
import About from "./pages/About";
import ResetPassword from "./pages/ResetPassword";
import Terms from "./pages/Terms";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import PublicOffer from "./pages/PublicOffer";
import Docs from "./pages/Docs";
import DataRetentionPolicy from "./pages/DataRetentionPolicy";
import PersonalDataConsent from "./pages/PersonalDataConsent";
import PaymentResult from "./pages/PaymentResult";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <HashRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/email-verification" element={<EmailVerification />} />
          <Route path="/about" element={<About />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="/privacy" element={<PrivacyPolicy />} />
          <Route path="/offer" element={<PublicOffer />} />
          <Route path="/docs" element={<Docs />} />
          <Route path="/data-retention" element={<DataRetentionPolicy />} />
          <Route path="/personal-data-consent" element={<PersonalDataConsent />} />
          <Route path="*" element={<NotFound />} />
          <Route path="/payment-result" element={<PaymentResult />} />
        </Routes>
      </HashRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;