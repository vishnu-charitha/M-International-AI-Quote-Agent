import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { Quote } from "@workspace/api-client-react";

export async function generateQuotePdf(quote: Quote, returnBase64 = false): Promise<string | void> {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4"
  });

  const primaryColor: [number, number, number] = [0, 41, 107]; // M International blue-ish

  // Header
  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text("M INTERNATIONAL", 14, 22);

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 100, 100);
  doc.text("Global Aviation Support & Services", 14, 28);

  // Quote info (Right aligned)
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(150, 150, 150);
  doc.text("QUOTATION", 196, 22, { align: "right" });

  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(0, 0, 0);
  doc.text(quote.quoteNumber, 196, 29, { align: "right" });

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`Status: ${quote.status}`, 196, 35, { align: "right" });

  doc.setDrawColor(200, 200, 200);
  doc.line(14, 42, 196, 42);

  // Customer Information
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(150, 150, 150);
  doc.text("CUSTOMER INFORMATION", 14, 52);

  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(0, 0, 0);
  doc.text(quote.customerCompany || "Unknown Company", 14, 59);

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(quote.customer || "Unknown Contact", 14, 65);

  // Reference Information
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(150, 150, 150);
  doc.text("REFERENCE", 120, 52);

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(0, 0, 0);
  doc.text(`RFQ Number: #${quote.rfqId}`, 120, 59);
  doc.text(`Date: ${new Date(quote.createdAt).toLocaleDateString()}`, 120, 65);

  const formatter = new Intl.NumberFormat('en-US', { style: 'currency', currency: quote.currency || 'USD' });

  // Line Items
  autoTable(doc, {
    startY: 75,
    head: [["Part Number", "Description", "Qty", "Unit Price", "Line Total"]],
    body: [
      [
        quote.partNumber,
        quote.description || "-",
        quote.quantity.toString(),
        formatter.format(quote.unitPrice || 0),
        formatter.format(quote.subtotal || 0),
      ]
    ],
    headStyles: {
      fillColor: primaryColor,
      textColor: 255,
      fontStyle: "bold"
    },
    columnStyles: {
      0: { fontStyle: "bold" },
      2: { halign: "center" },
      3: { halign: "right" },
      4: { halign: "right", fontStyle: "bold" }
    }
  });

  // Totals
  const finalY = (doc as any).lastAutoTable.finalY + 10;
  
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  
  // Right align pricing block
  const labelX = 140;
  const valueX = 196;

  doc.text("Subtotal", labelX, finalY);
  doc.text(formatter.format(quote.subtotal || 0), valueX, finalY, { align: "right" });

  doc.text("Tax", labelX, finalY + 6);
  doc.text(formatter.format(quote.tax || 0), valueX, finalY + 6, { align: "right" });

  doc.text("Shipping", labelX, finalY + 12);
  doc.text(formatter.format(quote.shippingCost || 0), valueX, finalY + 12, { align: "right" });

  let totalOffset = 18;
  if ((quote.discount || 0) > 0) {
    doc.setTextColor(0, 150, 0);
    doc.text("Discount", labelX, finalY + 18);
    doc.text("-" + formatter.format(quote.discount || 0), valueX, finalY + 18, { align: "right" });
    totalOffset = 24;
  }

  doc.setDrawColor(200, 200, 200);
  doc.line(labelX, finalY + totalOffset - 4, valueX, finalY + totalOffset - 4);

  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(0, 0, 0);
  doc.text("Grand Total", labelX, finalY + totalOffset + 2);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text(formatter.format(quote.totalAmount || 0), valueX, finalY + totalOffset + 2, { align: "right" });

  // Terms
  const termsY = finalY + totalOffset + 20;
  doc.setDrawColor(200, 200, 200);
  doc.line(14, termsY, 196, termsY);

  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(150, 150, 150);
  doc.text("TERMS", 14, termsY + 8);

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(0, 0, 0);
  
  doc.text("Availability:", 14, termsY + 15);
  doc.text(quote.availability || "TBD", 35, termsY + 15);
  
  doc.text("Lead Time:", 14, termsY + 20);
  doc.text(quote.leadTime || "TBD", 35, termsY + 20);
  
  doc.text("Warranty:", 100, termsY + 15);
  doc.text(quote.warranty || "Standard", 120, termsY + 15);
  
  doc.text("Validity:", 100, termsY + 20);
  doc.text(quote.validity || "30 Days", 120, termsY + 20);

  // Save or Return the PDF
  if (returnBase64) {
    const dataUri = doc.output('datauristring');
    return dataUri; // this includes "data:application/pdf;base64," prefix
  } else {
    const filename = `M-International-Quote-${quote.quoteNumber}.pdf`;
    doc.save(filename);
  }
}

