import assert from "node:assert/strict";
import { it } from "node:test";
import { toCsv } from "../src/app/csv-export";

it("quotes CSV delimiters, quotes and line breaks while preserving zero and false", () => {
  const csv = toCsv(
    [
      { label: "Texto", value: (row: { text: string }) => row.text },
      { label: "Cantidad", value: (row: { amount: number }) => row.amount },
      { label: "Activo", value: (row: { active: boolean }) => row.active },
    ],
    [{ text: 'Uno; "dos"\ntres', amount: 0, active: false }],
  );

  assert.equal(
    csv,
    '\ufeff"Texto";"Cantidad";"Activo"\n"Uno; ""dos""\ntres";"0";"false"',
  );
});

it("neutralizes formula-like strings after leading control or whitespace characters", () => {
  const csv = toCsv(
    [{ label: "Dato", value: (row: { value: string }) => row.value }],
    [
      { value: "=2+2" },
      { value: "  @SUM(A1:A2)" },
      { value: "\t-1+1" },
      { value: "+cmd|' /C calc'!A0" },
    ],
  );

  assert.equal(
    csv,
    '\ufeff"Dato"\n"\'=2+2"\n"\'  @SUM(A1:A2)"\n"\'\t-1+1"\n"\'+cmd|\' /C calc\'!A0"',
  );
});

it("exports only selected columns and still emits headers for an empty filtered result", () => {
  const csv = toCsv(
    [{ label: "Acta", value: (row: { title: string; apiId: string }) => row.title }],
    [],
  );

  assert.equal(csv, '\ufeff"Acta"');
});
