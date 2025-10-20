import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface ResultPanelProps {
  summaryContent: React.ReactNode;
  detailsContent: React.ReactNode;
  downloadContent: React.ReactNode;
}

export function ResultPanel({ summaryContent, detailsContent, downloadContent }: ResultPanelProps) {
  return (
    <Card className="p-6 rounded-2xl shadow-md">
      <Tabs defaultValue="summary" className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-6">
          <TabsTrigger value="summary">Summary</TabsTrigger>
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="download">Download</TabsTrigger>
        </TabsList>
        <TabsContent value="summary" className="space-y-6">
          {summaryContent}
        </TabsContent>
        <TabsContent value="details" className="space-y-6">
          {detailsContent}
        </TabsContent>
        <TabsContent value="download" className="space-y-6">
          {downloadContent}
        </TabsContent>
      </Tabs>
    </Card>
  );
}
