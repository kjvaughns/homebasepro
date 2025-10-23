import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { RefreshCw, Trash2, Edit, Eye, EyeOff, Search, Filter } from "lucide-react";
import { cn } from "@/lib/utils";
import { TABLE_METADATA, TABLE_CATEGORIES, formatColumnName } from "@/constants/tableMetadata";
import EditRecordDialog from "./EditRecordDialog";
import RecordCard from "./RecordCard";
import RecordDetailDialog from "./RecordDetailDialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useIsMobile } from "@/hooks/use-mobile";

const DataBrowser = () => {
  const [selectedTable, setSelectedTable] = useState<string>("waitlist");
  const [selectedCategory, setSelectedCategory] = useState<string>("All Tables");
  const [data, setData] = useState<any[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [showAllColumns, setShowAllColumns] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editRecord, setEditRecord] = useState<any>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [detailRecord, setDetailRecord] = useState<any>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const { toast } = useToast();
  const isMobile = useIsMobile();

  const availableTables = Object.keys(TABLE_METADATA);
  const filteredTables = selectedCategory === "All Tables"
    ? availableTables
    : availableTables.filter(table => TABLE_METADATA[table].category === selectedCategory);

  useEffect(() => {
    if (selectedTable) {
      fetchTableData();
    }
  }, [selectedTable]);

  const fetchTableData = async () => {
    setLoading(true);
    try {
      const { data: tableData, error } = await supabase
        .from(selectedTable as any)
        .select("*")
        .limit(100);

      if (error) throw error;

      if (tableData && tableData.length > 0) {
        const cols = Object.keys(tableData[0]);
        setColumns(cols);
        setData(tableData);
      } else {
        setColumns([]);
        setData([]);
      }
    } catch (error) {
      console.error("Error fetching table data:", error);
      toast({
        title: "Error",
        description: "Failed to fetch table data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from(selectedTable as any)
        .delete()
        .eq("id", id);

      if (error) throw error;

      // Log the deletion
      await supabase.from("admin_activity_log").insert({
        admin_user_id: (await supabase.auth.getUser()).data.user?.id,
        action: "delete",
        table_name: selectedTable,
        record_id: id,
      });

      toast({
        title: "Success",
        description: "Record deleted successfully",
      });

      fetchTableData();
    } catch (error) {
      console.error("Error deleting record:", error);
      toast({
        title: "Error",
        description: "Failed to delete record",
        variant: "destructive",
      });
    } finally {
      setDeleteId(null);
    }
  };

  const getDisplayColumns = () => {
    if (showAllColumns) return columns;
    const metadata = TABLE_METADATA[selectedTable];
    if (!metadata) return columns;
    return metadata.essentialColumns.filter(col => columns.includes(col));
  };

  const filteredData = data.filter((row) => {
    if (!searchTerm) return true;
    return Object.values(row).some((value) =>
      String(value).toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  const formatValue = (value: any, columnName: string): string => {
    if (value === null || value === undefined) return "-";
    if (typeof value === "boolean") return value ? "Yes" : "No";
    if (Array.isArray(value)) return value.join(", ");
    if (typeof value === "object") return JSON.stringify(value);
    if (columnName.includes("_at") || columnName.includes("date")) {
      try {
        return new Date(value).toLocaleDateString();
      } catch {
        return String(value);
      }
    }
    if (columnName.includes("amount") || columnName.includes("price") || columnName.includes("fee")) {
      const num = Number(value);
      if (!isNaN(num)) return `$${(num / 100).toFixed(2)}`;
    }
    return String(value).substring(0, 100);
  };

  const getStatusBadge = (status: string) => {
    const statusColors: Record<string, string> = {
      active: "bg-green-500/10 text-green-500",
      pending: "bg-yellow-500/10 text-yellow-500",
      completed: "bg-blue-500/10 text-blue-500",
      canceled: "bg-red-500/10 text-red-500",
      paused: "bg-gray-500/10 text-gray-500",
    };
    return (
      <Badge className={cn("capitalize", statusColors[status] || "")}>
        {status}
      </Badge>
    );
  };

  const metadata = TABLE_METADATA[selectedTable];
  const displayColumns = getDisplayColumns();

  return (
    <>
      <Card className="max-w-full overflow-hidden">
        <CardHeader className="space-y-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="space-y-2">
              <CardTitle className="text-2xl">
                {metadata?.displayName || selectedTable}
              </CardTitle>
              {metadata && (
                <CardDescription className="text-sm">
                  {metadata.description}
                </CardDescription>
              )}
            </div>
            <div className="flex gap-2">
              <Button
                onClick={fetchTableData}
                variant="outline"
                size="sm"
                disabled={loading}
              >
                <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
              </Button>
              <Button
                onClick={() => setShowAllColumns(!showAllColumns)}
                variant="outline"
                size="sm"
              >
                {showAllColumns ? (
                  <>
                    <EyeOff className="h-4 w-4 mr-2" />
                    <span className="hidden sm:inline">Hide</span>
                  </>
                ) : (
                  <>
                    <Eye className="h-4 w-4 mr-2" />
                    <span className="hidden sm:inline">All</span>
                  </>
                )}
              </Button>
            </div>
          </div>

          <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <Filter className="h-4 w-4" />
                Category
              </label>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TABLE_CATEGORIES.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Table</label>
              <Select value={selectedTable} onValueChange={setSelectedTable}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {filteredTables.map((table) => (
                    <SelectItem key={table} value={table}>
                      {TABLE_METADATA[table]?.displayName || table}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <Search className="h-4 w-4" />
                Search
              </label>
              <Input
                placeholder="Search records..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : filteredData.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p className="text-lg font-medium">No data found</p>
              <p className="text-sm mt-1">Try adjusting your search or select a different table</p>
            </div>
          ) : isMobile ? (
            // Mobile Card View
            <div className="space-y-3">
              {filteredData.map((row) => (
                <RecordCard
                  key={row.id}
                  record={row}
                  essentialColumns={displayColumns}
                  onClick={() => {
                    setDetailRecord(row);
                    setDetailOpen(true);
                  }}
                />
              ))}
            </div>
          ) : (
            // Desktop Table View
            <div className="rounded-md border">
              <ScrollArea className="w-full">
                <div className="min-w-full overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {displayColumns.map((column) => (
                          <TableHead key={column} className="whitespace-nowrap">
                            {formatColumnName(column)}
                          </TableHead>
                        ))}
                        <TableHead className="text-right sticky right-0 bg-background">
                          Actions
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredData.map((row, idx) => (
                        <TableRow key={row.id || idx}>
                          {displayColumns.map((column) => (
                            <TableCell key={column} className="max-w-xs truncate">
                              {column === "status"
                                ? getStatusBadge(row[column])
                                : formatValue(row[column], column)}
                            </TableCell>
                          ))}
                           <TableCell className="text-right sticky right-0 bg-background">
                             <div className="flex justify-end gap-3">
                               <Button
                                 variant="outline"
                                 size="sm"
                                 onClick={() => {
                                   setEditRecord(row);
                                   setEditOpen(true);
                                 }}
                               >
                                 <Edit className="h-4 w-4" />
                               </Button>
                               <Button
                                 variant="destructive"
                                 size="sm"
                                 onClick={() => setDeleteId(row.id)}
                                 className="ml-2"
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
              </ScrollArea>
            </div>
          )}

          {filteredData.length > 0 && (
            <div className="mt-4 text-sm text-muted-foreground">
              Showing {filteredData.length} of {data.length} records
              {data.length >= 100 && " (limited to first 100)"}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this record. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && handleDelete(deleteId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit Dialog */}
      {editRecord && (
        <EditRecordDialog
          open={editOpen}
          onOpenChange={setEditOpen}
          record={editRecord}
          tableName={selectedTable}
          columns={columns}
          onSuccess={() => {
            fetchTableData();
            setEditOpen(false);
            setEditRecord(null);
          }}
        />
      )}

      {/* Mobile Detail Dialog */}
      {detailRecord && (
        <RecordDetailDialog
          open={detailOpen}
          onOpenChange={setDetailOpen}
          record={detailRecord}
          tableName={selectedTable}
          columns={columns}
          onSuccess={() => {
            fetchTableData();
            setDetailOpen(false);
            setDetailRecord(null);
          }}
          onDelete={fetchTableData}
        />
      )}
    </>
  );
};

export default DataBrowser;
