import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { Loader2 } from "lucide-react";

interface UserDetailDrawerProps {
  userId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const UserDetailDrawer = ({ userId, open, onOpenChange }: UserDetailDrawerProps) => {
  const [user, setUser] = useState<any>(null);
  const [bookings, setBookings] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [roles, setRoles] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && userId) {
      fetchUserDetails();
    }
  }, [open, userId]);

  const fetchUserDetails = async () => {
    if (!userId) return;
    
    setLoading(true);
    try {
      // Fetch profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .single();
      setUser(profile);

      // Fetch roles
      const { data: rolesData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId);
      setRoles(rolesData?.map(r => r.role) || []);

      // Fetch activity based on user type
      if (profile?.user_type === 'homeowner') {
        const bookingsQuery = await (supabase as any)
          .from('bookings')
          .select('*')
          .eq('homeowner_profile_id', profile.id)
          .order('created_at', { ascending: false })
          .limit(10);
        setBookings(bookingsQuery.data || []);

        const paymentsQuery = await (supabase as any)
          .from('payments')
          .select('*')
          .eq('homeowner_profile_id', profile.id)
          .order('payment_date', { ascending: false })
          .limit(10);
        setPayments(paymentsQuery.data || []);
      }

      // Fetch conversations with explicit typing
      const convosQuery = await (supabase as any)
        .from('conversations')
        .select('id, created_at')
        .limit(5);
      
      setMessages(convosQuery.data || []);
    } catch (error) {
      console.error('Error fetching user details:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{user?.full_name || 'User Details'}</SheetTitle>
          <SheetDescription>
            {user?.email} • {user?.user_type}
          </SheetDescription>
        </SheetHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-6 mt-6">
            {/* Profile Info */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Profile Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Phone:</span>
                  <span>{user?.phone || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Joined:</span>
                  <span>{user?.created_at ? format(new Date(user.created_at), 'MMM d, yyyy') : 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Roles:</span>
                  <div className="flex gap-1">
                    {roles.length > 0 ? (
                      roles.map(role => (
                        <Badge key={role} variant="outline">{role}</Badge>
                      ))
                    ) : (
                      <span className="text-muted-foreground text-xs">No roles</span>
                    )}
                  </div>
                </div>
                {user?.referral_source && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Referral Source:</span>
                    <span>{user.referral_source}</span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Activity Tabs */}
            <Tabs defaultValue="bookings">
              <TabsList className="w-full">
                <TabsTrigger value="bookings" className="flex-1">
                  Bookings ({bookings.length})
                </TabsTrigger>
                <TabsTrigger value="payments" className="flex-1">
                  Payments ({payments.length})
                </TabsTrigger>
                <TabsTrigger value="messages" className="flex-1">
                  Messages ({messages.length})
                </TabsTrigger>
              </TabsList>
              <TabsContent value="bookings" className="space-y-2 mt-4">
                {bookings.length > 0 ? (
                  bookings.map(b => (
                    <Card key={b.id}>
                      <CardContent className="pt-4">
                        <p className="font-medium">{b.service_name || 'Service'}</p>
                        <p className="text-xs text-muted-foreground">
                          {b.date_time_start && format(new Date(b.date_time_start), 'MMM d, yyyy')} • {b.status}
                        </p>
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-8">No bookings yet</p>
                )}
              </TabsContent>
              <TabsContent value="payments" className="space-y-2 mt-4">
                {payments.length > 0 ? (
                  payments.map(p => (
                    <Card key={p.id}>
                      <CardContent className="pt-4">
                        <div className="flex justify-between">
                          <span className="font-medium">${((p.amount || 0) / 100).toFixed(2)}</span>
                          <Badge variant={p.status === 'succeeded' ? 'default' : 'secondary'}>
                            {p.status}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {p.payment_date && format(new Date(p.payment_date), 'MMM d, yyyy')}
                        </p>
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-8">No payments yet</p>
                )}
              </TabsContent>
              <TabsContent value="messages" className="space-y-2 mt-4">
                {messages.length > 0 ? (
                  messages.map(m => (
                    <Card key={m.id}>
                      <CardContent className="pt-4">
                        <p className="text-xs text-muted-foreground">
                          Conversation started {format(new Date(m.created_at), 'MMM d, yyyy')}
                        </p>
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-8">No messages yet</p>
                )}
              </TabsContent>
            </Tabs>

            {/* Admin Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Admin Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button variant="outline" size="sm" className="w-full">
                  View Full Activity Log
                </Button>
              </CardContent>
            </Card>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
};
