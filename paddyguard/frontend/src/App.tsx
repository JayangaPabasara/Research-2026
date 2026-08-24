import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "react-hot-toast";
import Home from "./pages/Home";
import VoiceDiagnosis from "./pages/VoiceDiagnosis";
import LeafDisease from "./pages/LeafDisease";
import PestDetection from "./pages/PestDetection";
import Treatment from "./pages/Treatment";
import Report from "./pages/Report";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Profile from "./pages/Profile";
import ProtectedRoute from "./components/layout/ProtectedRoute";
import { useAuthStore } from "./store/authStore";

const queryClient = new QueryClient();

const PublicOnlyRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  if (isAuthenticated) return <Navigate to="/" replace />;
  return <>{children}</>;
};

const App: React.FC = () => (
  <QueryClientProvider client={queryClient}>
    <BrowserRouter>
      <Routes>
        <Route
          path="/login"
          element={
            <PublicOnlyRoute>
              <Login />
            </PublicOnlyRoute>
          }
        />
        <Route
          path="/register"
          element={
            <PublicOnlyRoute>
              <Register />
            </PublicOnlyRoute>
          }
        />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Home />
            </ProtectedRoute>
          }
        />
        <Route
          path="/voice"
          element={
            <ProtectedRoute>
              <VoiceDiagnosis />
            </ProtectedRoute>
          }
        />
        <Route
          path="/leaf"
          element={
            <ProtectedRoute>
              <LeafDisease />
            </ProtectedRoute>
          }
        />
        <Route
          path="/pest"
          element={
            <ProtectedRoute>
              <PestDetection />
            </ProtectedRoute>
          }
        />
        <Route
          path="/treatment"
          element={
            <ProtectedRoute>
              <Treatment />
            </ProtectedRoute>
          }
        />
        <Route
          path="/report"
          element={
            <ProtectedRoute>
              <Report />
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
    <Toaster position="top-center" />
  </QueryClientProvider>
);
export default App;
