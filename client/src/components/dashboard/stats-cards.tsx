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
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8">
      {cards.map((card, index) => (
        <Card 
          key={index} 
          className={`bg-white shadow card-hover animate-fadeInUp delay-${(index + 1) * 100} cursor-pointer`}
        >
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm font-medium text-gray-600 transition-colors group-hover:text-gray-800 truncate">{card.title}</p>
                <p className="text-lg sm:text-2xl font-bold text-gray-900 transition-all">{card.value}</p>
              </div>
              <div className={`p-2 sm:p-3 ${card.bgColor} rounded-full transition-transform group-hover:scale-110 shrink-0`}>
                <card.icon className={`${card.iconColor} w-4 h-4 sm:w-5 sm:h-5 transition-colors`} />
              </div>
            </div>
            <div className="mt-3 sm:mt-4 flex items-center">
              {card.changeType === "increase" && (
                <TrendingUp className="text-success w-3 h-3 sm:w-4 sm:h-4 mr-1" />
              )}
              {card.changeType === "decrease" && (
                <TrendingDown className="text-error w-3 h-3 sm:w-4 sm:h-4 mr-1" />
              )}
              {card.changeType === "neutral" && (
                <Minus className="text-gray-500 w-3 h-3 sm:w-4 sm:h-4 mr-1" />
              )}
              <span className={`text-xs sm:text-sm ${
                card.changeType === "increase" ? "text-success" :
                card.changeType === "decrease" ? "text-error" : "text-gray-500"
              }`}>
                {card.change} <span className="hidden sm:inline">{card.changeText}</span>
              </span>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
