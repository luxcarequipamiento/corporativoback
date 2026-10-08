import { readFileSync, writeFileSync } from 'node:fs';
const source = JSON.parse(readFileSync(new URL('../data/sheet1.source.json', import.meta.url), 'utf8'));
const columns = [['B','C','colorado-wt'],['E','F','silverado'],['H','I','n400'],['K','L','groove'],['N','O','tracker'],['Q','R','captiva'],['T','U','traverse'],['W','X','sail'],['Z','AA','tahoe'],['AC','AD','suburban']];
const cell = (row, column) => source.rows.find((entry) => entry.row === row)?.cells.find((entry) => entry.cell === `${column}${row}`)?.value;
const models = columns.map(([names, prices, id]) => ({ id, name: cell(4,names), items: source.rows.filter((row) => row.row >= 5).flatMap((row) => {
  const name = cell(row.row,names)?.trim();
  if (!name) return [];
  const rawPrice = cell(row.row,prices);
  if (!rawPrice || !Number.isFinite(Number(rawPrice)) || Number(rawPrice) < 0) throw new Error(`Precio invalido: ${prices}${row.row}`);
  return [{ id: `chevrolet-${id}-${row.row}`, name, price: Math.round(Number(rawPrice)*100)/100, sourcePrice: rawPrice, sourceCell: `${prices}${row.row}`, sourceRow: row.row }];
}) }));
const catalog = { brand: 'chevrolet', source: 'Copia de LISTA DE PRECIOS LUXCAR ELOY.xlsx', sheet: 'Hoja1', currency: 'USD', pricePrecision: 2, models };
writeFileSync(new URL('../data/chevrolet-catalog.json',import.meta.url),JSON.stringify(catalog,null,2)+'\n');
console.log(models.map((model) => `${model.name}: ${model.items.length}`).join('\n'));
console.log(`Total: ${models.reduce((sum,model) => sum+model.items.length,0)}`);