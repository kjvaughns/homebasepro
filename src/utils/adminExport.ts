import { format } from 'date-fns';

interface ExportFilters {
  dateRange?: { from?: Date; to?: Date };
  search?: string;
  status?: string;
}

export const exportToCSV = (
  data: Record<string, any>[],
  filename: string,
  filters?: ExportFilters
) => {
  if (data.length === 0) {
    throw new Error('No data to export');
  }
  
  // Standardized headers
  const headers = Object.keys(data[0]).map(key => 
    key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
  );
  
  // Format values
  const rows = data.map(row => 
    Object.entries(row).map(([key, value]) => {
      // UTC timestamps
      if (key.includes('_at') || key.includes('date')) {
        return value ? format(new Date(value), 'yyyy-MM-dd HH:mm:ss') + ' UTC' : '';
      }
      // Number formats (convert cents to dollars)
      if (key.includes('amount') || key.includes('price') || key.includes('mrr') || key.includes('arr')) {
        return typeof value === 'number' ? (value / 100).toFixed(2) : value;
      }
      // Escape commas and quotes in strings
      if (typeof value === 'string') {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return value ?? '';
    })
  );
  
  // Add filter info to filename
  let filterSuffix = '';
  if (filters?.dateRange?.from || filters?.dateRange?.to) {
    const fromStr = filters.dateRange.from ? format(filters.dateRange.from, 'yyyy-MM-dd') : 'start';
    const toStr = filters.dateRange.to ? format(filters.dateRange.to, 'yyyy-MM-dd') : 'end';
    filterSuffix = `_${fromStr}_to_${toStr}`;
  }
  if (filters?.search) {
    filterSuffix += `_search_${filters.search.replace(/\s+/g, '_')}`;
  }
  if (filters?.status) {
    filterSuffix += `_${filters.status}`;
  }
  
  const csv = [
    headers.join(','),
    ...rows.map(r => r.join(','))
  ].join('\n');
  
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}${filterSuffix}_${format(new Date(), 'yyyy-MM-dd_HHmmss')}.csv`;
  a.click();
  URL.revokeObjectURL(url);
};
