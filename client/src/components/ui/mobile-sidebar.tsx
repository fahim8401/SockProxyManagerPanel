import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { 
  Menu, 
  Home, 
  Users, 
  Settings, 
  BarChart3, 
  Server,
  FileText,
  Shield,
  Key,
  Database,
  Package
} from "lucide-react";

export default function MobileSidebar() {
  const [location] = useLocation();
  const [isOpen, setIsOpen] = useState(false);

  const menuItems = [
    { href: "/", icon: Home, label: "Dashboard" },
    { href: "/users", icon: Users, label: "User Management" },
    { href: "/create-user", icon: Package, label: "Create User" },
    { href: "/ip-pool", icon: Server, label: "IP Pool" },
    { href: "/analytics", icon: BarChart3, label: "Analytics" },
    { href: "/api-management", icon: Key, label: "API Management" },
    { href: "/admin-management", icon: Shield, label: "Admin Management" },
    { href: "/packages", icon: Database, label: "Package Management" },
    { href: "/logs", icon: FileText, label: "Logs" },
    { href: "/settings", icon: Settings, label: "Settings" },
  ];

  return (
    <div className="lg:hidden">
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="sm" className="p-2 fixed top-4 left-4 z-50 bg-white shadow-sm">
            <Menu className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-64 p-0">
          <div className="flex flex-col h-full">
            {/* Header */}
            <div className="flex items-center justify-center h-16 border-b border-gray-200 bg-white">
              <div className="flex items-center space-x-2">
                <Shield className="text-primary w-6 h-6" />
                <span className="text-lg font-bold text-gray-800">SOCKS5 Admin</span>
              </div>
            </div>
            
            {/* Navigation */}
            <nav className="flex-1 overflow-y-auto py-4">
              <div className="px-3 space-y-1">
                {menuItems.map((item) => {
                  const isActive = location === item.href;
                  return (
                    <Link 
                      key={item.href} 
                      href={item.href}
                      onClick={() => setIsOpen(false)}
                    >
                      <div className={`flex items-center px-3 py-2 text-sm rounded-md transition-colors ${
                        isActive 
                          ? 'bg-primary text-white' 
                          : 'text-gray-700 hover:bg-gray-100'
                      }`}>
                        <item.icon className={`mr-3 h-4 w-4 ${isActive ? 'text-white' : 'text-gray-400'}`} />
                        {item.label}
                      </div>
                    </Link>
                  );
                })}
              </div>
            </nav>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}