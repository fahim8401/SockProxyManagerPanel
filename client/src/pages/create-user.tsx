import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { UserPlus, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { insertUserSchema } from "@shared/schema";
import Sidebar from "@/components/ui/sidebar";
import { useLocation } from "wouter";

type CreateUserFormData = z.infer<typeof insertUserSchema>;

interface IpAddress {
  id: string;
  ipAddress: string;
  ipType: string;
  isAvailable: boolean;
}

export default function CreateUser() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<CreateUserFormData>({
    resolver: zodResolver(insertUserSchema),
    defaultValues: {
      username: "",
      password: "",
      confirmPassword: "",
      email: "",
      ipAddress: "",
      port: 1080,
      dataLimit: 10737418240, // 10GB in bytes
      daysValid: 30,
      isActive: true,
    },
  });

  // Fetch available IP addresses
  const { data: availableIPs = [], isLoading: ipsLoading } = useQuery({
    queryKey: ["/api/ip-pool", { available: true }],
  }) as { data: IpAddress[]; isLoading: boolean };

  const createUserMutation = useMutation({
    mutationFn: async (data: CreateUserFormData) => {
      const { confirmPassword, ...userData } = data;
      return await apiRequest("POST", "/api/users", userData);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "User created successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/ip-pool"] });
      setLocation("/users");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create user",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: CreateUserFormData) => {
    createUserMutation.mutate(data);
  };

  const generateRandomPort = () => {
    const randomPort = 1080 + Math.floor(Math.random() * 10000);
    form.setValue("port", randomPort);
  };

  const generateRandomPassword = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let password = "";
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    form.setValue("password", password);
    form.setValue("confirmPassword", password);
  };

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white shadow-sm border-b border-gray-200">
          <div className="flex items-center justify-between px-6 py-4">
            <div className="flex items-center space-x-4">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setLocation("/users")}
                className="flex items-center"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              <div>
                <h1 className="text-2xl font-semibold text-gray-800">Create SOCKS5 User</h1>
                <p className="text-sm text-gray-600">Add a new user to the proxy server</p>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-2xl mx-auto">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <UserPlus className="h-5 w-5 mr-2" />
                  User Details
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    {/* Basic Information */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="username"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Username</FormLabel>
                            <FormControl>
                              <Input placeholder="Enter username" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email</FormLabel>
                            <FormControl>
                              <Input type="email" placeholder="user@example.com" {...field} value={field.value || ""} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    {/* Password Fields */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="password"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="flex items-center justify-between">
                              Password
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={generateRandomPassword}
                                className="h-auto p-1 text-xs"
                              >
                                Generate
                              </Button>
                            </FormLabel>
                            <FormControl>
                              <Input type="password" placeholder="Enter password" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="confirmPassword"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Confirm Password</FormLabel>
                            <FormControl>
                              <Input type="password" placeholder="Confirm password" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    {/* Network Configuration */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="ipAddress"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>IP Address</FormLabel>
                            <FormControl>
                              <Select 
                                value={field.value} 
                                onValueChange={field.onChange}
                                disabled={ipsLoading}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder={
                                    ipsLoading ? "Loading IPs..." : 
                                    availableIPs.length === 0 ? "No IPs available" :
                                    "Select IP address"
                                  } />
                                </SelectTrigger>
                                <SelectContent>
                                  {availableIPs.map((ip) => (
                                    <SelectItem key={ip.id} value={ip.ipAddress}>
                                      {ip.ipAddress} ({ip.ipType})
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="port"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="flex items-center justify-between">
                              Port
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={generateRandomPort}
                                className="h-auto p-1 text-xs"
                              >
                                Random
                              </Button>
                            </FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                min={1080} 
                                max={65535} 
                                {...field}
                                onChange={e => field.onChange(parseInt(e.target.value))}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    {/* Limits */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="dataLimit"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Data Limit (GB)</FormLabel>
                            <FormControl>
                              <Select 
                                value={(field.value / (1024 * 1024 * 1024)).toString()} 
                                onValueChange={(value) => field.onChange(parseInt(value) * 1024 * 1024 * 1024)}
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="1">1 GB</SelectItem>
                                  <SelectItem value="5">5 GB</SelectItem>
                                  <SelectItem value="10">10 GB</SelectItem>
                                  <SelectItem value="25">25 GB</SelectItem>
                                  <SelectItem value="50">50 GB</SelectItem>
                                  <SelectItem value="100">100 GB</SelectItem>
                                  <SelectItem value="500">500 GB</SelectItem>
                                  <SelectItem value="1000">1 TB</SelectItem>
                                </SelectContent>
                              </Select>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="daysValid"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Valid for (Days)</FormLabel>
                            <FormControl>
                              <Select 
                                value={field.value?.toString()} 
                                onValueChange={(value) => field.onChange(parseInt(value))}
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="7">7 Days</SelectItem>
                                  <SelectItem value="30">30 Days</SelectItem>
                                  <SelectItem value="60">60 Days</SelectItem>
                                  <SelectItem value="90">90 Days</SelectItem>
                                  <SelectItem value="180">6 Months</SelectItem>
                                  <SelectItem value="365">1 Year</SelectItem>
                                </SelectContent>
                              </Select>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    {/* Active Status */}
                    <FormField
                      control={form.control}
                      name="isActive"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base">
                              Active User
                            </FormLabel>
                            <div className="text-sm text-muted-foreground">
                              Enable this user to connect to the proxy server
                            </div>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value || false}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    {/* Submit Button */}
                    <div className="flex justify-end space-x-4">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setLocation("/dashboard")}
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        disabled={createUserMutation.isPending || availableIPs.length === 0}
                      >
                        {createUserMutation.isPending ? "Creating..." : "Create User"}
                      </Button>
                    </div>

                    {availableIPs.length === 0 && !ipsLoading && (
                      <div className="text-sm text-red-600 text-center">
                        No available IP addresses. Please add IPs to the pool first.
                      </div>
                    )}
                  </form>
                </Form>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}