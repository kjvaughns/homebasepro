import html2canvas from "html2canvas";
import jsPDF from "jspdf";

interface MaintenancePlan {
  annualCostLow: number;
  annualCostTypical: number;
  annualCostHigh: number;
  tasks: {
    name: string;
    category: string;
    frequency: string;
    costLow: number;
    costTypical: number;
    costHigh: number;
    isDIY: boolean;
    riskNote: string;
  }[];
}

interface FormInputs {
  zipCode: string;
  propertyType: string;
  homeAge: string;
  squareFeet: string;
  bedrooms: string;
  bathrooms: string;
  hasPool: boolean;
  hasHVAC: boolean;
  hasSprinklers?: boolean;
  hasFence?: boolean;
}

interface CommunicationPack {
  estimate: {
    items: { description: string; quantity: number; rate: number; total: number }[];
    subtotal: number;
    tax: number;
    total: number;
  };
  messages: { [key: string]: string };
  policies: { [key: string]: string };
}

interface ProviderInfo {
  businessName: string;
  phone: string;
  email: string;
  logoUrl?: string;
}

export async function generateMaintenancePlanPDF(
  plan: MaintenancePlan,
  inputs: FormInputs
): Promise<void> {
  const pdf = new jsPDF("p", "mm", "a4");
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 20;
  const contentWidth = pageWidth - 2 * margin;

  // Cover Page
  pdf.setFillColor(59, 130, 246); // primary color
  pdf.rect(0, 0, pageWidth, 70, "F");
  
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(32);
  pdf.setFont("helvetica", "bold");
  pdf.text("Your Home", pageWidth / 2, 30, { align: "center" });
  pdf.text("Maintenance Survival Kit", pageWidth / 2, 45, { align: "center" });
  
  pdf.setFontSize(12);
  pdf.setFont("helvetica", "normal");
  pdf.text(`Generated: ${new Date().toLocaleDateString()}`, pageWidth / 2, 60, { align: "center" });

  // Home Details
  pdf.setTextColor(0, 0, 0);
  pdf.setFontSize(16);
  pdf.setFont("helvetica", "bold");
  pdf.text("Your Home Details", margin, 90);

  pdf.setFontSize(11);
  pdf.setFont("helvetica", "normal");
  let yPos = 105;
  const lineHeight = 7;

  const details = [
    `Property Type: ${inputs.propertyType}`,
    `Home Age: ${inputs.homeAge} years`,
    `Square Footage: ${inputs.squareFeet} sq ft`,
    `Bedrooms: ${inputs.bedrooms}`,
    `Bathrooms: ${inputs.bathrooms}`,
    `Location: ${inputs.zipCode}`,
  ];

  const features = [];
  if (inputs.hasPool) features.push("Pool");
  if (inputs.hasHVAC) features.push("HVAC");
  if (inputs.hasSprinklers) features.push("Sprinklers");
  if (inputs.hasFence) features.push("Fence");
  if (features.length > 0) {
    details.push(`Features: ${features.join(", ")}`);
  }

  details.forEach((detail) => {
    pdf.text(detail, margin, yPos);
    yPos += lineHeight;
  });

  // Summary Box
  yPos += 10;
  pdf.setFillColor(240, 240, 240);
  pdf.rect(margin, yPos, contentWidth, 40, "F");
  
  pdf.setFontSize(14);
  pdf.setFont("helvetica", "bold");
  pdf.text("Annual Maintenance Summary", margin + 5, yPos + 10);
  
  pdf.setFontSize(20);
  pdf.setTextColor(59, 130, 246);
  const costText = `$${plan.annualCostLow.toLocaleString()} - $${plan.annualCostHigh.toLocaleString()}`;
  pdf.text(costText, margin + 5, yPos + 23);
  
  pdf.setFontSize(11);
  pdf.setTextColor(100, 100, 100);
  pdf.text(`Typical: $${plan.annualCostTypical.toLocaleString()}`, margin + 5, yPos + 31);
  pdf.text(`${plan.tasks.length} maintenance tasks per year`, margin + 5, yPos + 37);

  // Add new page for tasks
  pdf.addPage();
  pdf.setTextColor(0, 0, 0);
  pdf.setFontSize(18);
  pdf.setFont("helvetica", "bold");
  pdf.text("Maintenance Task Breakdown", margin, margin);

  yPos = margin + 15;
  pdf.setFontSize(9);
  
  // Table header
  pdf.setFillColor(59, 130, 246);
  pdf.setTextColor(255, 255, 255);
  pdf.rect(margin, yPos, contentWidth, 8, "F");
  pdf.text("Task", margin + 2, yPos + 5);
  pdf.text("Frequency", margin + 65, yPos + 5);
  pdf.text("Cost", margin + 105, yPos + 5);
  pdf.text("DIY", margin + 145, yPos + 5);
  
  yPos += 8;
  pdf.setTextColor(0, 0, 0);

  // Table rows
  plan.tasks.forEach((task, index) => {
    if (yPos > pageHeight - 30) {
      pdf.addPage();
      yPos = margin;
    }

    // Alternating row colors
    if (index % 2 === 0) {
      pdf.setFillColor(250, 250, 250);
      pdf.rect(margin, yPos, contentWidth, 12, "F");
    }

    pdf.setFont("helvetica", "bold");
    pdf.text(task.name, margin + 2, yPos + 4, { maxWidth: 60 });
    
    pdf.setFont("helvetica", "normal");
    pdf.text(task.frequency, margin + 65, yPos + 4, { maxWidth: 35 });
    pdf.text(`$${task.costTypical}`, margin + 105, yPos + 4);
    pdf.text(task.isDIY ? "Yes" : "No", margin + 145, yPos + 4);
    
    if (task.riskNote) {
      pdf.setFontSize(8);
      pdf.setTextColor(220, 38, 38);
      pdf.text(task.riskNote, margin + 2, yPos + 9, { maxWidth: contentWidth - 4 });
      pdf.setFontSize(9);
      pdf.setTextColor(0, 0, 0);
    }

    yPos += 12;
  });

  // Footer on last page
  pdf.setFontSize(8);
  pdf.setTextColor(150, 150, 150);
  pdf.text(
    "Created with HomeBase - Your Home Maintenance Partner",
    pageWidth / 2,
    pageHeight - 10,
    { align: "center" }
  );

  // Download
  pdf.save(`HomeBase-Maintenance-Plan-${new Date().toISOString().split("T")[0]}.pdf`);
}

