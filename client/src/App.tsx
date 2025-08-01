import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import Dashboard from "@/pages/dashboard";
import IpPoolPage from "@/pages/ip-pool";
import AnalyticsPage from "@/pages/analytics";
import SettingsPage from "@/pages/settings";
import LogsPage from "@/pages/logs";
import Login from "@/pages/login";
import UserPortal from "@/pages/user-portal";
import AdminManagement from "@/pages/admin-management";
import ApiManagement from "@/pages/api-management";
import UserManagement from "@/pages/user-management";
import PackageManagement from "@/pages/package-management";
import NotFound from "@/pages/not-found";
import CreateUser from "@/pages/create-user";
import CreateUserWorkingSimple from "@/pages/create-user-working-simple";
import TestPage from "@/pages/test";

function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  const { isAuthenticated } = useAuth();
  
  if (!isAuthenticated) {
    return <Login />;
  }
  
  return <Component />;
}

function AuthenticatedRouter() {
  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route path="/user-portal" component={UserPortal} />
      <Route path="/" component={() => <ProtectedRoute component={Dashboard} />} />
      <Route path="/users" component={() => <ProtectedRoute component={UserManagement} />} />
      <Route path="/ip-pool" component={() => <ProtectedRoute component={IpPoolPage} />} />
      <Route path="/analytics" component={() => <ProtectedRoute component={AnalyticsPage} />} />
      <Route path="/settings" component={() => <ProtectedRoute component={SettingsPage} />} />
      <Route path="/logs" component={() => <ProtectedRoute component={LogsPage} />} />
      <Route path="/admin-management" component={() => <ProtectedRoute component={AdminManagement} />} />
      <Route path="/api-management" component={() => <ProtectedRoute component={ApiManagement} />} />
      <Route path="/packages" component={() => <ProtectedRoute component={PackageManagement} />} />
      <Route path="/create-user" component={() => <ProtectedRoute component={CreateUserWorkingSimple} />} />
      <Route path="/create-user-full" component={() => <ProtectedRoute component={CreateUser} />} />
      <Route path="/test" component={TestPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthenticatedRouter />
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
