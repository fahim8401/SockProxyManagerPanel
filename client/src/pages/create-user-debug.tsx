import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLocation } from "wouter";

interface IpAddress {
  id: string;
  ipAddress: string;
  ipType: string;
  isAvailable: boolean;
}

interface Package {
  id: string;
  name: string;
  description: string;
  dataLimitGB: number;
  timeLimit: number;
  maxConnections: number;
  allowedIPs: string;
  price: number;
  isActive: boolean;
}

export default function CreateUserDebug() {
  const [, setLocation] = useLocation();

  // Fetch available IP addresses
  const { data: availableIPs = [], isLoading: ipsLoading, error: ipsError } = useQuery({
    queryKey: ["/api/ip-pool?available=true"],
    retry: false,
  }) as { data: IpAddress[]; isLoading: boolean; error: any };

  // Fetch available packages
  const { data: packages = [], isLoading: packagesLoading, error: packagesError } = useQuery({
    queryKey: ["/api/packages"],
    retry: false,
  }) as { data: Package[]; isLoading: boolean; error: any };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Create User - Debug Version</h1>
      
      <Card className="mb-4">
        <CardHeader>
          <CardTitle>API Debug Info</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <p><strong>IPs Loading:</strong> {ipsLoading ? "Yes" : "No"}</p>
            <p><strong>Packages Loading:</strong> {packagesLoading ? "Yes" : "No"}</p>
            <p><strong>IPs Error:</strong> {ipsError ? ipsError.message : "None"}</p>
            <p><strong>Packages Error:</strong> {packagesError ? packagesError.message : "None"}</p>
            <p><strong>Available IPs:</strong> {availableIPs?.length || 0}</p>
            <p><strong>Available Packages:</strong> {packages?.length || 0}</p>
          </div>
          
          {packages?.length > 0 && (
            <div className="mt-4">
              <h3 className="font-semibold">Packages:</h3>
              <ul className="list-disc pl-5">
                {packages.map((pkg: Package) => (
                  <li key={pkg.id}>{pkg.name} - {pkg.dataLimitGB}GB, {pkg.timeLimit} days</li>
                ))}
              </ul>
            </div>
          )}
          
          {availableIPs?.length > 0 && (
            <div className="mt-4">
              <h3 className="font-semibold">IPs:</h3>
              <ul className="list-disc pl-5">
                {availableIPs.map((ip: IpAddress) => (
                  <li key={ip.id}>{ip.ipAddress} ({ip.ipType})</li>
                ))}
              </ul>
            </div>
          )}
          
          <Button onClick={() => setLocation("/users")} className="mt-4">
            Back to Users
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}