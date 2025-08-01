import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Package, Network, Shield, User, Calendar, Database, Shuffle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import Sidebar from "@/components/ui/sidebar";

interface Package {
  id: string;
  name: string;
  description: string;
  dataLimitGB: number;
  timeLimit: number;
  maxConnections: number;
  price: number;
}

interface IPAddress {
  id: string;
  ipAddress: string;
  ipType: string;
  isAvailable: boolean;
}

export default function CreateUserEnhanced() {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    username: "",
    password: "",
    confirmPassword: "",
    email: "",
    ipAddress: "",
    port: 1080,
    dataLimit: 10, // GB
    daysValid: 30,
    packageId: "",
    isActive: true
  });

  const { data: packages = [] } = useQuery<Package[]>({
    queryKey: ["/api/packages"],
  });

  const { data: ipAddresses = [] } = useQuery<IPAddress[]>({
    queryKey: ["/api/ip-pool"],
  });

  const availableIPs = ipAddresses.filter(ip => ip.isAvailable);

  const handlePackageSelect = (packageId: string) => {
    const selectedPackage = packages.find(pkg => pkg.id === packageId);
    if (selectedPackage) {
      setFormData(prev => ({
        ...prev,
        packageId,
        dataLimit: selectedPackage.dataLimitGB,
        daysValid: selectedPackage.timeLimit
      }));
    }
  };

  const generateRandomPort = () => {
    const port = Math.floor(Math.random() * (65535 - 1024) + 1024);
    setFormData(prev => ({ ...prev, port }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.password !== formData.confirmPassword) {
      toast({
        title: "Error",
        description: "Passwords do not match",
        variant: "destructive",
      });
      return;
    }

    if (!formData.ipAddress) {
      toast({
        title: "Error", 
        description: "Please select an IP address",
        variant: "destructive",
      });
      return;
    }

    try {
      const response = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: formData.username,
          password: formData.password,
          email: formData.email || undefined,
          ipAddress: formData.ipAddress,
          port: formData.port,
          dataLimit: formData.dataLimit * 1024 * 1024 * 1024, // Convert GB to bytes
          daysValid: formData.daysValid,
          packageId: formData.packageId || undefined,
          isActive: formData.isActive,
          expiresAt: Math.floor((Date.now() + formData.daysValid * 24 * 60 * 60 * 1000) / 1000)
        }),
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: "User created successfully!",
          variant: "default",
        });
        window.location.href = "/users";
      } else {
        const error = await response.json();
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create user",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="flex h-screen bg-gray-100 dark:bg-gray-900">
      <Sidebar />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white dark:bg-gray-800 shadow-sm z-10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-6">
              <div className="flex items-center">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => window.location.href = "/users"}
                  className="mr-4"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Users
                </Button>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                    Create SOCKS5 User
                  </h1>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Add a new user to your SOCKS5 proxy system
                  </p>
                </div>
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-100 dark:bg-gray-900">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <form onSubmit={handleSubmit} className="space-y-8">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                
                {/* Package Selection */}
                <Card className="lg:col-span-1">
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Package className="h-5 w-5 mr-2" />
                      Package Selection
                    </CardTitle>
                    <CardDescription>
                      Choose a package to auto-fill limits (optional)
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label htmlFor="package">Package</Label>
                      <Select onValueChange={handlePackageSelect} value={formData.packageId}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select package (optional)" />
                        </SelectTrigger>
                        <SelectContent>
                          {packages.map((pkg) => (
                            <SelectItem key={pkg.id} value={pkg.id}>
                              <div className="flex items-center justify-between w-full">
                                <span>{pkg.name}</span>
                                <Badge variant="secondary" className="ml-2">
                                  ${pkg.price}
                                </Badge>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    {formData.packageId && (
                      <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                        <h4 className="font-medium text-blue-900 dark:text-blue-100">
                          {packages.find(p => p.id === formData.packageId)?.name}
                        </h4>
                        <p className="text-sm text-blue-700 dark:text-blue-300">
                          {packages.find(p => p.id === formData.packageId)?.description}
                        </p>
                        <div className="mt-2 text-sm text-blue-600 dark:text-blue-400">
                          <div>Data: {formData.dataLimit}GB</div>
                          <div>Valid: {formData.daysValid} days</div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* User Details */}
                <Card className="lg:col-span-2">
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <User className="h-5 w-5 mr-2" />
                      User Details
                    </CardTitle>
                    <CardDescription>
                      Basic user information and credentials
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="username">Username *</Label>
                        <Input
                          id="username"
                          type="text"
                          value={formData.username}
                          onChange={(e) => setFormData({...formData, username: e.target.value})}
                          required
                          placeholder="Enter username"
                        />
                      </div>
                      <div>
                        <Label htmlFor="email">Email (Optional)</Label>
                        <Input
                          id="email"
                          type="email"
                          value={formData.email}
                          onChange={(e) => setFormData({...formData, email: e.target.value})}
                          placeholder="user@example.com"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="password">Password *</Label>
                        <Input
                          id="password"
                          type="password"
                          value={formData.password}
                          onChange={(e) => setFormData({...formData, password: e.target.value})}
                          required
                          placeholder="Enter password"
                        />
                      </div>
                      <div>
                        <Label htmlFor="confirmPassword">Confirm Password *</Label>
                        <Input
                          id="confirmPassword"
                          type="password"
                          value={formData.confirmPassword}
                          onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})}
                          required
                          placeholder="Confirm password"
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Network Configuration */}
                <Card className="lg:col-span-2">
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Network className="h-5 w-5 mr-2" />
                      Network Configuration
                    </CardTitle>
                    <CardDescription>
                      IP address and port settings
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="ipAddress">IP Address *</Label>
                        <Select onValueChange={(value) => setFormData({...formData, ipAddress: value})}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select IP address" />
                          </SelectTrigger>
                          <SelectContent>
                            {availableIPs.map((ip) => (
                              <SelectItem key={ip.id} value={ip.ipAddress}>
                                <div className="flex items-center">
                                  <span>{ip.ipAddress}</span>
                                  <Badge variant="outline" className="ml-2">
                                    {ip.ipType}
                                  </Badge>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="port">Port</Label>
                        <div className="flex space-x-2">
                          <Input
                            id="port"
                            type="number"
                            value={formData.port}
                            onChange={(e) => setFormData({...formData, port: parseInt(e.target.value)})}
                            min="1024"
                            max="65535"
                          />
                          <Button type="button" variant="outline" size="icon" onClick={generateRandomPort}>
                            <Shuffle className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Usage Limits */}
                <Card className="lg:col-span-1">
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Database className="h-5 w-5 mr-2" />
                      Usage Limits
                    </CardTitle>
                    <CardDescription>
                      Data and time restrictions
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label htmlFor="dataLimit">Data Limit (GB)</Label>
                      <Input
                        id="dataLimit"
                        type="number"
                        value={formData.dataLimit}
                        onChange={(e) => setFormData({...formData, dataLimit: parseInt(e.target.value)})}
                        min="1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="daysValid">Valid For (Days)</Label>
                      <Input
                        id="daysValid"
                        type="number"
                        value={formData.daysValid}
                        onChange={(e) => setFormData({...formData, daysValid: parseInt(e.target.value)})}
                        min="1"
                      />
                    </div>
                    <div className="pt-2">
                      <Badge variant="outline" className="text-xs">
                        <Calendar className="h-3 w-3 mr-1" />
                        Expires: {new Date(Date.now() + formData.daysValid * 24 * 60 * 60 * 1000).toLocaleDateString()}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Submit Actions */}
              <Card>
                <CardContent className="pt-6">
                  <div className="flex justify-end space-x-4">
                    <Button 
                      type="button" 
                      variant="outline"
                      onClick={() => window.location.href = "/users"}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
                      <Shield className="h-4 w-4 mr-2" />
                      Create User
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </form>
          </div>
        </main>
      </div>
    </div>
  );
}