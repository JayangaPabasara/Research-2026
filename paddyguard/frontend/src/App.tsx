import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "react-hot-toast";
import Home from "./pages/Home";
import VoiceDiagnosis from "./pages/VoiceDiagnosis";
import LeafDisease from "./pages/LeafDisease";
import PestDetection from "./pages/PestDetection";
import Treatment from "./pages/Treatment";
import Report from "./pages/Report";

const queryClient = new QueryClient();

const App: React.FC = () => (
  <QueryClientProvider client={queryClient}>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/voice" element={<VoiceDiagnosis />} />
        <Route path="/leaf" element={<LeafDisease />} />
        <Route path="/pest" element={<PestDetection />} />
        <Route path="/treatment" element={<Treatment />} />
        <Route path="/report" element={<Report />} />
      </Routes>
    </BrowserRouter>
    <Toaster position="top-center" />
  </QueryClientProvider>
);
export default App;
