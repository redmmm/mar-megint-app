import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HashRouter, Routes, Route } from "react-router-dom";

// Code-split page components for fast initial load and minimal bundle transfer
const Index = lazy(() => import("./pages/Index"));
const ChannelDashboard = lazy(() => import("./pages/ChannelDashboard"));
const NewsPage = lazy(() => import("./pages/NewsPage"));
const WeatherPage = lazy(() => import("./pages/WeatherPage"));
const SkateMapPage = lazy(() => import("./pages/SkateMapPage"));
const Login = lazy(() => import("./pages/Login"));
const Admin = lazy(() => import("./pages/Admin"));
const NotFound = lazy(() => import("./pages/NotFound"));

const PageLoader = () => (
  <div className="min-h-screen bg-background flex items-center justify-center">
    <div className="w-8 h-8 rounded-full border-2 border-emerald-500/20 border-t-emerald-500 animate-spin" />
  </div>
);

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <div className="dark">
        <Toaster />
        <Sonner />
        <HashRouter>
          <main role="main" className="min-h-screen">
            <Suspense fallback={<PageLoader />}>
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/channel/:slug" element={<ChannelDashboard />} />
                <Route path="/news" element={<NewsPage />} />
                <Route path="/weather" element={<WeatherPage />} />
                <Route path="/skatemap" element={<SkateMapPage />} />
                <Route path="/skate-map" element={<SkateMapPage />} />
                <Route path="/login" element={<Login />} />
                <Route path="/admin" element={<Admin />} />
                <Route path="/admin/skatemap" element={<Admin defaultTab="skatemap" />} />
                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </main>
        </HashRouter>
      </div>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
