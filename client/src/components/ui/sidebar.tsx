import { Link, useLocation } from "wouter";
import { 
  Shield, 
  BarChart3, 
  Users, 
  UserPlus,
  Network, 
  TrendingUp, 
  Settings, 
  FileText,
  Key,
  Package,
  LogOut
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";

const navigation = [
  { name: "Dashboard", href: "/", icon: BarChart3 },
  { name: "Create User", href: "/create-user", icon: UserPlus },
  { name: "User Management", href: "/users", icon: Users },
  { name: "Package Management", href: "/packages", icon: Package },
  { name: "API Management", href: "/api-management", icon: Key },
  { name: "IP Pool Management", href: "/ip-pool", icon: Network },
  { name: "Admin Management", href: "/admin-management", icon: Shield },
  { name: "Analytics", href: "/analytics", icon: TrendingUp },
  { name: "Settings", href: "/settings", icon: Settings },
  { name: "Logs", href: "/logs", icon: FileText },
];

export default function Sidebar() {
  const [location] = useLocation();
  const { logout } = useAuth();

  return (
    <div className="w-64 bg-white shadow-lg animate-slideInLeft flex flex-col">
      <div className="flex items-center justify-center h-16 border-b border-gray-200">
        <div className="flex items-center space-x-2 animate-fadeInScale">
          <Shield className="text-primary w-6 h-6 transition-transform hover:scale-110" />
          <span className="text-xl font-bold text-gray-800">SOCKS5 Admin</span>
        </div>
      </div>
      
      <nav className="mt-8 flex-1">
        <div className="px-4 space-y-2">
          {navigation.map((item, index) => {
            const isActive = location === item.href;
            return (
              <Link key={item.name} href={item.href}>
                <a className={cn(
                  "flex items-center px-4 py-2 text-sm font-medium rounded-lg transition-all duration-300 animate-fadeInUp group",
                  `delay-${(index + 1) * 50}`,
                  isActive
                    ? "text-primary bg-blue-50 shadow-sm"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900 hover:translate-x-1 hover:shadow-sm"
                )}>
                  <item.icon className="mr-3 w-5 h-5 transition-transform group-hover:scale-110" />
                  {item.name}
                </a>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Logout Button */}
      <div className="p-4 border-t border-gray-200">
        <Button
          onClick={logout}
          variant="ghost"
          className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50"
        >
          <LogOut className="mr-3 w-5 h-5" />
          Logout
        </Button>
        <div className="mt-2 text-xs text-gray-500 text-center">
          Auto-logout in 5 min of inactivity
        </div>
      </div>
    </div>
  );
}
