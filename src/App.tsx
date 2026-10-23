import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Projects from "./pages/Projects";
import ProjectDetail from "./pages/ProjectDetail";
import Admin from "./pages/Admin";
import About from "./pages/About";
import News from "./pages/News";
import Builders from "./pages/Builders";
import BuilderDetail from "./pages/BuilderDetail";
import AcceptInvite from "./pages/AcceptInvite";
import Saved from "./pages/Saved";
import AnalyticsTracker from "./components/AnalyticsTracker";
import CompareBar from "./components/CompareBar";
import Compare from "./pages/Compare";
import Unsubscribe from "./pages/Unsubscribe";
import BuyerLoginDialog from "./components/BuyerLoginDialog";
import SiteFooter from "./components/SiteFooter";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AnalyticsTracker />
        <CompareBar />
        <BuyerLoginDialog />
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/projects" element={<Projects />} />
          <Route path="/project/:id" element={<ProjectDetail />} />
          <Route path="/builders" element={<Builders />} />
          <Route path="/builders/:id" element={<BuilderDetail />} />
          <Route path="/news" element={<News />} />
          <Route path="/about" element={<About />} />
          <Route path="/saved" element={<Saved />} />
          <Route path="/compare" element={<Compare />} />
          <Route path="/unsubscribe" element={<Unsubscribe />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/admin/onboarding/accept-invite" element={<AcceptInvite />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
        <SiteFooter />
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
