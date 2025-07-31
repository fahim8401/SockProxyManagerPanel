import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import Dashboard from "@/pages/dashboard";
import IpPoolPage from "@/pages/ip-pool";
import AnalyticsPage from "@/pages/analytics";
import SettingsPage from "@/pages/settings";
import LogsPage from "@/pages/logs";
import LoginPage from "@/pages/login";
import UserPortal from "@/pages/user-portal";
import NotFound from "@/pages/not-found";

function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  const { isAuthenticated } = useAuth();
  
  if (!isAuthenticated) {
    return <LoginPage onLogin={() => {}} />;
  }
  
  return <Component />;
}

function AuthenticatedRouter() {
  const { isAuthenticated, login } = useAuth();
  
  if (!isAuthenticated) {
    return <LoginPage onLogin={login} />;
  }
  
  return (
    <Switch>
      <Route path="/" component={() => <ProtectedRoute component={Dashboard} />} />
      <Route path="/users" component={() => <ProtectedRoute component={Dashboard} />} />
      <Route path="/ip-pool" component={() => <ProtectedRoute component={IpPoolPage} />} />
      <Route path="/analytics" component={() => <ProtectedRoute component={AnalyticsPage} />} />
      <Route path="/settings" component={() => <ProtectedRoute component={SettingsPage} />} />
      <Route path="/logs" component={() => <ProtectedRoute component={LogsPage} />} />
      <Route path="/user-portal" component={UserPortal} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <AuthenticatedRouter />
          <Toaster />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