export async function generateCommunicationPackPDF(
  pack: CommunicationPack,
  info: ProviderInfo
): Promise<void> {
  const pdf = new jsPDF("p", "mm", "a4");
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 20;
  const contentWidth = pageWidth - 2 * margin;

  // Cover Page
  pdf.setFillColor(59, 130, 246);
  pdf.rect(0, 0, pageWidth, 80, "F");
  
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(28);
  pdf.setFont("helvetica", "bold");
  pdf.text(info.businessName, pageWidth / 2, 35, { align: "center" });
  
  pdf.setFontSize(18);
  pdf.setFont("helvetica", "normal");
  pdf.text("Communication Pack", pageWidth / 2, 50, { align: "center" });
  
  pdf.setFontSize(11);
  pdf.text(`${info.phone} | ${info.email}`, pageWidth / 2, 65, { align: "center" });
  pdf.text(`Generated: ${new Date().toLocaleDateString()}`, pageWidth / 2, 72, { align: "center" });

  // Estimate Section
  pdf.setTextColor(0, 0, 0);
  pdf.setFontSize(20);
  pdf.setFont("helvetica", "bold");
  pdf.text("Estimate Template", margin, 100);

  let yPos = 115;
  pdf.setFontSize(10);
  
  // Estimate table header
  pdf.setFillColor(59, 130, 246);
  pdf.setTextColor(255, 255, 255);
  pdf.rect(margin, yPos, contentWidth, 8, "F");
  pdf.text("Description", margin + 2, yPos + 5);
  pdf.text("Qty", margin + 100, yPos + 5);
  pdf.text("Rate", margin + 120, yPos + 5);
  pdf.text("Total", margin + 145, yPos + 5);
  
  yPos += 8;
  pdf.setTextColor(0, 0, 0);

  // Estimate items
  pack.estimate.items.forEach((item, index) => {
    if (index % 2 === 0) {
      pdf.setFillColor(250, 250, 250);
      pdf.rect(margin, yPos, contentWidth, 8, "F");
    }
    
    pdf.text(item.description, margin + 2, yPos + 5);
    pdf.text(item.quantity.toString(), margin + 100, yPos + 5);
    pdf.text(`$${item.rate.toFixed(2)}`, margin + 120, yPos + 5);
    pdf.text(`$${item.total.toFixed(2)}`, margin + 145, yPos + 5);
    yPos += 8;
  });

  // Totals
  yPos += 5;
  pdf.setFont("helvetica", "normal");
  pdf.text(`Subtotal:`, margin + 110, yPos);
  pdf.text(`$${pack.estimate.subtotal.toFixed(2)}`, margin + 145, yPos);
  
  yPos += 6;
  pdf.text(`Tax:`, margin + 110, yPos);
  pdf.text(`$${pack.estimate.tax.toFixed(2)}`, margin + 145, yPos);
  
  yPos += 6;
  pdf.setFont("helvetica", "bold");
  pdf.text(`Total:`, margin + 110, yPos);
  pdf.text(`$${pack.estimate.total.toFixed(2)}`, margin + 145, yPos);

  // Messages Section
  pdf.addPage();
  pdf.setFontSize(20);
  pdf.setFont("helvetica", "bold");
  pdf.text("Message Templates", margin, margin);

  yPos = margin + 15;
  pdf.setFontSize(11);
  
  Object.entries(pack.messages).forEach(([key, message]) => {
    if (yPos > pageHeight - 60) {
      pdf.addPage();
      yPos = margin;
    }

    pdf.setFont("helvetica", "bold");
    pdf.setFillColor(240, 240, 240);
    pdf.rect(margin, yPos, contentWidth, 8, "F");
    pdf.text(key.replace(/_/g, " ").toUpperCase(), margin + 2, yPos + 5);
    
    yPos += 12;
    pdf.setFont("helvetica", "normal");
    const splitMessage = pdf.splitTextToSize(message, contentWidth);
    pdf.text(splitMessage, margin, yPos);
    yPos += splitMessage.length * 6 + 10;
  });

  // Policies Section
  pdf.addPage();
  pdf.setFontSize(20);
  pdf.setFont("helvetica", "bold");
  pdf.text("Business Policies", margin, margin);

  yPos = margin + 15;
  pdf.setFontSize(11);
  
  Object.entries(pack.policies).forEach(([key, policy]) => {
    if (yPos > pageHeight - 60) {
      pdf.addPage();
      yPos = margin;
    }

    pdf.setFont("helvetica", "bold");
    pdf.text(key.replace(/_/g, " ").toUpperCase(), margin, yPos);
    
    yPos += 7;
    pdf.setFont("helvetica", "normal");
    const splitPolicy = pdf.splitTextToSize(policy, contentWidth);
    pdf.text(splitPolicy, margin, yPos);
    yPos += splitPolicy.length * 6 + 8;
  });

  // Footer
  pdf.setFontSize(8);
  pdf.setTextColor(150, 150, 150);
  pdf.text(
    "Created with HomeBase - Professional Communication Tools for Service Providers",
    pageWidth / 2,
    pageHeight - 10,
    { align: "center" }
  );

  // Download
  const fileName = `HomeBase-Communication-Pack-${info.businessName.replace(/\s+/g, "-")}-${new Date().toISOString().split("T")[0]}.pdf`;
  pdf.save(fileName);
}
