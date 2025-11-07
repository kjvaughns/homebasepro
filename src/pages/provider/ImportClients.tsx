import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Papa from "papaparse";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Upload, Download, CheckCircle2, AlertCircle } from "lucide-react";
import CSVFieldMapper from "@/components/provider/CSVFieldMapper";
import CSVPreview from "@/components/provider/CSVPreview";
import { ContactImporter } from "@/components/native/ContactImporter";

interface CSVRow {
  [key: string]: string;
}

interface FieldMapping {
  [csvColumn: string]: string; // Maps CSV column to client field or 'skip'
}

interface ImportResult {
  created: number;
  updated: number;
  skipped: number;
  errors: Array<{ row: number; reason: string; data: any }>;
}

const ImportClients = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvData, setCsvData] = useState<CSVRow[]>([]);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [fieldMapping, setFieldMapping] = useState<FieldMapping>({});
  const [duplicateHandling, setDuplicateHandling] = useState<"skip" | "update" | "create">("skip");
  const [defaultStatus, setDefaultStatus] = useState("active");
  const [importTag, setImportTag] = useState("");
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith(".csv")) {
      toast({
        title: "Invalid file",
        description: "Please upload a CSV file",
        variant: "destructive",
      });
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Maximum file size is 10MB",
        variant: "destructive",
      });
      return;
    }

    setCsvFile(file);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        if (results.data.length === 0) {
          toast({
            title: "Empty file",
            description: "The CSV file contains no data rows",
            variant: "destructive",
          });
          return;
        }

        setCsvData(results.data as CSVRow[]);
        setCsvHeaders(results.meta.fields || []);
        
        // Auto-detect field mappings
        const autoMapping: FieldMapping = {};
        results.meta.fields?.forEach((header) => {
          const lower = header.toLowerCase();
          if (lower.includes("name") || lower === "full name") autoMapping[header] = "name";
          else if (lower.includes("email")) autoMapping[header] = "email";
          else if (lower.includes("phone") || lower.includes("mobile")) autoMapping[header] = "phone";
          else if (lower.includes("address") && !lower.includes("email")) autoMapping[header] = "address";
          else if (lower.includes("city")) autoMapping[header] = "city";
          else if (lower.includes("state")) autoMapping[header] = "state";
          else if (lower.includes("zip")) autoMapping[header] = "zip";
          else if (lower.includes("status")) autoMapping[header] = "status";
          else if (lower.includes("note")) autoMapping[header] = "notes";
          else if (lower.includes("tag")) autoMapping[header] = "tags";
          else autoMapping[header] = "skip";
        });
        setFieldMapping(autoMapping);

        toast({
          title: "File uploaded",
          description: `${results.data.length} rows detected`,
        });
      },
      error: (error) => {
        toast({
          title: "Parse error",
          description: error.message,
          variant: "destructive",
        });
      },
    });
  };

  const getMappingStats = () => {
    const withEmail = csvData.filter((row) => {
      const emailCol = Object.keys(fieldMapping).find((k) => fieldMapping[k] === "email");
      return emailCol && row[emailCol];
    }).length;
    const withPhone = csvData.filter((row) => {
      const phoneCol = Object.keys(fieldMapping).find((k) => fieldMapping[k] === "phone");
      return phoneCol && row[phoneCol];
    }).length;
    return { total: csvData.length, withEmail, withPhone };
  };

  const handleImport = async (dryRun = false) => {
    setIsImporting(true);
    setImportProgress(0);

    try {
      // Get current user's organization
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (!profile) throw new Error("Profile not found");

      const { data: org } = await supabase
        .from("organizations")
        .select("id")
        .eq("owner_id", user.id)
        .single();

      if (!org) throw new Error("Organization not found");

      // Transform CSV data to mapped format
      const mappedData = csvData.map((row) => {
        const mapped: any = {};
        Object.keys(fieldMapping).forEach((csvCol) => {
          const field = fieldMapping[csvCol];
          if (field !== "skip" && row[csvCol]) {
            mapped[field] = row[csvCol];
          }
        });
        return mapped;
      });

      // Call edge function
      const { data, error } = await supabase.functions.invoke("import-clients", {
        body: {
          clients: mappedData,
          organizationId: org.id,
          duplicateHandling,
          defaultStatus,
          importTag: importTag || null,
          dryRun,
        },
      });

      if (error) throw error;

      setImportResult(data);
      setImportProgress(100);

      if (!dryRun) {
        toast({
          title: "Import complete",
          description: `${data.created} created, ${data.updated} updated, ${data.skipped} skipped`,
        });
        setStep(4);
      } else {
        toast({
          title: "Dry run complete",
          description: `Would create ${data.created}, update ${data.updated}, skip ${data.skipped}`,
        });
      }
    } catch (error: any) {
      toast({
        title: "Import failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsImporting(false);
    }
  };

  const downloadErrorLog = () => {
    if (!importResult?.errors.length) return;

    const errorCsv = Papa.unparse(
      importResult.errors.map((e) => ({
        row: e.row,
        reason: e.reason,
        ...e.data,
      }))
    );

    const blob = new Blob([errorCsv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `import-errors-${new Date().toISOString()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="container mx-auto py-8 px-4 max-w-5xl">
      <Button
        variant="ghost"
        onClick={() => navigate("/provider/clients")}
        className="mb-6"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Clients
      </Button>

      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Import Clients</h1>
          <p className="text-muted-foreground">Upload a CSV file or import from device contacts</p>
        </div>
        <ContactImporter
          onContactsSelected={(contacts) => {
            console.log('Imported contacts:', contacts);
            toast({
              title: "Contacts Imported",
              description: `${contacts.length} contacts ready to import`,
            });
          }}
        />
      </div>

      {/* Step Indicator */}
      <div className="flex items-center justify-between mb-8">
        {[1, 2, 3].map((s) => (
          <div key={s} className="flex items-center flex-1">
            <div
              className={`flex items-center justify-center w-10 h-10 rounded-full ${
                step >= s ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
              }`}
            >
              {s}
            </div>
            <div className="ml-3 text-sm font-medium">
              {s === 1 && "Upload CSV"}
              {s === 2 && "Map Fields"}
              {s === 3 && "Import"}
            </div>
            {s < 3 && <div className="flex-1 h-0.5 bg-muted mx-4" />}
          </div>
        ))}
      </div>

      {/* Step 1: Upload */}
      {step === 1 && (
        <Card className="p-6">
          <div className="space-y-6">
            <div>
              <Label htmlFor="csv-upload">Upload CSV File</Label>
              <div className="mt-2 flex items-center gap-4">
                <Input
                  id="csv-upload"
                  type="file"
                  accept=".csv"
                  onChange={handleFileUpload}
                  className="max-w-md"
                />
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                Maximum file size: 10MB. Must be a CSV file.
              </p>
            </div>

            {csvData.length > 0 && (
              <>
                <div>
                  <h3 className="text-lg font-semibold mb-2">Preview (First 20 rows)</h3>
                  <CSVPreview data={csvData.slice(0, 20)} headers={csvHeaders} />
                </div>

                <div className="flex justify-end">
                  <Button onClick={() => setStep(2)}>
                    Next: Map Fields
                  </Button>
                </div>
              </>
            )}
          </div>
        </Card>
      )}

      {/* Step 2: Map Fields */}
      {step === 2 && (
        <Card className="p-6">
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-4">Map CSV Columns to Client Fields</h3>
              <CSVFieldMapper
                headers={csvHeaders}
                mapping={fieldMapping}
                onMappingChange={setFieldMapping}
              />
            </div>

            <div className="bg-muted p-4 rounded-lg">
              <h4 className="font-medium mb-2">Mapping Summary</h4>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Total Rows:</span>{" "}
                  <span className="font-medium">{getMappingStats().total}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">With Email:</span>{" "}
                  <span className="font-medium">{getMappingStats().withEmail}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">With Phone:</span>{" "}
                  <span className="font-medium">{getMappingStats().withPhone}</span>
                </div>
              </div>
            </div>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(1)}>
                Back
              </Button>
              <Button onClick={() => setStep(3)}>
                Next: Import Settings
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Step 3: Import Settings */}
      {step === 3 && (
        <Card className="p-6">
          <div className="space-y-6">
            <div>
              <Label className="text-base font-semibold">Duplicate Handling</Label>
              <RadioGroup value={duplicateHandling} onValueChange={(v: any) => setDuplicateHandling(v)} className="mt-3">
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="skip" id="skip" />
                  <Label htmlFor="skip" className="font-normal">
                    Skip duplicates (match on email or phone)
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="update" id="update" />
                  <Label htmlFor="update" className="font-normal">
                    Update existing clients with CSV data
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="create" id="create" />
                  <Label htmlFor="create" className="font-normal">
                    Create all (no de-duplication)
                  </Label>
                </div>
              </RadioGroup>
            </div>

            <div>
              <Label htmlFor="default-status">Default Status for New Clients</Label>
              <Select value={defaultStatus} onValueChange={setDefaultStatus}>
                <SelectTrigger id="default-status" className="max-w-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="lead">Lead</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="import-tag">Tag for Imported Clients (Optional)</Label>
              <Input
                id="import-tag"
                value={importTag}
                onChange={(e) => setImportTag(e.target.value)}
                placeholder="e.g., Import Oct 2025"
                className="max-w-md"
              />
              <p className="text-sm text-muted-foreground mt-1">
                Add a tag to all imported clients for easy filtering
              </p>
            </div>

            {isImporting && (
              <div>
                <Label>Import Progress</Label>
                <Progress value={importProgress} className="mt-2" />
                <p className="text-sm text-muted-foreground mt-1">
                  Importing... {importProgress}%
                </p>
              </div>
            )}

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(2)} disabled={isImporting}>
                Back
              </Button>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => handleImport(true)}
                  disabled={isImporting}
                >
                  Dry Run
                </Button>
                <Button onClick={() => handleImport(false)} disabled={isImporting}>
                  {isImporting ? "Importing..." : "Import Clients"}
                </Button>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Step 4: Results */}
      {step === 4 && importResult && (
        <Card className="p-6">
          <div className="space-y-6">
            <div className="text-center">
              <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto mb-4" />
              <h3 className="text-2xl font-bold mb-2">Import Complete!</h3>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <Card className="p-4 text-center">
                <div className="text-3xl font-bold text-green-600">{importResult.created}</div>
                <div className="text-sm text-muted-foreground">Created</div>
              </Card>
              <Card className="p-4 text-center">
                <div className="text-3xl font-bold text-blue-600">{importResult.updated}</div>
                <div className="text-sm text-muted-foreground">Updated</div>
              </Card>
              <Card className="p-4 text-center">
                <div className="text-3xl font-bold text-gray-600">{importResult.skipped}</div>
                <div className="text-sm text-muted-foreground">Skipped</div>
              </Card>
            </div>

            {importResult.errors.length > 0 && (
              <div className="bg-destructive/10 p-4 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <AlertCircle className="h-5 w-5 text-destructive" />
                  <h4 className="font-semibold">Import Errors ({importResult.errors.length})</h4>
                </div>
                <p className="text-sm text-muted-foreground mb-3">
                  Some rows could not be imported. Download the error log for details.
                </p>
                <Button variant="outline" size="sm" onClick={downloadErrorLog}>
                  <Download className="mr-2 h-4 w-4" />
                  Download Error Log
                </Button>
              </div>
            )}

            <div className="flex justify-center gap-4">
              <Button onClick={() => navigate("/provider/clients")}>
                View All Clients
              </Button>
              {importTag && (
                <Button variant="outline" onClick={() => navigate(`/provider/clients?tag=${importTag}`)}>
                  View Imported Clients
                </Button>
              )}
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};

export default ImportClients;
