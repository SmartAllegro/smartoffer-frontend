import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { bootstrapAuth, getCachedUserMe, type UserMe } from "@/api/auth";
import { getAuthContextKey, subscribeAuth } from "@/shared/utils/auth";
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
import RequestDetailPage from "./pages/RequestDetailPage";
import ChatPage from "./pages/ChatPage";
import AdminPage from "./pages/AdminPage";
import { trackPageView } from "@/api/tracking";

const queryClient = new QueryClient();

type AuthBootstrapState =
  | { status: "checking" }
  | { status: "ready"; generation: number; user: UserMe | null }
  | { status: "unavailable" };

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

const App = () => {
  const [bootstrap, setBootstrap] = useState<AuthBootstrapState>({ status: "checking" });
  const bootstrapRun = useRef(0);
  const authGeneration = useSyncExternalStore(subscribeAuth, getAuthContextKey);

  const runBootstrap = useCallback(() => {
    const run = ++bootstrapRun.current;
    setBootstrap({ status: "checking" });
    void bootstrapAuth().then(
      user => {
        if (bootstrapRun.current === run) {
          setBootstrap({ status: "ready", generation: getAuthContextKey(), user });
        }
      },
      () => {
        if (bootstrapRun.current === run) setBootstrap({ status: "unavailable" });
      },
    );
  }, []);

  useEffect(() => {
    runBootstrap();
    return () => { bootstrapRun.current += 1; };
  }, [runBootstrap]);

  useEffect(() => { queryClient.clear(); }, [authGeneration]);

  if (bootstrap.status === "checking") {
    return <div role="status" className="p-8 text-center">Проверяем авторизацию…</div>;
  }
  if (bootstrap.status === "unavailable") {
    return (
      <main className="mx-auto max-w-lg p-8 text-center">
        <h1 className="text-xl font-semibold">Авторизация временно недоступна</h1>
        <p className="mt-3 text-muted-foreground">Не удалось проверить текущую сессию. Это не означает, что вы вышли.</p>
        <button type="button" className="mt-5 rounded-md border px-4 py-2" onClick={runBootstrap}>Повторить</button>
      </main>
    );
  }
  const initialUser = bootstrap.generation === authGeneration ? bootstrap.user : getCachedUserMe();
  return (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <HashRouter>
        <PageViewTracker />

        <Routes>
          <Route path="/" element={<Index initialUser={initialUser} />} />
          <Route path="/history" element={<HistoryPage />} />
          <Route path="/admin" element={<AdminPage />} />
          <Route path="/requests/:jobId" element={<RequestDetailPage />} />
          <Route path="/chat" element={<ChatPage />} />
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
};

export default App;
