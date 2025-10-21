import jsPDF from "jspdf";

interface ReceiptData {
  bookingId: string;
  serviceName: string;
  providerName: string;
  date: string;
  homeownerName: string;
  address: string;
  subtotal: number;
  tip?: number;
  fee: number;
  total: number;
}

export const generateReceipt = (data: ReceiptData) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  
  // Header
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.text("HomeBase", pageWidth / 2, 20, { align: "center" });
  
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text("Service Receipt", pageWidth / 2, 28, { align: "center" });
  
  // Receipt ID
  doc.setFontSize(9);
  doc.text(`Receipt ID: ${data.bookingId.substring(0, 8)}`, 20, 40);
  doc.text(`Date: ${data.date}`, pageWidth - 20, 40, { align: "right" });
  
  // Divider
  doc.setDrawColor(200);
  doc.line(20, 45, pageWidth - 20, 45);
  
  // Service Details
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("Service Details", 20, 55);
  
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(`Service: ${data.serviceName}`, 20, 65);
  doc.text(`Provider: ${data.providerName}`, 20, 72);
  doc.text(`Customer: ${data.homeownerName}`, 20, 79);
  doc.text(`Address: ${data.address}`, 20, 86);
  
  // Divider
  doc.line(20, 95, pageWidth - 20, 95);
  
  // Payment Breakdown
  doc.setFont("helvetica", "bold");
  doc.text("Payment Breakdown", 20, 105);
  
  doc.setFont("helvetica", "normal");
  let yPos = 115;
  
  doc.text("Service Fee:", 20, yPos);
  doc.text(`$${(data.subtotal / 100).toFixed(2)}`, pageWidth - 20, yPos, { align: "right" });
  
  if (data.tip && data.tip > 0) {
    yPos += 7;
    doc.text("Tip:", 20, yPos);
    doc.text(`$${(data.tip / 100).toFixed(2)}`, pageWidth - 20, yPos, { align: "right" });
  }
  
  yPos += 7;
  doc.text("Platform Fee:", 20, yPos);
  doc.text(`$${(data.fee / 100).toFixed(2)}`, pageWidth - 20, yPos, { align: "right" });
  
  // Total
  yPos += 10;
  doc.setDrawColor(200);
  doc.line(20, yPos - 2, pageWidth - 20, yPos - 2);
  
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("Total Paid:", 20, yPos + 5);
  doc.text(`$${(data.total / 100).toFixed(2)}`, pageWidth - 20, yPos + 5, { align: "right" });
  
  // Footer
  doc.setFontSize(8);
  doc.setFont("helvetica", "italic");
  doc.setTextColor(100);
  doc.text("Thank you for using HomeBase!", pageWidth / 2, pageWidth - 20, { align: "center" });
  doc.text("Questions? Contact support@homebase.com", pageWidth / 2, pageWidth - 15, { align: "center" });
  
  // Save PDF
  const fileName = `HomeBase_Receipt_${data.bookingId.substring(0, 8)}_${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(fileName);
};
