import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Pencil, Trash2, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import EditRecordDialog from "./EditRecordDialog";

const TABLES = [
  "waitlist",
  "profiles",
  "organizations",
  "clients",
  "service_plans",
  "client_subscriptions",
  "homeowner_subscriptions",
  "homes",
  "service_requests",
  "service_visits",
  "team_members",
  "payments",
  "conversations",
  "messages",
];

const DataBrowser = () => {
  const [selectedTable, setSelectedTable] = useState(TABLES[0]);
  const [data, setData] = useState<any[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [editRecord, setEditRecord] = useState<any>(null);
  const [editOpen, setEditOpen] = useState(false);
  const { toast } = useToast();

  const fetchTableData = async () => {
    if (!selectedTable) return;
    
    setLoading(true);
    try {
      const { data: tableData, error } = await supabase
        .from(selectedTable as any)
        .select("*")
        .limit(100);

      if (error) throw error;

      if (tableData && tableData.length > 0) {
        setColumns(Object.keys(tableData[0]));
        setData(tableData);
      } else {
        setColumns([]);
        setData([]);
      }
    } catch (error: any) {
      toast({
        title: "Error fetching data",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTableData();

    // Set up real-time subscription
    const channel = supabase
      .channel(`admin-${selectedTable}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: selectedTable as any,
        },
        () => {
          fetchTableData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedTable]);

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this record?")) return;

    try {
      const { error } = await supabase.from(selectedTable as any).delete().eq("id", id);

      if (error) throw error;

      // Log admin activity
      const { data: { user } } = await supabase.auth.getUser();
      await supabase.from("admin_activity_log").insert({
        admin_user_id: user?.id,
        action: "delete",
        table_name: selectedTable,
        record_id: id,
      });

      toast({
        title: "Record deleted",
        description: "The record has been successfully deleted.",
      });
    } catch (error: any) {
      toast({
        title: "Error deleting record",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const filteredData = data.filter((row) =>
    Object.values(row).some((value) =>
      String(value).toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Data Browser</CardTitle>
          <div className="flex gap-2">
            <Select value={selectedTable} onValueChange={setSelectedTable}>
              <SelectTrigger className="w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TABLES.map((table) => (
                  <SelectItem key={table} value={table}>
                    {table}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={fetchTableData} variant="outline" size="icon">
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <Input
          placeholder="Search..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="mt-4"
        />
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center py-8">Loading...</div>
        ) : filteredData.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">No data found</div>
        ) : (
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  {columns.map((col) => (
                    <TableHead key={col}>{col}</TableHead>
                  ))}
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredData.map((row, idx) => (
                  <TableRow key={idx}>
                    {columns.map((col) => (
                      <TableCell key={col} className="max-w-[200px] truncate">
                        {typeof row[col] === "object"
                          ? JSON.stringify(row[col])
                          : String(row[col] ?? "")}
                      </TableCell>
                    ))}
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => {
                            setEditRecord(row);
                            setEditOpen(true);
                          }}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(row.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
        <div className="mt-4 text-sm text-muted-foreground">
          Showing {filteredData.length} of {data.length} records
        </div>
      </CardContent>
      {editRecord && (
        <EditRecordDialog
          open={editOpen}
          onOpenChange={setEditOpen}
          tableName={selectedTable}
          record={editRecord}
          columns={columns}
          onSuccess={fetchTableData}
        />
      )}
    </Card>
  );
};

export default DataBrowser;
