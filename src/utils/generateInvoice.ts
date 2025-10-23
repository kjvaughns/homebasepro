import jsPDF from 'jspdf';

interface InvoiceLineItem {
  description: string;
  quantity: number;
  rate: number;
  amount: number;
}

interface InvoiceData {
  invoice_number: string;
  client_name: string;
  client_address?: string;
  provider_name: string;
  provider_address?: string;
  line_items: InvoiceLineItem[];
  subtotal: number;
  tax_amount: number;
  discount_amount: number;
  total_amount: number;
  due_date?: string;
  created_at: string;
}

export const generateInvoicePDF = (invoice: InvoiceData): Blob => {
  const doc = new jsPDF();
  
  // Header
  doc.setFontSize(24);
  doc.text('INVOICE', 20, 20);
  
  doc.setFontSize(10);
  doc.text(`Invoice #${invoice.invoice_number}`, 20, 30);
  doc.text(`Date: ${new Date(invoice.created_at).toLocaleDateString()}`, 20, 35);
  if (invoice.due_date) {
    doc.text(`Due Date: ${new Date(invoice.due_date).toLocaleDateString()}`, 20, 40);
  }
  
  // Provider Info
  doc.setFontSize(12);
  doc.text('From:', 20, 55);
  doc.setFontSize(10);
  doc.text(invoice.provider_name, 20, 62);
  if (invoice.provider_address) {
    doc.text(invoice.provider_address, 20, 67);
  }
  
  // Client Info
  doc.setFontSize(12);
  doc.text('Bill To:', 120, 55);
  doc.setFontSize(10);
  doc.text(invoice.client_name, 120, 62);
  if (invoice.client_address) {
    doc.text(invoice.client_address, 120, 67);
  }
  
  // Line Items Table
  let yPos = 85;
  doc.setFontSize(10);
  doc.setFont(undefined, 'bold');
  doc.text('Description', 20, yPos);
  doc.text('Qty', 120, yPos);
  doc.text('Rate', 140, yPos);
  doc.text('Amount', 170, yPos);
  
  doc.line(20, yPos + 2, 190, yPos + 2);
  yPos += 8;
  
  doc.setFont(undefined, 'normal');
  invoice.line_items.forEach(item => {
    doc.text(item.description, 20, yPos);
    doc.text(item.quantity.toString(), 120, yPos);
    doc.text(`$${(item.rate / 100).toFixed(2)}`, 140, yPos);
    doc.text(`$${(item.amount / 100).toFixed(2)}`, 170, yPos);
    yPos += 6;
  });
  
  // Totals
  doc.line(20, yPos, 190, yPos);
  yPos += 8;
  
  doc.text('Subtotal:', 140, yPos);
  doc.text(`$${(invoice.subtotal / 100).toFixed(2)}`, 170, yPos);
  yPos += 6;
  
  if (invoice.discount_amount > 0) {
    doc.text('Discount:', 140, yPos);
    doc.text(`-$${(invoice.discount_amount / 100).toFixed(2)}`, 170, yPos);
    yPos += 6;
  }
  
  if (invoice.tax_amount > 0) {
    doc.text('Tax:', 140, yPos);
    doc.text(`$${(invoice.tax_amount / 100).toFixed(2)}`, 170, yPos);
    yPos += 6;
  }
  
  doc.setFont(undefined, 'bold');
  doc.setFontSize(12);
  doc.text('Total:', 140, yPos);
  doc.text(`$${(invoice.total_amount / 100).toFixed(2)}`, 170, yPos);
  
  return doc.output('blob');
};

export const downloadInvoicePDF = (invoice: InvoiceData) => {
  const blob = generateInvoicePDF(invoice);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `invoice-${invoice.invoice_number}.pdf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};