import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface SystemService {
  name: string;
  status: "running" | "warning" | "error";
  statusText: string;
}

export default function SystemStatus() {
  const services: SystemService[] = [
    { name: "SOCKS5 Server", status: "running", statusText: "Running" },
    { name: "Database", status: "running", statusText: "Connected" },
    { name: "Load Balancer", status: "warning", statusText: "High Load" },
    { name: "Auth Service", status: "running", statusText: "Active" },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case "running":
        return "bg-success";
      case "warning":
        return "bg-warning";
      case "error":
        return "bg-error";
      default:
        return "bg-gray-500";
    }
  };

  const getStatusBadge = (status: string, statusText: string) => {
    switch (status) {
      case "running":
        return (
          <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
            {statusText}
          </Badge>
        );
      case "warning":
        return (
          <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">
            {statusText}
          </Badge>
        );
      case "error":
        return (
          <Badge className="bg-red-100 text-red-800 hover:bg-red-100">
            {statusText}
          </Badge>
        );
      default:
        return (
          <Badge variant="secondary">
            {statusText}
          </Badge>
        );
    }
  };

  return (
    <Card className="bg-white shadow">
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-gray-800">
          System Status
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {services.map((service, index) => (
            <div 
              key={index}
              className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
            >
              <div className="flex items-center space-x-3">
                <div className={`w-3 h-3 ${getStatusColor(service.status)} rounded-full`}></div>
                <span className="font-medium text-gray-900">{service.name}</span>
              </div>
              {getStatusBadge(service.status, service.statusText)}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
