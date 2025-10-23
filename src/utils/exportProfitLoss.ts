interface PLData {
  revenue: number;
  parts_cost: number;
  labor_cost: number;
  gross_profit: number;
  net_profit: number;
  margin_pct: number;
}

export const exportPLtoCSV = (data: PLData, startDate: Date, endDate: Date) => {
  const rows = [
    ['Profit & Loss Statement'],
    [`Period: ${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`],
    [''],
    ['Category', 'Amount'],
    ['Revenue', `$${(data.revenue / 100).toFixed(2)}`],
    [''],
    ['Cost of Goods Sold'],
    ['Parts & Materials', `$${(data.parts_cost / 100).toFixed(2)}`],
    ['Labor Cost', `$${(data.labor_cost / 100).toFixed(2)}`],
    ['Total COGS', `$${((data.parts_cost + data.labor_cost) / 100).toFixed(2)}`],
    [''],
    ['Gross Profit', `$${(data.gross_profit / 100).toFixed(2)}`],
    [''],
    ['Net Profit', `$${(data.net_profit / 100).toFixed(2)}`],
    ['Net Margin', `${data.margin_pct.toFixed(2)}%`],
  ];

  const csv = rows.map(row => row.join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `profit-loss-${startDate.toISOString().split('T')[0]}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

export const exportQuickBooksJournal = (data: PLData, startDate: Date, endDate: Date) => {
  // QuickBooks IIF format (simplified)
  const rows = [
    ['!TRNS', 'DATE', 'ACCNT', 'NAME', 'AMOUNT', 'MEMO'],
    ['!SPL', 'DATE', 'ACCNT', 'NAME', 'AMOUNT', 'MEMO'],
    ['TRNS', endDate.toLocaleDateString(), 'Revenue', '', (data.revenue / 100).toFixed(2), 'Period Revenue'],
    ['SPL', endDate.toLocaleDateString(), 'COGS', '', (-(data.parts_cost + data.labor_cost) / 100).toFixed(2), 'Cost of Goods Sold'],
    ['ENDTRNS']
  ];

  const iif = rows.map(row => row.join('\t')).join('\n');
  const blob = new Blob([iif], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `quickbooks-journal-${startDate.toISOString().split('T')[0]}.iif`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};