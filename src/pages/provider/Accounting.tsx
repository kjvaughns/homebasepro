import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { DollarSign, TrendingUp, TrendingDown, Receipt, FileText, Plus } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useMobileLayout } from "@/hooks/useMobileLayout";

interface Transaction {
  id: string;
  type: "income" | "expense";
  category: string;
  amount: number;
  description: string;
  transaction_date: string;
  tax_deductible: boolean;
}

export default function Accounting() {
  const { toast } = useToast();
  const { isMobile } = useMobileLayout();
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const [showAddTransaction, setShowAddTransaction] = useState(false);
  const [newTransaction, setNewTransaction] = useState({
    type: "income" as "income" | "expense",
    category: "",
    amount: "",
    description: "",
    transaction_date: new Date().toISOString().split("T")[0],
    tax_deductible: false,
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;

      const { data: organization } = await supabase
        .from("organizations")
        .select("id")
        .eq("owner_id", user.user.id)
        .single();

      if (!organization) return;
      setOrganizationId(organization.id);

      const { data: transactionsData, error } = await supabase
        .from("accounting_transactions")
        .select("*")
        .eq("organization_id", organization.id)
        .order("transaction_date", { ascending: false });

      if (error) throw error;
      setTransactions((transactionsData as Transaction[]) || []);
    } catch (error) {
      console.error("Error loading data:", error);
      toast({
        title: "Error",
        description: "Failed to load accounting data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddTransaction = async () => {
    if (!organizationId || !newTransaction.category || !newTransaction.amount) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from("accounting_transactions")
        .insert({
          organization_id: organizationId,
          type: newTransaction.type,
          category: newTransaction.category,
          amount: Math.round(parseFloat(newTransaction.amount) * 100),
          description: newTransaction.description,
          transaction_date: newTransaction.transaction_date,
          tax_deductible: newTransaction.tax_deductible,
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Transaction added successfully",
      });

      setShowAddTransaction(false);
      setNewTransaction({
        type: "income",
        category: "",
        amount: "",
        description: "",
        transaction_date: new Date().toISOString().split("T")[0],
        tax_deductible: false,
      });
      loadData();
    } catch (error) {
      console.error("Error adding transaction:", error);
      toast({
        title: "Error",
        description: "Failed to add transaction",
        variant: "destructive",
      });
    }
  };

  const totalIncome = transactions
    .filter((t) => t.type === "income")
    .reduce((sum, t) => sum + t.amount, 0);

  const totalExpenses = transactions
    .filter((t) => t.type === "expense")
    .reduce((sum, t) => sum + t.amount, 0);

  const netProfit = totalIncome - totalExpenses;

  const taxDeductibleExpenses = transactions
    .filter((t) => t.type === "expense" && t.tax_deductible)
    .reduce((sum, t) => sum + t.amount, 0);

  if (loading) {
    return <div className="p-4 sm:p-8">Loading...</div>;
  }

  return (
    <div className="max-w-[1200px] mx-auto px-4 md:px-6 py-4 md:py-8 space-y-4 md:space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold">Accounting</h1>
        <p className="text-sm sm:text-base text-muted-foreground">Track income, expenses, and financial reports</p>
      </div>

      {/* Financial Overview Cards */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Income</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              ${(totalIncome / 100).toFixed(2)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              ${(totalExpenses / 100).toFixed(2)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Net Profit</CardTitle>
            <DollarSign className="h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${netProfit >= 0 ? "text-green-600" : "text-red-600"}`}>
              ${(netProfit / 100).toFixed(2)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tax Deductible</CardTitle>
            <Receipt className="h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${(taxDeductibleExpenses / 100).toFixed(2)}
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="transactions" className="space-y-4">
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="transactions" className="flex-1 sm:flex-initial text-sm">Transactions</TabsTrigger>
          <TabsTrigger value="reports" className="flex-1 sm:flex-initial text-sm">Reports</TabsTrigger>
        </TabsList>

        <TabsContent value="transactions" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <CardTitle>Transactions</CardTitle>
                  <CardDescription>Track all income and expenses</CardDescription>
                </div>
                <Button onClick={() => setShowAddTransaction(!showAddTransaction)} size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Transaction
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {showAddTransaction && (
                <Card className="bg-muted/50">
                  <CardContent className="pt-6 space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-sm">Type</Label>
                        <Select
                          value={newTransaction.type}
                          onValueChange={(value: "income" | "expense") =>
                            setNewTransaction({ ...newTransaction, type: value })
                          }
                        >
                          <SelectTrigger className="text-sm">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="income">Income</SelectItem>
                            <SelectItem value="expense">Expense</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-sm">Category</Label>
                        <Input
                          value={newTransaction.category}
                          onChange={(e) =>
                            setNewTransaction({ ...newTransaction, category: e.target.value })
                          }
                          placeholder="e.g., Service Payment, Equipment"
                          className="text-sm"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label className="text-sm">Amount ($)</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={newTransaction.amount}
                          onChange={(e) =>
                            setNewTransaction({ ...newTransaction, amount: e.target.value })
                          }
                          placeholder="0.00"
                          className="text-sm"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label className="text-sm">Date</Label>
                        <Input
                          type="date"
                          value={newTransaction.transaction_date}
                          onChange={(e) =>
                            setNewTransaction({ ...newTransaction, transaction_date: e.target.value })
                          }
                          className="text-sm"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm">Description</Label>
                      <Input
                        value={newTransaction.description}
                        onChange={(e) =>
                          setNewTransaction({ ...newTransaction, description: e.target.value })
                        }
                        placeholder="Optional notes"
                        className="text-sm"
                      />
                    </div>

                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="tax_deductible"
                        checked={newTransaction.tax_deductible}
                        onChange={(e) =>
                          setNewTransaction({ ...newTransaction, tax_deductible: e.target.checked })
                        }
                        className="rounded"
                      />
                      <Label htmlFor="tax_deductible" className="text-sm">Tax Deductible</Label>
                    </div>

                    <div className="flex gap-2">
                      <Button onClick={handleAddTransaction} size="sm">Save Transaction</Button>
                      <Button variant="outline" onClick={() => setShowAddTransaction(false)} size="sm">
                        Cancel
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {isMobile ? (
                // Mobile Card View
                <div className="space-y-3">
                  {transactions.length === 0 ? (
                    <div className="p-8 text-center text-muted-foreground">
                      No transactions yet
                    </div>
                  ) : (
                    transactions.map((transaction) => (
                      <Card key={transaction.id} className="p-4">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <Badge
                              variant={transaction.type === "income" ? "default" : "secondary"}
                              className="text-xs"
                            >
                              {transaction.type}
                            </Badge>
                            <p className="text-xs text-muted-foreground mt-1">
                              {new Date(transaction.transaction_date).toLocaleDateString()}
                            </p>
                          </div>
                          <p className={`text-lg font-semibold ${
                            transaction.type === "income" ? "text-green-600" : "text-red-600"
                          }`}>
                            {transaction.type === "income" ? "+" : "-"}$
                            {(transaction.amount / 100).toFixed(2)}
                          </p>
                        </div>
                        <p className="text-sm font-medium">{transaction.category}</p>
                        {transaction.description && (
                          <p className="text-sm text-muted-foreground mt-1">{transaction.description}</p>
                        )}
                      </Card>
                    ))
                  )}
                </div>
              ) : (
                // Desktop Table View
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs sm:text-sm">Date</TableHead>
                        <TableHead className="text-xs sm:text-sm">Type</TableHead>
                        <TableHead className="text-xs sm:text-sm">Category</TableHead>
                        <TableHead className="text-xs sm:text-sm">Description</TableHead>
                        <TableHead className="text-right text-xs sm:text-sm">Amount</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {transactions.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center text-muted-foreground">
                            No transactions yet
                          </TableCell>
                        </TableRow>
                      ) : (
                        transactions.map((transaction) => (
                          <TableRow key={transaction.id}>
                            <TableCell className="text-xs sm:text-sm">
                              {new Date(transaction.transaction_date).toLocaleDateString()}
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={transaction.type === "income" ? "default" : "secondary"}
                                className="text-xs"
                              >
                                {transaction.type}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-xs sm:text-sm">{transaction.category}</TableCell>
                            <TableCell className="text-xs sm:text-sm text-muted-foreground">
                              {transaction.description || "—"}
                            </TableCell>
                            <TableCell className={`text-right font-medium text-xs sm:text-sm ${
                              transaction.type === "income" ? "text-green-600" : "text-red-600"
                            }`}>
                              {transaction.type === "income" ? "+" : "-"}$
                              {(transaction.amount / 100).toFixed(2)}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reports" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Profit & Loss Statement
              </CardTitle>
              <CardDescription>Current period financial summary</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="font-medium">Total Revenue</span>
                  <span className="text-green-600 font-bold">
                    ${(totalIncome / 100).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="font-medium">Total Expenses</span>
                  <span className="text-red-600 font-bold">
                    ${(totalExpenses / 100).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between items-center py-3 border-t-2 border-primary/20 mt-2">
                  <span className="text-lg font-bold">Net Profit/Loss</span>
                  <span className={`text-lg font-bold ${netProfit >= 0 ? "text-green-600" : "text-red-600"}`}>
                    ${(netProfit / 100).toFixed(2)}
                  </span>
                </div>
              </div>

              <div className="pt-4 space-y-2">
                <h4 className="font-semibold">Tax Summary</h4>
                <div className="flex justify-between items-center py-2 bg-muted rounded-lg px-4">
                  <span>Total Tax Deductible Expenses</span>
                  <span className="font-bold">${(taxDeductibleExpenses / 100).toFixed(2)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
