import { Card, CardContent } from "@/components/ui/card";
import { Users, Plug, ArrowUpDown, Server, TrendingUp, TrendingDown, Minus } from "lucide-react";

interface StatsCardsProps {
  stats: {
    totalUsers: number;
    activeConnections: number;
    dataTransferred: string;
    availableIPs: number;
  };
}

export default function StatsCards({ stats }: StatsCardsProps) {
  const cards = [
    {
      title: "Total Users",
      value: stats.totalUsers.toLocaleString(),
      icon: Users,
      change: "+12%",
      changeType: "increase" as const,
      changeText: "from last month",
      bgColor: "bg-blue-50",
      iconColor: "text-primary"
    },
    {
      title: "Active Connections",
      value: stats.activeConnections.toLocaleString(),
      icon: Plug,
      change: "+8%",
      changeType: "increase" as const,
      changeText: "from yesterday",
      bgColor: "bg-green-50",
      iconColor: "text-success"
    },
    {
      title: "Data Transfer (24h)",
      value: stats.dataTransferred,
      icon: ArrowUpDown,
      change: "-3%",
      changeType: "decrease" as const,
      changeText: "from yesterday",
      bgColor: "bg-purple-50",
      iconColor: "text-purple-600"
    },
    {
      title: "Available IPs",
      value: stats.availableIPs.toString(),
      icon: Server,
      change: "0%",
      changeType: "neutral" as const,
      changeText: "No change",
      bgColor: "bg-orange-50",
      iconColor: "text-warning"
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {cards.map((card, index) => (
        <Card key={index} className="bg-white shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">{card.title}</p>
                <p className="text-2xl font-bold text-gray-900">{card.value}</p>
              </div>
              <div className={`p-3 ${card.bgColor} rounded-full`}>
                <card.icon className={`${card.iconColor} w-5 h-5`} />
              </div>
            </div>
            <div className="mt-4 flex items-center">
              {card.changeType === "increase" && (
                <TrendingUp className="text-success w-4 h-4 mr-1" />
              )}
              {card.changeType === "decrease" && (
                <TrendingDown className="text-error w-4 h-4 mr-1" />
              )}
              {card.changeType === "neutral" && (
                <Minus className="text-gray-500 w-4 h-4 mr-1" />
              )}
              <span className={`text-sm ${
                card.changeType === "increase" ? "text-success" :
                card.changeType === "decrease" ? "text-error" : "text-gray-500"
              }`}>
                {card.change} {card.changeText}
              </span>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
