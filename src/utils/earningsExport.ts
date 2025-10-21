interface JobEarning {
  id: string;
  team_member_id: string;
  team_members?: {
    full_name: string;
    email: string;
  };
  jobs?: {
    service_type: string;
    completed_at: string;
  };
  base_pay_cents: number;
  commission_cents: number;
  tip_cents: number;
  total_cents: number;
  hours_worked: number;
  status: string;
}

export function exportToCSV(earnings: JobEarning[]): string {
  const headers = [
    "Employee Name",
    "Email",
    "Job Type",
    "Completed Date",
    "Hours Worked",
    "Base Pay",
    "Commissions",
    "Tips",
    "Total Pay",
    "Status",
  ];

  const rows = earnings.map((e) => [
    e.team_members?.full_name || "Unknown",
    e.team_members?.email || "",
    e.jobs?.service_type || "",
    e.jobs?.completed_at || "",
    e.hours_worked?.toFixed(2) || "0.00",
    (e.base_pay_cents / 100).toFixed(2),
    (e.commission_cents / 100).toFixed(2),
    (e.tip_cents / 100).toFixed(2),
    (e.total_cents / 100).toFixed(2),
    e.status,
  ]);

  const csvContent = [
    headers.join(","),
    ...rows.map((row) => row.map((cell) => `"${cell}"`).join(",")),
  ].join("\n");

  return csvContent;
}

export function exportToQuickBooks(earnings: JobEarning[]): string {
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
    const date = e.jobs?.completed_at || new Date().toISOString().split('T')[0];
    const name = e.team_members?.full_name || "Unknown";
    const total = (e.total_cents / 100).toFixed(2);

    rows.push([
      date,
      "Contractor Expense",
      total,
      "0.00",
      `Earnings for ${e.jobs?.service_type || "Service"}`,
      name,
    ]);

    rows.push([
      date,
      "Contractor Payable",
      "0.00",
      total,
      `Earnings for ${e.jobs?.service_type || "Service"}`,
      name,
    ]);
  });

  const csvContent = [
    headers.join(","),
    ...rows.map((row) => row.map((cell) => `"${cell}"`).join(",")),
  ].join("\n");

  return csvContent;
}

export function exportToGusto(earnings: JobEarning[]): string {
  const headers = [
    "Employee Email",
    "Employee Name",
    "Job Type",
    "Completed Date",
    "Hours",
    "Bonus",
    "Commission",
  ];

  const rows = earnings.map((e) => [
    e.team_members?.email || "",
    e.team_members?.full_name || "Unknown",
    e.jobs?.service_type || "",
    e.jobs?.completed_at || "",
    e.hours_worked?.toFixed(2) || "0.00",
    ((e.tip_cents) / 100).toFixed(2),
    (e.commission_cents / 100).toFixed(2),
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
