import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Plus, MoreHorizontal, Edit, Eye, Trash2, User } from "lucide-react";
import { User as UserType } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import UserDetailsModal from "./user-details-modal";

interface UserTableProps {
  users: UserType[];
  onCreateUser: () => void;
  onRefresh: () => void;
}

export default function UserTable({ users, onCreateUser, onRefresh }: UserTableProps) {
  const { toast } = useToast();
  const [selectedUser, setSelectedUser] = useState<UserType | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);

  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      return apiRequest("DELETE", `/api/users/${userId}`);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "User deleted successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      onRefresh();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete user",
        variant: "destructive",
      });
    },
  });

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const getUsagePercentage = (used: number, limit: number): number => {
    return limit > 0 ? Math.min((used / limit) * 100, 100) : 0;
  };

  const getUserStatus = (user: UserType): { label: string; variant: "default" | "secondary" | "destructive" | "outline" } => {
    if (!user.isActive) return { label: "Inactive", variant: "secondary" };
    if (new Date() > new Date(user.expiresAt)) return { label: "Expired", variant: "destructive" };
    return { label: "Active", variant: "default" };
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <>
    <Card className="bg-white shadow">
      <CardHeader className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-800">Recent Users</h3>
          <Button onClick={onCreateUser} className="bg-primary hover:bg-blue-600">
            <Plus className="mr-2 w-4 h-4" />
            Add User
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50">
                <TableHead className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User
                </TableHead>
                <TableHead className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                  IP Address
                </TableHead>
                <TableHead className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Port
                </TableHead>
                <TableHead className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Data Usage
                </TableHead>
                <TableHead className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Expires
                </TableHead>
                <TableHead className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </TableHead>
                <TableHead className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                    No users found. Create your first user to get started.
                  </TableCell>
                </TableRow>
              ) : (
                users.map((user) => {
                  const status = getUserStatus(user);
                  const usagePercentage = getUsagePercentage(user.dataUsed || 0, user.dataLimit);
                  
                  return (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div className="flex items-center">
                          <div className="relative w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                            <User className="w-4 h-4 text-gray-600" />
                            {user.isOnline && (
                              <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 border-2 border-white rounded-full animate-pulse"></div>
                            )}
                          </div>
                          <div className="ml-3">
                            <div className="flex items-center space-x-2">
                              <span className="text-sm font-medium text-gray-900">{user.username}</span>
                              {user.isOnline && (
                                <span className="text-xs text-green-600 font-medium bg-green-50 px-2 py-1 rounded-full">
                                  Online
                                </span>
                              )}
                            </div>
                            {user.email && (
                              <div className="text-sm text-gray-500">{user.email}</div>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm text-gray-900">{user.ipAddress}</div>
                        <div className="text-sm text-gray-500">
                          {user.ipAddress.includes(':') ? 'IPv6' : 'IPv4'}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-gray-900">
                        {user.port}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm text-gray-900">
                          {formatBytes(user.dataUsed || 0)}
                        </div>
                        <div className="text-sm text-gray-500">
                          of {formatBytes(user.dataLimit)}
                        </div>
                        <div className="mt-1 w-full">
                          <Progress 
                            value={usagePercentage} 
                            className="h-2"
                          />
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-gray-900">
                        {formatDate(user.expiresAt.toString())}
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={status.variant}
                          className={
                            status.variant === "default" ? "bg-green-100 text-green-800 hover:bg-green-100" :
                            status.variant === "destructive" ? "bg-red-100 text-red-800 hover:bg-red-100" :
                            "bg-gray-100 text-gray-800 hover:bg-gray-100"
                          }
                        >
                          {status.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem>
                              <Edit className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => {
                                setSelectedUser(user);
                                setIsDetailsModalOpen(true);
                              }}
                            >
                              <Eye className="mr-2 h-4 w-4" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-red-600"
                              onClick={() => deleteUserMutation.mutate(user.id)}
                              disabled={deleteUserMutation.isPending}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
        
        {users.length > 0 && (
          <div className="px-6 py-4 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-700">
                Showing <span className="font-medium">1</span> to{" "}
                <span className="font-medium">{Math.min(users.length, 10)}</span> of{" "}
                <span className="font-medium">{users.length}</span> results
              </p>
              {/* Pagination could be added here */}
            </div>
          </div>
        )}
      </CardContent>
    </Card>

    <UserDetailsModal 
      user={selectedUser}
      open={isDetailsModalOpen}
      onOpenChange={setIsDetailsModalOpen}
    />
  </>
  );
}
