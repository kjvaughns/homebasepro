interface EarningsData {
  id: string;
  team_member_id: string;
  team_members?: {
    full_name: string;
    email: string;
  };
  period_start: string;
  period_end: string;
  hours: number;
  ot_hours: number;
  jobs_count: number;
  commissions_cents: number;
  tips_cents: number;
  reimbursements_cents: number;
  adjustments_cents: number;
  total_cents: number;
}

export function exportToCSV(earnings: EarningsData[]): string {
  const headers = [
    "Employee Name",
    "Email",
    "Period Start",
    "Period End",
    "Regular Hours",
    "OT Hours",
    "Jobs Completed",
    "Base Pay",
    "Commissions",
    "Tips",
    "Reimbursements",
    "Adjustments",
    "Total Pay",
  ];

  const rows = earnings.map((e) => [
    e.team_members?.full_name || "Unknown",
    e.team_members?.email || "",
    e.period_start,
    e.period_end,
    e.hours.toFixed(2),
    e.ot_hours.toFixed(2),
    e.jobs_count,
    ((e.total_cents - e.commissions_cents - e.tips_cents - e.reimbursements_cents - e.adjustments_cents) / 100).toFixed(2),
    (e.commissions_cents / 100).toFixed(2),
    (e.tips_cents / 100).toFixed(2),
    (e.reimbursements_cents / 100).toFixed(2),
    (e.adjustments_cents / 100).toFixed(2),
    (e.total_cents / 100).toFixed(2),
  ]);

  const csvContent = [
    headers.join(","),
    ...rows.map((row) => row.map((cell) => `"${cell}"`).join(",")),
  ].join("\n");

  return csvContent;
}

export function exportToQuickBooks(earnings: EarningsData[]): string {
  // QuickBooks Journal Entry format
  const headers = [
    "Date",
    "Account",
    "Debit",
    "Credit",
    "Description",
    "Name",
  ];

  const rows: string[][] = [];

  earnings.forEach((e) => {
    const date = e.period_end;
    const name = e.team_members?.full_name || "Unknown";
    const total = (e.total_cents / 100).toFixed(2);

    // Debit: Payroll Expense
    rows.push([
      date,
      "Payroll Expense",
      total,
      "0.00",
      `Payroll for ${e.period_start} to ${e.period_end}`,
      name,
    ]);

    // Credit: Payroll Payable
    rows.push([
      date,
      "Payroll Payable",
      "0.00",
      total,
      `Payroll for ${e.period_start} to ${e.period_end}`,
      name,
    ]);
  });

  const csvContent = [
    headers.join(","),
    ...rows.map((row) => row.map((cell) => `"${cell}"`).join(",")),
  ].join("\n");

  return csvContent;
}

export function exportToGusto(earnings: EarningsData[]): string {
  // Gusto import format
  const headers = [
    "Employee Email",
    "Employee Name",
    "Pay Period Start",
    "Pay Period End",
    "Hours",
    "Overtime Hours",
    "Bonus",
    "Commission",
    "Reimbursement",
  ];

  const rows = earnings.map((e) => [
    e.team_members?.email || "",
    e.team_members?.full_name || "Unknown",
    e.period_start,
    e.period_end,
    e.hours.toFixed(2),
    e.ot_hours.toFixed(2),
    ((e.tips_cents + e.adjustments_cents) / 100).toFixed(2),
    (e.commissions_cents / 100).toFixed(2),
    (e.reimbursements_cents / 100).toFixed(2),
  ]);

  const csvContent = [
    headers.join(","),
    ...rows.map((row) => row.map((cell) => `"${cell}"`).join(",")),
  ].join("\n");

  return csvContent;
}

export function downloadCSV(content: string, filename: string) {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  link.style.visibility = "hidden";
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}