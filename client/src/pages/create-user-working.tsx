import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

export default function CreateUserWorking() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  const [formData, setFormData] = useState({
    username: "",
    password: "",
    email: "",
    ipAddress: "",
    port: 1080,
    dataLimit: 10,
    daysValid: 30,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const response = await fetch("/api/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...formData,
          dataLimit: formData.dataLimit * 1024 * 1024 * 1024, // Convert GB to bytes
          isActive: true
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to create user");
      }

      toast({
        title: "Success",
        description: "User created successfully",
      });
      
      setLocation("/users");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create user",
        variant: "destructive",
      });
    }
  };

  const handleChange = (field: string, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="container mx-auto py-8 px-4">
        <div className="max-w-2xl mx-auto">
          <div className="mb-6">
            <Button 
              variant="ghost" 
              onClick={() => setLocation("/users")}
              className="mb-4"
            >
              ← Back to Users
            </Button>
            <h1 className="text-3xl font-bold text-gray-900">Create SOCKS5 User</h1>
            <p className="text-gray-600 mt-2">Add a new user to the proxy server</p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>User Details</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="username">Username *</Label>
                    <Input
                      id="username"
                      type="text"
                      value={formData.username}
                      onChange={(e) => handleChange("username", e.target.value)}
                      required
                      placeholder="Enter username"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="password">Password *</Label>
                    <Input
                      id="password"
                      type="password"
                      value={formData.password}
                      onChange={(e) => handleChange("password", e.target.value)}
                      required
                      placeholder="Enter password"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="email">Email (Optional)</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleChange("email", e.target.value)}
                    placeholder="user@example.com"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="ipAddress">IP Address</Label>
                    <Input
                      id="ipAddress"
                      type="text"
                      value={formData.ipAddress}
                      onChange={(e) => handleChange("ipAddress", e.target.value)}
                      placeholder="172.100.100.100"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="port">Port</Label>
                    <Input
                      id="port"
                      type="number"
                      value={formData.port}
                      onChange={(e) => handleChange("port", parseInt(e.target.value))}
                      min="1080"
                      max="65535"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="dataLimit">Data Limit (GB)</Label>
                    <Input
                      id="dataLimit"
                      type="number"
                      value={formData.dataLimit}
                      onChange={(e) => handleChange("dataLimit", parseInt(e.target.value))}
                      min="1"
                      max="1000"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="daysValid">Valid For (Days)</Label>
                    <Input
                      id="daysValid"
                      type="number"
                      value={formData.daysValid}
                      onChange={(e) => handleChange("daysValid", parseInt(e.target.value))}
                      min="1"
                      max="365"
                    />
                  </div>
                </div>

                <div className="flex justify-end space-x-4 pt-6">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setLocation("/users")}
                  >
                    Cancel
                  </Button>
                  <Button type="submit">
                    Create User
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}