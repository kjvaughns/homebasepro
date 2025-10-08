import DataBrowser from "@/components/admin/DataBrowser";

const DataManagement = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Data Management</h1>
        <p className="text-muted-foreground">
          Browse, search, and manage all database tables in real-time
        </p>
      </div>
      <DataBrowser />
    </div>
  );
};

export default DataManagement;
