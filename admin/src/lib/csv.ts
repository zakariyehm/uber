export function downloadCsv(filename: string, rows: Array<Record<string, string | number | null | undefined>>) {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const escape = (value: string | number | null | undefined) => {
    const raw = String(value ?? "");
    if (/[",\n]/.test(raw)) return `"${raw.replace(/"/g, '""')}"`;
    return raw;
  };
  const body = [
    headers.join(","),
    ...rows.map((row) => headers.map((key) => escape(row[key])).join(",")),
  ].join("\n");
  const blob = new Blob([body], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