export async function generateInvoicePdf(invoice: any, returnBase64 = false): Promise<string | void> {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const primaryColor = [11, 46, 89]; 
  const secondaryColor = [100, 116, 139]; 

  // --- Header ---
  doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.rect(0, 0, 210, 40, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(24);
  doc.text("M INTERNATIONAL", 14, 25);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text("INVOICE", 150, 25);

  // --- Invoice Details ---
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(10);

  let startY = 55;
  doc.setFont("helvetica", "bold");
  doc.text("Invoice Number:", 14, startY);
  doc.setFont("helvetica", "normal");
  doc.text(invoice.invoiceNumber, 50, startY);

  startY += 7;
  doc.setFont("helvetica", "bold");
  doc.text("Order Ref:", 14, startY);
  doc.setFont("helvetica", "normal");
  doc.text(invoice.orderId ? invoice.orderId.toString() : "N/A", 50, startY);

  startY += 7;
  doc.setFont("helvetica", "bold");
  doc.text("Invoice Date:", 14, startY);
  doc.setFont("helvetica", "normal");
  doc.text(new Date(invoice.createdAt).toLocaleDateString(), 50, startY);
  
  startY += 7;
  doc.setFont("helvetica", "bold");
  doc.text("Status:", 14, startY);
  doc.setFont("helvetica", "normal");
  doc.text(invoice.status + " / " + invoice.paymentStatus, 50, startY);

  // --- Customer Info ---
  startY = 55;
  doc.setFont("helvetica", "bold");
  doc.text("Bill To:", 120, startY);
  doc.setFont("helvetica", "normal");
  doc.text(invoice.customer || "Unknown", 120, startY + 7);
  if (invoice.customerCompany) {
    doc.text(invoice.customerCompany, 120, startY + 14);
  }

  // --- Items Table ---
  const tableData = [
    [
      invoice.partNumber,
      invoice.quantity.toString(),
      (invoice.totalAmount ? (parseFloat(invoice.totalAmount) / invoice.quantity).toFixed(2) : "0.00"),
      invoice.totalAmount
    ]
  ];

  autoTable(doc, {
    startY: 90,
    head: [["Part Number", "Qty", "Unit Price (USD)", "Amount (USD)"]],
    body: tableData,
    theme: "striped",
    headStyles: { fillColor: primaryColor as any, textColor: 255 },
    styles: { font: "helvetica", fontSize: 9 },
    columnStyles: {
      0: { cellWidth: 80 },
      1: { cellWidth: 20, halign: 'right' },
      2: { cellWidth: 40, halign: 'right' },
      3: { cellWidth: 40, halign: 'right' },
    },
  });

  // --- Totals ---
  const finalY = (doc as any).lastAutoTable.finalY + 15;

  doc.setFont("helvetica", "bold");
  doc.text("Total Amount (USD):", 120, finalY);
  
  doc.setFont("helvetica", "normal");
  doc.text("$" + (invoice.totalAmount ? invoice.totalAmount.toString() : "0.00"), 165, finalY);

  // --- Footer ---
  doc.setFontSize(8);
  doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
  doc.text(
    "Thank you for your business. Please remit payment upon receipt.",
    105,
    280,
    { align: "center" }
  );

  if (returnBase64) {
    const dataUri = doc.output("datauristring");
    return dataUri; 
  } else {
    const filename = `M-International-Invoice-${invoice.invoiceNumber}.pdf`;
    doc.save(filename);
  }
}
