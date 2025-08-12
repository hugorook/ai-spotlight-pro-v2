export function printReport(htmlId: string) {
  const el = document.getElementById(htmlId);
  if (!el) {
    alert('Nothing to print');
    return;
  }
  const w = window.open('', '_blank', 'width=1024,height=768');
  if (!w) return;
  const doc = w.document;
  doc.write('<html><head><title>Report</title>');
  doc.write('<link rel="stylesheet" href="/assets/index.css" />');
  doc.write('</head><body>');
  doc.write(el.outerHTML);
  doc.write('</body></html>');
  doc.close();
  w.focus();
  w.print();
  w.close();
}

