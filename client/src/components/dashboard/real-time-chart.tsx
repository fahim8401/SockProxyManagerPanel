import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from "recharts";
import { Activity } from "lucide-react";

interface RealtimeChartProps {
  data: Array<{ time: string; connections: number }>;
}

export default function RealtimeChart({ data }: RealtimeChartProps) {
  return (
    <Card className="bg-white shadow">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold text-gray-800">
            Real-time Connections
          </CardTitle>
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-success rounded-full animate-pulse"></div>
            <span className="text-sm text-gray-600">Live</span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <div className="h-64 bg-gray-50 rounded-lg flex items-center justify-center">
            <div className="text-center text-gray-500">
              <Activity className="w-12 h-12 mx-auto mb-2 text-gray-400" />
              <p className="font-medium">Real-time Chart</p>
              <p className="text-sm">Connection data will appear here</p>
            </div>
          </div>
        ) : (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e0e7ff" />
                <XAxis 
                  dataKey="time" 
                  stroke="#6b7280"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis 
                  stroke="#6b7280"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <Line 
                  type="monotone" 
                  dataKey="connections" 
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  dot={{ fill: "hsl(var(--primary))", strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6, stroke: "hsl(var(--primary))", strokeWidth: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
