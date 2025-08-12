export function downloadCsv(filename: string, rows: Record<string, unknown>[]) {
  if (!rows || rows.length === 0) {
    alert('Nothing to export');
    return;
  }
  const headers = Array.from(
    rows.reduce<Set<string>>((set, row) => {
      Object.keys(row).forEach((k) => set.add(k));
      return set;
    }, new Set())
  );
  const escape = (val: unknown) => {
    if (val === null || val === undefined) return '';
    const s = typeof val === 'string' ? val : JSON.stringify(val);
    const needsQuotes = /[",\n]/.test(s);
    return needsQuotes ? '"' + s.replace(/"/g, '""') + '"' : s;
  };
  const lines = [headers.join(',')].concat(
    rows.map((r) => headers.map((h) => escape((r as any)[h])).join(','))
  );
  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

