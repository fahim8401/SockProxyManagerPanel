import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { 
  Shield, 
  User, 
  Key, 
  Globe, 
  Calendar, 
  HardDrive, 
  Activity,
  Copy,
  CheckCircle,
  AlertCircle
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const userLoginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

type UserLoginData = z.infer<typeof userLoginSchema>;

interface UserData {
  id: string;
  username: string;
  assignedIP: string;
  port: number;
  dataLimit: number;
  dataUsed: number;
  expirationDate: string;
  isActive: boolean;
  lastConnection?: string;
}

export default function UserPortal() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userToken, setUserToken] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const { toast } = useToast();

  const form = useForm<UserLoginData>({
    resolver: zodResolver(userLoginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  // Fetch user data after login
  const { data: userData, isLoading: isLoadingUser } = useQuery({
    queryKey: ["/api/user/profile"],
    enabled: isLoggedIn && !!userToken,
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const handleLogin = async (data: UserLoginData) => {
    try {
      const response = await fetch("/api/user/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Login failed");
      }

      const result = await response.json();
      setUserToken(result.token);
      setIsLoggedIn(true);
      localStorage.setItem("user_token", result.token);
      
      toast({
        title: "Login successful",
        description: "Welcome to your SOCKS5 user dashboard",
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Login failed",
        description: error.message,
      });
    }
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setUserToken(null);
    localStorage.removeItem("user_token");
    form.reset();
    toast({
      title: "Logged out",
      description: "You have been logged out successfully",
    });
  };

  const copyToClipboard = async (text: string, fieldName: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(fieldName);
      setTimeout(() => setCopiedField(null), 2000);
      toast({
        title: "Copied!",
        description: `${fieldName} copied to clipboard`,
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Failed to copy",
        description: "Could not copy to clipboard",
      });
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const getUsagePercentage = (used: number, limit: number) => {
    return limit > 0 ? (used / limit) * 100 : 0;
  };

  const getStatusColor = (isActive: boolean) => {
    return isActive ? "bg-green-500" : "bg-red-500";
  };

  // Login Form
  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-100 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <User className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">User Portal</h1>
            <p className="text-gray-600">Access your SOCKS5 proxy account</p>
          </div>

          <Card className="shadow-lg border-0">
            <CardHeader className="space-y-1 pb-6">
              <CardTitle className="text-2xl font-semibold text-center flex items-center justify-center gap-2">
                <Shield className="w-5 h-5" />
                User Login
              </CardTitle>
              <CardDescription className="text-center">
                Enter your SOCKS5 user credentials
              </CardDescription>
            </CardHeader>
            
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(handleLogin)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="username"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          <User className="w-4 h-4" />
                          Username
                        </FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="Enter your username"
                            className="h-11"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          <Key className="w-4 h-4" />
                          Password
                        </FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            type="password"
                            placeholder="Enter your password"
                            className="h-11"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button
                    type="submit"
                    className="w-full h-11 bg-green-600 hover:bg-green-700"
                  >
                    Sign In
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // User Dashboard
  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <User className="w-8 h-8 text-green-600" />
              User Dashboard
            </h1>
            <p className="text-gray-600 mt-1">Your SOCKS5 proxy account details</p>
          </div>
          <Button 
            onClick={handleLogout}
            variant="outline"
            className="flex items-center gap-2"
          >
            <Activity className="w-4 h-4" />
            Logout
          </Button>
        </div>

        {isLoadingUser ? (
          <div className="flex justify-center items-center h-64">
            <div className="w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : userData ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Account Status */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  Account Status
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Status</span>
                  <Badge className={`${userData.isActive ? 'bg-green-500' : 'bg-red-500'} text-white`}>
                    {userData.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Username</span>
                  <span className="font-mono font-medium">{userData.username}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Expires</span>
                  <span className="text-sm">
                    {new Date(userData.expirationDate).toLocaleDateString()}
                  </span>
                </div>
                {userData.lastConnection && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Last Connection</span>
                    <span className="text-sm">
                      {new Date(userData.lastConnection).toLocaleString()}
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Connection Details */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="w-5 h-5 text-blue-500" />
                  Connection Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">IP Address</span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm bg-gray-100 px-2 py-1 rounded">
                        {userData.assignedIP}
                      </span>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => copyToClipboard(userData.assignedIP, "IP Address")}
                        className="h-8 w-8 p-0"
                      >
                        {copiedField === "IP Address" ? (
                          <CheckCircle className="w-4 h-4 text-green-500" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Port</span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm bg-gray-100 px-2 py-1 rounded">
                        {userData.port}
                      </span>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => copyToClipboard(userData.port.toString(), "Port")}
                        className="h-8 w-8 p-0"
                      >
                        {copiedField === "Port" ? (
                          <CheckCircle className="w-4 h-4 text-green-500" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Password</span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm bg-gray-100 px-2 py-1 rounded">
                        ••••••••
                      </span>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => copyToClipboard(form.getValues("password"), "Password")}
                        className="h-8 w-8 p-0"
                      >
                        {copiedField === "Password" ? (
                          <CheckCircle className="w-4 h-4 text-green-500" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Data Usage */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <HardDrive className="w-5 h-5 text-purple-500" />
                  Data Usage
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between text-sm">
                    <span>Used: {formatBytes(userData.dataUsed)}</span>
                    <span>Limit: {formatBytes(userData.dataLimit)}</span>
                  </div>
                  <Progress 
                    value={getUsagePercentage(userData.dataUsed, userData.dataLimit)} 
                    className="h-3"
                  />
                  <div className="text-center text-sm text-gray-600">
                    {getUsagePercentage(userData.dataUsed, userData.dataLimit).toFixed(1)}% used
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Proxy Configuration */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="w-5 h-5 text-orange-500" />
                  Proxy Configuration
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>SOCKS5 Proxy Settings:</strong><br />
                    <div className="mt-2 font-mono text-sm space-y-1">
                      <div>Host: {userData.assignedIP}</div>
                      <div>Port: {userData.port}</div>
                      <div>Username: {userData.username}</div>
                      <div>Password: [Your password]</div>
                      <div>Protocol: SOCKS5</div>
                    </div>
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          </div>
        ) : (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Unable to load user data. Please try refreshing the page.
            </AlertDescription>
          </Alert>
        )}
      </div>
    </div>
  );
}