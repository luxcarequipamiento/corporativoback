import { supabase } from '../config/supabase.js';
import { assertDatabaseResult } from '../utils/database.js';

export async function findMany(table, options = {}) {
  const { columns = '*', filters = {}, inFilters = {}, orderBy } = options;
  let query = supabase.from(table).select(columns);
  for (const [column, value] of Object.entries(filters)) query = query.eq(column, value);
  for (const [column, values] of Object.entries(inFilters)) {
    if (values.length === 0) return [];
    query = query.in(column, values);
  }
  if (orderBy) query = query.order(orderBy.column, { ascending: orderBy.ascending !== false });
  const { data, error } = await query;
  assertDatabaseResult(error);
  return data || [];
}

export async function findById(table, idColumn, id, columns = '*') {
  const rows = await findMany(table, { columns, filters: { [idColumn]: id } });
  return rows[0] || null;
}
