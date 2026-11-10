export interface CsvColumn<Row> {
  label: string;
  value: (row: Row) => unknown;
}

function cell(value: unknown): string {
  let text = value == null ? "" : String(value);

  // Spreadsheet applications may evaluate formula-like text even in quoted CSV cells.
  if (typeof value === "string" && /^[\u0000-\u0020\u007f-\u00a0]*[=+@-]/.test(text)) {
    text = "'" + text;
  }

  return '"' + text.replace(/"/g, '""') + '"';
}

export function toCsv<Row>(columns: readonly CsvColumn<Row>[], rows: readonly Row[]): string {
  const header = columns.map((column) => cell(column.label)).join(";");
  const body = rows
    .map((row) => columns.map((column) => cell(column.value(row))).join(";"))
    .join("\n");

  return "\ufeff" + header + (body ? "\n" + body : "");
}
