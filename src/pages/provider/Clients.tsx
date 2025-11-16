import { useState, useMemo, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  MessageSquare,
  Mail,
  Plus,
  MoreHorizontal,
  Upload,
  Download,
  Tag,
  Search,
  Filter,
  X,
  AlertCircle,
  TrendingUp,
} from "lucide-react";
import { useClientsList } from "./hooks/useClientsData";
import ClientDrawer from "@/components/provider/ClientDrawer";
import { AddClientDialog } from "@/components/provider/AddClientDialog";
import { useNavigate } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import { useMobileLayout } from "@/hooks/useMobileLayout";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAdminCheck } from "@/hooks/useAdminCheck";

export default function Clients() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { clients, loading, refetch } = useClientsList();
  const { isMobile } = useMobileLayout();
  const { isAdmin } = useAdminCheck();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedClient, setSelectedClient] = useState<any>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [orgPlan, setOrgPlan] = useState<string>('free');
  const [orgFee, setOrgFee] = useState<number>(0.08);

  // Stats for CRM
  const activeClients = clients.filter(c => c.status === 'active').length;
  const leadClients = clients.filter(c => c.status === 'lead').length;
  const inactiveClients = clients.filter(c => c.status === 'inactive').length;
  
  // Filters
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [planFilter, setPlanFilter] = useState<string>("all");
  const [balanceFilter, setBalanceFilter] = useState<string>("all");

  // Fetch organization plan
  useEffect(() => {
    const fetchOrgPlan = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: org } = await supabase
        .from('organizations')
        .select('plan, transaction_fee_pct')
        .eq('owner_id', user.id)
        .single();

      if (org) {
        setOrgPlan(org.plan || 'free');
        setOrgFee(org.transaction_fee_pct || 0.08);
      }
    };

    fetchOrgPlan();
  }, []);

  const isFreePlan = orgPlan === 'free' && !isAdmin;
  const atClientLimit = isFreePlan && clients.length >= 5;

  const handleAddClient = () => {
    if (atClientLimit) {
      toast({
        title: "Client Limit Reached",
        description: "FREE plan allows up to 5 clients. Upgrade to Growth plan for unlimited clients.",
        variant: "destructive",
      });
      return;
    }
    setShowAddDialog(true);
  };

  // Filtered and searched clients
  const filteredClients = useMemo(() => {
    return clients.filter((client) => {
      // Text search
      const searchLower = searchQuery.toLowerCase();
      const matchesSearch =
        !searchQuery ||
        client.name.toLowerCase().includes(searchLower) ||
        client.email?.toLowerCase().includes(searchLower) ||
        client.phone?.toLowerCase().includes(searchLower) ||
        client.property_address?.toLowerCase().includes(searchLower) ||
        client.property_city?.toLowerCase().includes(searchLower);

      // Status filter
      const matchesStatus =
        statusFilter === "all" || client.status === statusFilter;

      // Plan filter
      const matchesPlan =
        planFilter === "all" ||
        (planFilter === "no-plan" && !client.plan_name) ||
        (planFilter === "has-plan" && client.plan_name);

      // Balance filter
      const matchesBalance =
        balanceFilter === "all" ||
        (balanceFilter === "has-balance" && client.outstanding_balance > 0) ||
        (balanceFilter === "no-balance" && client.outstanding_balance === 0);

      return matchesSearch && matchesStatus && matchesPlan && matchesBalance;
    });
  }, [clients, searchQuery, statusFilter, planFilter, balanceFilter]);

  const hasActiveFilters = statusFilter !== "all" || planFilter !== "all" || balanceFilter !== "all";

  const clearFilters = () => {
    setStatusFilter("all");
    setPlanFilter("all");
    setBalanceFilter("all");
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredClients.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredClients.map((c) => c.id)));
    }
  };

  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const quickMessage = (client: any) => {
    // Navigate to messages with this client
    if (client.homeowner_profile_id) {
      navigate(`/provider/messages?client=${client.id}`);
    }
  };

  const quickEmail = (client: any) => {
    if (client.email) {
      window.location.href = `mailto:${client.email}`;
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto py-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-8 w-32 mb-2" />
            <Skeleton className="h-4 w-64" />
          </div>
          <Skeleton className="h-10 w-32" />
        </div>
        <Card className="p-6">
          <Skeleton className="h-[400px] w-full" />
        </Card>
      </div>
    );
  }

  return (
    <>
      <div className="max-w-[1200px] mx-auto px-4 md:px-6 py-6 space-y-6 overflow-x-hidden">
        {/* FREE Plan Banner */}
        {isFreePlan && (
          <Alert className="border-primary/20 bg-primary/5">
            <AlertCircle className="h-4 w-4 text-primary" />
            <AlertDescription className="flex items-center justify-between gap-4">
              <div>
                <span className="font-semibold">FREE Plan</span> • {clients.length}/5 clients • {(orgFee * 100).toFixed(1)}% transaction fee
                {atClientLimit && " • Client limit reached"}
              </div>
              <Button 
                size="sm" 
                onClick={() => navigate("/provider/settings/billing")}
                className="shrink-0"
              >
                <TrendingUp className="h-4 w-4 mr-2" />
                Upgrade
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Clients</h1>
            <p className="text-muted-foreground">
              Manage your client relationships
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              className="w-full sm:w-auto"
              onClick={() => navigate("/provider/clients/import")}
            >
              <Upload className="h-4 w-4 mr-2" />
              Import CSV
            </Button>
            <Button className="w-full sm:w-auto" onClick={handleAddClient}>
              <Plus className="h-4 w-4 mr-2" />
              Add Client
            </Button>
          </div>
        </div>

        {/* Search and Filters */}
        <Card className="p-4">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search clients by name, email, phone, or address..."
                className="pl-9"
              />
            </div>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-[150px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="lead">Lead</SelectItem>
              </SelectContent>
            </Select>

            <Select value={planFilter} onValueChange={setPlanFilter}>
              <SelectTrigger className="w-full md:w-[150px]">
                <SelectValue placeholder="Plan" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Plans</SelectItem>
                <SelectItem value="has-plan">Has Plan</SelectItem>
                <SelectItem value="no-plan">No Plan</SelectItem>
              </SelectContent>
            </Select>

            <Select value={balanceFilter} onValueChange={setBalanceFilter}>
              <SelectTrigger className="w-full md:w-[150px]">
                <SelectValue placeholder="Balance" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Balances</SelectItem>
                <SelectItem value="has-balance">Has Balance</SelectItem>
                <SelectItem value="no-balance">No Balance</SelectItem>
              </SelectContent>
            </Select>

            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                <X className="h-4 w-4 mr-1" />
                Clear
              </Button>
            )}
          </div>
        </Card>

        {/* Bulk Actions Bar */}
        {selectedIds.size > 0 && (
          <Card className="p-3 bg-secondary/20">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <span className="text-sm font-medium">
                {selectedIds.size} client{selectedIds.size > 1 ? "s" : ""}{" "}
                selected
              </span>
              <div className="flex flex-wrap gap-2 sm:ml-auto">
                <Button variant="outline" size="sm" className="flex-1 sm:flex-initial">
                  <Tag className="h-4 w-4 sm:mr-1" />
                  <span className="hidden sm:inline">Add Tag</span>
                </Button>
                <Button variant="outline" size="sm" className="flex-1 sm:flex-initial">
                  <MessageSquare className="h-4 w-4 sm:mr-1" />
                  <span className="hidden sm:inline">Campaign</span>
                </Button>
                <Button variant="outline" size="sm" className="flex-1 sm:flex-initial">
                  <Download className="h-4 w-4 sm:mr-1" />
                  <span className="hidden sm:inline">Export</span>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedIds(new Set())}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </Card>
        )}

        {/* Results Count */}
        <div className="text-sm text-muted-foreground">
          Showing {filteredClients.length} of {clients.length} clients
        </div>

        {/* Clients Table/Cards */}
        <Card className="overflow-hidden">
          {filteredClients.length === 0 ? (
            <div className="p-12 text-center">
              <h3 className="text-lg font-semibold mb-2">No clients found</h3>
              <p className="text-muted-foreground mb-4">
                {clients.length === 0
                  ? "Get started by adding your first client"
                  : "Try adjusting your search or filters"}
              </p>
              {clients.length === 0 && (
                <div className="flex gap-2 justify-center">
                  <Button onClick={handleAddClient}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Client
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => navigate("/provider/clients/import")}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Import CSV
                  </Button>
                </div>
              )}
            </div>
          ) : isMobile ? (
            // Mobile Card View
            <div className="p-3 space-y-3">
              {filteredClients.map((client) => (
                <Card
                  key={client.id}
                  className="p-4 cursor-pointer hover:bg-muted/30 transition-colors"
                  onClick={() => setSelectedClient(client)}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-base truncate">{client.name}</h3>
                      <p className="text-sm text-muted-foreground truncate">{client.phone}</p>
                    </div>
                    {client.unread_count > 0 && (
                      <Badge variant="secondary">{client.unread_count}</Badge>
                    )}
                  </div>

                  {client.property_address && (
                    <p className="text-sm text-muted-foreground truncate mb-2">
                      {client.property_address}
                    </p>
                  )}

                  <div className="flex items-center justify-between pt-2 border-t">
                    <div className="text-sm">
                      {client.plan_name ? (
                        <Badge>{client.plan_name}</Badge>
                      ) : (
                        <Badge variant="outline">No Plan</Badge>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">${client.lifetime_value.toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground">LTV</p>
                    </div>
                  </div>

                  {client.outstanding_balance > 0 && (
                    <div className="mt-2 pt-2 border-t">
                      <p className="text-sm text-destructive font-medium">
                        Balance Due: ${client.outstanding_balance.toLocaleString()}
                      </p>
                    </div>
                  )}
                </Card>
              ))}
            </div>
          ) : (
            // Desktop Table View
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left w-12">
                      <Checkbox
                        checked={
                          filteredClients.length > 0 &&
                          selectedIds.size === filteredClients.length
                        }
                        onCheckedChange={toggleSelectAll}
                      />
                    </th>
                    <th className="px-4 py-3 text-left font-medium">Client</th>
                    <th className="px-4 py-3 text-left font-medium">Property</th>
                    <th className="px-4 py-3 text-left font-medium">Plan</th>
                    <th className="px-4 py-3 text-left font-medium">LTV</th>
                    <th className="px-4 py-3 text-left font-medium">Balance</th>
                    <th className="px-4 py-3 text-left font-medium">Next Visit</th>
                    <th className="px-4 py-3 text-right font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredClients.map((client) => (
                    <tr
                      key={client.id}
                      className="border-b hover:bg-muted/30 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <Checkbox
                          checked={selectedIds.has(client.id)}
                          onCheckedChange={() => toggleSelect(client.id)}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => setSelectedClient(client)}
                          className="font-medium hover:underline text-left"
                        >
                          {client.name}
                        </button>
                        <div className="text-xs text-muted-foreground">
                          {client.phone}
                        </div>
                        {client.unread_count > 0 && (
                          <Badge variant="secondary" className="mt-1">
                            {client.unread_count} unread
                          </Badge>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {client.property_address ? (
                          <>
                            <div>{client.property_address}</div>
                            <div className="text-xs text-muted-foreground">
                              {client.property_city}, {client.property_state}
                            </div>
                          </>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {client.plan_name ? (
                          <>
                            <div>{client.plan_name}</div>
                            <div className="text-xs text-muted-foreground">
                              ${client.plan_amount}/visit
                            </div>
                          </>
                        ) : (
                          <Badge variant="outline">No Plan</Badge>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        ${client.lifetime_value.toLocaleString()}
                      </td>
                      <td className="px-4 py-3">
                        {client.outstanding_balance > 0 ? (
                          <span className="text-destructive font-medium">
                            ${client.outstanding_balance.toLocaleString()}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {client.next_visit ? (
                          new Date(client.next_visit).toLocaleDateString()
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => quickMessage(client)}
                            disabled={!client.homeowner_profile_id}
                          >
                            <MessageSquare className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => quickEmail(client)}
                            disabled={!client.email}
                          >
                            <Mail className="h-4 w-4" />
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button size="sm" variant="ghost">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => setSelectedClient(client)}
                              >
                                View Details
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => quickMessage(client)}
                              >
                                Send Message
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => quickEmail(client)}
                              >
                                Send Email
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>

      {/* Client Detail Drawer */}
      <Sheet
        open={!!selectedClient}
        onOpenChange={(open) => !open && setSelectedClient(null)}
      >
        <SheetContent side="right" className="w-full sm:max-w-[720px] p-0 overflow-y-auto">
          {selectedClient && (
            <ClientDrawer
              clientId={selectedClient.id}
              onClose={() => setSelectedClient(null)}
              onUpdate={refetch}
            />
          )}
        </SheetContent>
      </Sheet>

      {/* Add Client Dialog */}
      <AddClientDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        onSuccess={() => {
          setShowAddDialog(false);
          refetch();
        }}
      />
    </>
  );
}
