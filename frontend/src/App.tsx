import { useEffect } from 'react';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { LanguageProvider } from "./contexts/LanguageContext";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, Outlet } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import { AuthProvider } from "./contexts/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import Login from "./pages/Login";
import SuperAdminDashboard from "./pages/SuperAdminDashboard";
import KioskHome from './pages/KioskHome';
import RestaurantDashboard from "./pages/RestaurantDashboard";
import ScreenView from "./pages/ScreenView";
import Unauthorized from "./pages/Unauthorized";
import { SocketProvider } from './contexts/SocketContext';
import { AdminProvider } from './contexts/AdminContext';
import AdminRestaurants from "./pages/admin/AdminRestaurants";
import AdminScreens from "./pages/admin/AdminScreens";
import AdminCalls from "./pages/admin/AdminCalls";
import { CallProvider } from "./contexts/CallContext";
import { CallOverlay } from "./components/kiosk/CallOverlay";

const AdminGroup = () => (
  <ProtectedRoute allowedRoles={['SUPER_ADMIN']}>
    <AdminProvider>
      <Outlet />
    </AdminProvider>
  </ProtectedRoute>
);


const queryClient = new QueryClient();

const App = () => {
  useEffect(() => {
    document.title = "Drive 2";
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <SocketProvider>
          <AuthProvider>
            <LanguageProvider>
              <CallProvider>
                <CallOverlay />
                <Routes>
                  <Route path="/login" element={<Login />} />
                  <Route path="/unauthorized" element={<Unauthorized />} />

                  {/* Public Routes */}
                  <Route path="/" element={<Index />} />

                  {/* Super Admin Routes */}
                  <Route element={<AdminGroup />}>
                    <Route path="/admin" element={<SuperAdminDashboard />} />
                    <Route path="/admin/restaurants" element={<AdminRestaurants />} />
                    <Route path="/admin/screens" element={<AdminScreens />} />
                    <Route path="/admin/calls" element={<AdminCalls />} />
                  </Route>

                  {/* Restaurant Admin Routes */}
                  <Route
                    path="/restaurant"
                    element={
                      <ProtectedRoute allowedRoles={['RESTAURANT']}>
                        <RestaurantDashboard />
                      </ProtectedRoute>
                    }
                  />

                  {/* My Restaurants Route */}
                  <Route path="/my-restaurants" element={
                    <ProtectedRoute allowedRoles={['SCREEN', 'SUPER_ADMIN']}>
                      <KioskHome />
                    </ProtectedRoute>
                  } />

                  {/* Screen Routes */}
                  <Route
                    path="/screen"
                    element={
                      <ProtectedRoute allowedRoles={['SCREEN', 'SUPER_ADMIN']}>
                        <AdminProvider>
                          <ScreenView />
                        </AdminProvider>
                      </ProtectedRoute>
                    }
                  />

                  {/* Fallback */}
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </CallProvider>
            </LanguageProvider>
          </AuthProvider>
        </SocketProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
  );
};

export default App;
