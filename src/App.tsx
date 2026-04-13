import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import Login from "./pages/Login";
import AdminLayout from "./components/AdminLayout";
import MilitaryLayout from "./components/MilitaryLayout";
import Dashboard from "./pages/Dashboard";
import Militares from "./pages/Militares";
import Exercicios from "./pages/Exercicios";
import Planos from "./pages/Planos";
import Agenda from "./pages/Agenda";
import Relatorios from "./pages/Relatorios";
import PainelMilitar from "./pages/PainelMilitar";
import Auditoria from "./pages/Auditoria";
import PerfilMilitar from "./pages/PerfilMilitar";
import Configuracoes from "./pages/Configuracoes";
import Usuarios from "./pages/Usuarios";
import Prontuario from "./pages/Prontuario";
import Duvidas from "./pages/Duvidas";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function AppRoutes() {
  const { user, role, loading } = useAuth();

  if (loading || (user && !role)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <Routes>
        <Route path="*" element={<Login />} />
      </Routes>
    );
  }

  if (role === 'admin') {
    return (
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/painel" element={<Navigate to="/dashboard" replace />} />
        <Route element={<AdminLayout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/militares" element={<Militares />} />
          <Route path="/militares/:id" element={<PerfilMilitar />} />
          <Route path="/exercicios" element={<Exercicios />} />
          <Route path="/planos" element={<Planos />} />
          <Route path="/agenda" element={<Agenda />} />
          <Route path="/relatorios" element={<Relatorios />} />
          <Route path="/auditoria" element={<Auditoria />} />
          <Route path="/usuarios" element={<Usuarios />} />
          <Route path="/prontuario" element={<Prontuario />} />
          <Route path="/duvidas" element={<Duvidas />} />
          <Route path="/configuracoes" element={<Configuracoes />} />
        </Route>
        <Route path="*" element={<NotFound />} />
      </Routes>
    );
  }

  // Military role
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/painel" replace />} />
      <Route element={<MilitaryLayout />}>
        <Route path="/painel" element={<PainelMilitar />} />
        <Route path="/painel/plano" element={<PainelMilitar />} />
        <Route path="/painel/agenda" element={<PainelMilitar />} />
        <Route path="/painel/perfil" element={<PainelMilitar />} />
      </Route>
      <Route path="*" element={<Navigate to="/painel" replace />} />
    </Routes>
  );
}

const App = () => (
  <ThemeProvider attribute="class" defaultTheme="light" storageKey="fisioapp-theme">
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <AppRoutes />
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;
