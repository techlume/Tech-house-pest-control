const doubleQuote = String.fromCharCode(34);
const quote = (value) =>
  doubleQuote +
  String(value ?? '').replaceAll(doubleQuote, doubleQuote + doubleQuote) +
  doubleQuote;
export function downloadCsv(name, rows, headers) {
  const keys = headers || (rows[0] ? Object.keys(rows[0]) : []);
  const text = [keys, ...rows.map((row) => keys.map((key) => row[key]))]
    .map((row) => row.map(quote).join(','))
    .join('\r\n');
  const url = URL.createObjectURL(new Blob([text], { type: 'text/csv' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = name + '.csv';
  link.click();
  URL.revokeObjectURL(url);
}
export function parseCsv(text) {
  const all = [];
  let row = [], value = '', quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index], next = text[index + 1];
    if (char === doubleQuote && quoted && next === doubleQuote) {
      value += doubleQuote;
      index += 1;
    } else if (char === doubleQuote) quoted = !quoted;
    else if (char === ',' && !quoted) {
      row.push(value.trim());
      value = '';
    } else if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && next === '\n') index += 1;
      row.push(value.trim());
      if (row.some(Boolean)) all.push(row);
      row = [];
      value = '';
    } else value += char;
  }
  if (value || row.length) {
    row.push(value.trim());
    all.push(row);
  }
  const headers = all.shift() || [];
  return all.map((columns) =>
    Object.fromEntries(
      headers.map((header, index) => [header, columns[index] || '']),
    ),
  );
}
