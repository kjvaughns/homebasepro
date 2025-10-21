import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProviderVerificationCard } from "@/components/admin/ProviderVerificationCard";
import { Search, Building2 } from "lucide-react";

const UserManagement = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [providers, setProviders] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [providerSearchTerm, setProviderSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    const { data: usersData } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);

    const { data: providersData } = await supabase
      .from("organizations")
      .select("*")
      .order("created_at", { ascending: false });

    if (usersData) setUsers(usersData);
    if (providersData) setProviders(providersData);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  // BUG-008 FIX: Include email in user search filter
  const filteredUsers = users.filter((user) =>
    user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.phone?.includes(searchTerm) ||
    user.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredProviders = providers.filter((provider) =>
    provider.name?.toLowerCase().includes(providerSearchTerm.toLowerCase()) ||
    provider.phone?.includes(providerSearchTerm)
  );

  const pendingProviders = filteredProviders.filter(p => p.verification_status === "pending" || !p.verification_status);
  const verifiedProviders = filteredProviders.filter(p => p.verification_status === "verified");
  const rejectedProviders = filteredProviders.filter(p => p.verification_status === "rejected");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">User Management</h1>
        <p className="text-muted-foreground">Manage all platform users and provider verifications</p>
      </div>

      <Tabs defaultValue="users" className="space-y-6">
        <TabsList>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="providers">
            <Building2 className="h-4 w-4 mr-2" />
            Providers {pendingProviders.length > 0 && (
              <Badge variant="destructive" className="ml-2">{pendingProviders.length}</Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="users">
          <Card>
            <CardHeader>
              <CardTitle>All Users</CardTitle>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, email, or phone..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8">Loading...</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Joined</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium">{user.full_name}</TableCell>
                        <TableCell>
                          <Badge variant={user.user_type === "homeowner" ? "default" : "secondary"}>
                            {user.user_type}
                          </Badge>
                        </TableCell>
                        <TableCell>{user.phone || "—"}</TableCell>
                        <TableCell>{new Date(user.created_at).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm">View</Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
              <div className="mt-4 text-sm text-muted-foreground">
                Showing {filteredUsers.length} of {users.length} users
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="providers" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Provider Verifications</CardTitle>
                <div className="relative w-64">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search providers..."
                    value={providerSearchTerm}
                    onChange={(e) => setProviderSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
            </CardHeader>
          </Card>

          {loading ? (
            <div className="text-center py-8">Loading...</div>
          ) : (
            <>
              {pendingProviders.length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Pending Verification ({pendingProviders.length})</h3>
                  <div className="grid gap-4">
                    {pendingProviders.map((provider) => (
                      <ProviderVerificationCard
                        key={provider.id}
                        provider={provider}
                        onUpdate={fetchData}
                      />
                    ))}
                  </div>
                </div>
              )}

              {verifiedProviders.length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Verified Providers ({verifiedProviders.length})</h3>
                  <div className="grid gap-4">
                    {verifiedProviders.map((provider) => (
                      <ProviderVerificationCard
                        key={provider.id}
                        provider={provider}
                        onUpdate={fetchData}
                      />
                    ))}
                  </div>
                </div>
              )}

              {rejectedProviders.length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Rejected Providers ({rejectedProviders.length})</h3>
                  <div className="grid gap-4">
                    {rejectedProviders.map((provider) => (
                      <ProviderVerificationCard
                        key={provider.id}
                        provider={provider}
                        onUpdate={fetchData}
                      />
                    ))}
                  </div>
                </div>
              )}

              {filteredProviders.length === 0 && (
                <Card>
                  <CardContent className="text-center py-8">
                    <p className="text-muted-foreground">No providers found</p>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default UserManagement;
