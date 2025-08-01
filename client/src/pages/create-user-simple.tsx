import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLocation } from "wouter";

export default function CreateUserSimple() {
  const [, setLocation] = useLocation();

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Create User - Simple Test</h1>
      <Card>
        <CardHeader>
          <CardTitle>Test Page</CardTitle>
        </CardHeader>
        <CardContent>
          <p>This is a test version of the Create User page.</p>
          <Button onClick={() => setLocation("/users")} className="mt-4">
            Back to Users
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}