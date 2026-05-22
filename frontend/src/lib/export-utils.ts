export interface ExportColumn<T> {
    header: string;
    accessor: keyof T | ((item: T) => string | number | null | undefined);
}

export function exportToCSV<T extends Record<string, any>>(
    data: T[],
    columns: ExportColumn<T>[],
    filename: string
): void {
    if (data.length === 0) return;

    // Build CSV content
    const headers = columns.map(col => `"${col.header}"`);
    const rows = data.map(item =>
        columns.map(col => {
            const value = typeof col.accessor === 'function'
                ? col.accessor(item)
                : item[col.accessor as string];

            // Handle null/undefined, escape quotes
            if (value === null || value === undefined) return '""';
            const stringValue = String(value);
            return `"${stringValue.replace(/"/g, '""')}"`;
        })
    );

    const csvContent = [
        headers.join(','),
        ...rows.map(row => row.join(','))
    ].join('\n');

    // Add BOM for Arabic/UTF-8 support
    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8' });

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

export function exportToJSON<T>(
    data: T[],
    filename: string
): void {
    const jsonContent = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonContent], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${filename}_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}