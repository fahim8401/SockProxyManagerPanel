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
  Package
} from "lucide-react";
import { cn } from "@/lib/utils";

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

  return (
    <div className="w-64 bg-white shadow-lg">
      <div className="flex items-center justify-center h-16 border-b border-gray-200">
        <div className="flex items-center space-x-2">
          <Shield className="text-primary w-6 h-6" />
          <span className="text-xl font-bold text-gray-800">SOCKS5 Admin</span>
        </div>
      </div>
      
      <nav className="mt-8">
        <div className="px-4 space-y-2">
          {navigation.map((item) => {
            const isActive = location === item.href;
            return (
              <Link key={item.name} href={item.href}>
                <a className={cn(
                  "flex items-center px-4 py-2 text-sm font-medium rounded-lg transition-colors",
                  isActive
                    ? "text-primary bg-blue-50"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                )}>
                  <item.icon className="mr-3 w-5 h-5" />
                  {item.name}
                </a>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
