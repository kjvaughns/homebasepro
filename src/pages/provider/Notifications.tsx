import { useState } from "react";
import { useNotifications } from "@/hooks/useNotifications";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatDistanceToNow } from "date-fns";
import { useNavigate } from "react-router-dom";
import { Bell, CheckCheck, Trash2 } from "lucide-react";

export default function Notifications() {
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const [filter, setFilter] = useState<string>("all");
  const navigate = useNavigate();

  const filteredNotifications = notifications.filter(n => {
    if (filter === "all") return true;
    if (filter === "unread") return !n.read_at;
    return n.type === filter;
  });

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'payment': return '💰';
      case 'subscription': return '📅';
      case 'message': return '💬';
      case 'booking': return '📋';
      case 'announcement': return '📢';
      default: return '🔔';
    }
  };

  const handleNotificationClick = (notification: any) => {
    if (!notification.read_at) {
      markAsRead(notification.id);
    }
    if (notification.action_url) {
      navigate(notification.action_url);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Notifications</h1>
          <p className="text-muted-foreground">
            {unreadCount > 0 ? `${unreadCount} unread notification${unreadCount > 1 ? 's' : ''}` : 'All caught up!'}
          </p>
        </div>
        {unreadCount > 0 && (
          <Button onClick={markAllAsRead} variant="outline">
            <CheckCheck className="mr-2 h-4 w-4" />
            Mark all as read
          </Button>
        )}
      </div>

      <Tabs value={filter} onValueChange={setFilter}>
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="unread">
            Unread
            {unreadCount > 0 && (
              <Badge variant="secondary" className="ml-2">
                {unreadCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="payment">Payments</TabsTrigger>
          <TabsTrigger value="booking">Bookings</TabsTrigger>
          <TabsTrigger value="message">Messages</TabsTrigger>
          <TabsTrigger value="announcement">Announcements</TabsTrigger>
        </TabsList>

        <TabsContent value={filter} className="space-y-4">
          {filteredNotifications.length === 0 ? (
            <Card className="p-12">
              <div className="text-center">
                <Bell className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No notifications</h3>
                <p className="text-muted-foreground">
                  {filter === "unread" 
                    ? "You're all caught up!"
                    : `No ${filter === "all" ? "" : filter} notifications yet`}
                </p>
              </div>
            </Card>
          ) : (
            filteredNotifications.map((notification) => (
              <Card
                key={notification.id}
                className={`p-4 cursor-pointer hover:shadow-md transition-shadow ${
                  !notification.read_at ? 'border-l-4 border-l-primary' : ''
                }`}
                onClick={() => handleNotificationClick(notification)}
              >
                <div className="flex items-start gap-4">
                  <div className="text-2xl flex-shrink-0">
                    {getNotificationIcon(notification.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold">{notification.title}</h3>
                      {!notification.read_at && (
                        <Badge variant="default" className="text-xs">New</Badge>
                      )}
                      <Badge variant="outline" className="text-xs capitalize">
                        {notification.type}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">
                      {notification.body}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(notification.created_at), {
                        addSuffix: true,
                      })}
                    </p>
                  </div>
                  {!notification.read_at && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        markAsRead(notification.id);
                      }}
                    >
                      <CheckCheck className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
