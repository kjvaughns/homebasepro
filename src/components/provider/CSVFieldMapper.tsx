import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

interface CSVFieldMapperProps {
  headers: string[];
  mapping: { [csvColumn: string]: string };
  onMappingChange: (mapping: { [csvColumn: string]: string }) => void;
}

const CLIENT_FIELDS = [
  { value: "name", label: "Name" },
  { value: "email", label: "Email" },
  { value: "phone", label: "Phone" },
  { value: "address", label: "Address" },
  { value: "city", label: "City" },
  { value: "state", label: "State" },
  { value: "zip", label: "ZIP Code" },
  { value: "status", label: "Status" },
  { value: "notes", label: "Notes" },
  { value: "tags", label: "Tags (comma-separated)" },
  { value: "skip", label: "Skip this column" },
];

const CSVFieldMapper = ({ headers, mapping, onMappingChange }: CSVFieldMapperProps) => {
  const handleMappingChange = (csvColumn: string, clientField: string) => {
    onMappingChange({
      ...mapping,
      [csvColumn]: clientField,
    });
  };

  return (
    <div className="space-y-4">
      {headers.map((header) => (
        <div key={header} className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center p-4 border rounded-lg">
          <div>
            <Label className="text-sm font-medium">{header}</Label>
            <p className="text-xs text-muted-foreground">CSV Column</p>
          </div>
          <div>
            <Select value={mapping[header] || "skip"} onValueChange={(v) => handleMappingChange(header, v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CLIENT_FIELDS.map((field) => (
                  <SelectItem key={field.value} value={field.value}>
                    {field.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      ))}
    </div>
  );
};

export default CSVFieldMapper;
