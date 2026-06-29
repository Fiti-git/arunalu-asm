import React, { useRef, useState, useCallback } from 'react';
import {
  Box, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  TableSortLabel, TextField, Select, MenuItem, Pagination, Typography,
  CircularProgress, Button,
} from '@mui/material';

/**
 * Reusable Excel-style data table.
 *
 * Columns: array of {
 *   key:        string                  — unique column id
 *   label:      string                  — header text
 *   width?:     number                  — fixed pixel width (recommended)
 *   align?:     'left'|'center'|'right'
 *   sortKey?:   string                  — server ordering key; omit to disable sort
 *   filterKey?: string                  — server filter param name; omit to disable filter
 *   filterType?:'text' | 'bool' | 'select' | 'date'
 *   filterOptions?: [{ value, label }]  — required for filterType:'select'
 *   boolLabels?: { true, false }        — labels for bool filter (default Yes/No)
 *   render:     (row) => ReactNode      — read-only cell renderer
 *   editable?:  boolean                 — show inline editor when cell is focused
 *   editType?:  'text' | 'number' | 'date' | 'select'
 *   editOptions?: [{ value, label }]    — for editType:'select'
 *   getValue?:  (row) => string|number  — value to seed editor (defaults to row[key])
 * }
 *
 * Inline edit: when editable, double-click a cell to edit. onCellEdit(row, key, value)
 * is called when the editor blurs / Enter is pressed and the value changed.
 */
export default function DataTable({
  columns,
  rows,
  getRowId,
  loading = false,
  // pagination
  page = 1,
  pageSize = 25,
  totalCount = 0,
  pageSizeOptions = [25, 50, 100, 200, 500],
  onPageChange,
  onPageSizeChange,
  // filtering
  filters = {},
  onFilterChange,
  // sorting
  sortBy = { key: '', dir: 'asc' },
  onSortChange,
  // inline edit
  onCellEdit,
  // toolbar (top strip) — render arbitrary actions like Export
  toolbar,
  // misc
  onRowClassName,
  emptyIcon,
  emptyMessage = 'No records found',
  height = 'calc(100vh - 220px)',
  minHeight = 560,
  debounceMs = 300,
}) {
  const filterTimeouts = useRef({});
  const [editingCell, setEditingCell] = useState(null); // { id, key }

  const handleFilterInput = (filterKey, value) => {
    clearTimeout(filterTimeouts.current[filterKey]);
    filterTimeouts.current[filterKey] = setTimeout(() => {
      if (onFilterChange) onFilterChange(filterKey, value);
    }, debounceMs);
  };

  const handleSortClick = (sortKey) => {
    if (!sortKey || !onSortChange) return;
    let next;
    if (sortBy.key !== sortKey) next = { key: sortKey, dir: 'asc' };
    else if (sortBy.dir === 'asc') next = { key: sortKey, dir: 'desc' };
    else next = { key: '', dir: 'asc' };
    onSortChange(next);
  };

  const clearAll = () => {
    if (onFilterChange) Object.keys(filters).forEach(k => onFilterChange(k, ''));
    if (onSortChange) onSortChange({ key: '', dir: 'asc' });
  };

  const commitEdit = useCallback((row, col, newValue) => {
    const prev = col.getValue ? col.getValue(row) : row[col.key];
    if (`${prev ?? ''}` !== `${newValue ?? ''}` && onCellEdit) {
      onCellEdit(row, col.key, newValue);
    }
    setEditingCell(null);
  }, [onCellEdit]);

  const hasActiveFilters =
    Object.values(filters).some(v => v !== '' && v != null) || !!sortBy.key;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const hasAnyFilter = columns.some(c => c.filterKey);

  return (
    <Box
      sx={{
        bgcolor: 'background.paper',
        border: 1,
        borderColor: 'divider',
        borderRadius: 2,
        display: 'flex',
        flexDirection: 'column',
        height,
        minHeight,
        overflow: 'hidden',
      }}
    >
      {(toolbar || hasActiveFilters) && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 2, py: 1, borderBottom: 1, borderColor: 'divider', bgcolor: hasActiveFilters ? 'primary.50' : 'grey.50' }}>
          {hasActiveFilters && (
            <Typography variant="caption" color="primary.dark" fontWeight={600}>
              Filters active — showing {totalCount} matching records
            </Typography>
          )}
          <Box sx={{ flex: 1 }} />
          {toolbar}
          {hasActiveFilters && (
            <Button size="small" onClick={clearAll} variant="text">Clear all</Button>
          )}
        </Box>
      )}

      <TableContainer sx={{ flex: 1, overflow: 'auto' }}>
        <Table stickyHeader size="small" sx={{ tableLayout: 'fixed' }}>
          <TableHead>
            <TableRow>
              {columns.map(col => (
                <TableCell
                  key={col.key}
                  align={col.align || 'left'}
                  sx={{
                    width: col.width,
                    minWidth: col.width,
                    bgcolor: 'grey.50',
                    fontWeight: 700,
                    borderBottom: 2,
                    borderColor: 'divider',
                    py: 1,
                  }}
                >
                  {col.sortKey && onSortChange ? (
                    <TableSortLabel
                      active={sortBy.key === col.sortKey}
                      direction={sortBy.key === col.sortKey ? sortBy.dir : 'asc'}
                      onClick={() => handleSortClick(col.sortKey)}
                    >
                      {col.label}
                    </TableSortLabel>
                  ) : col.label}
                </TableCell>
              ))}
            </TableRow>
            {hasAnyFilter && (
              <TableRow>
                {columns.map(col => (
                  <TableCell
                    key={`f-${col.key}`}
                    sx={{
                      width: col.width,
                      minWidth: col.width,
                      bgcolor: 'grey.50',
                      borderBottom: 1,
                      borderColor: 'divider',
                      py: 0.5,
                      px: 1,
                    }}
                  >
                    {col.filterKey && col.filterType === 'text' && (
                      <TextField
                        size="small"
                        fullWidth
                        placeholder="Filter…"
                        defaultValue={filters[col.filterKey] || ''}
                        key={`${col.filterKey}-${filters[col.filterKey] || ''}`}
                        onChange={(e) => handleFilterInput(col.filterKey, e.target.value)}
                        sx={{ '& .MuiInputBase-input': { fontSize: '0.75rem', py: 0.5 } }}
                      />
                    )}
                    {col.filterKey && col.filterType === 'date' && (
                      <TextField
                        size="small"
                        type="date"
                        fullWidth
                        value={filters[col.filterKey] || ''}
                        onChange={(e) => onFilterChange && onFilterChange(col.filterKey, e.target.value)}
                        sx={{ '& .MuiInputBase-input': { fontSize: '0.75rem', py: 0.5 } }}
                      />
                    )}
                    {col.filterKey && col.filterType === 'bool' && (
                      <Select
                        size="small"
                        fullWidth
                        displayEmpty
                        value={filters[col.filterKey] ?? ''}
                        onChange={(e) => onFilterChange && onFilterChange(col.filterKey, e.target.value)}
                        sx={{ fontSize: '0.75rem', '& .MuiSelect-select': { py: 0.5 } }}
                      >
                        <MenuItem value=""><em>All</em></MenuItem>
                        <MenuItem value="true">{col.boolLabels?.true || 'Yes'}</MenuItem>
                        <MenuItem value="false">{col.boolLabels?.false || 'No'}</MenuItem>
                      </Select>
                    )}
                    {col.filterKey && col.filterType === 'select' && (
                      <Select
                        size="small"
                        fullWidth
                        displayEmpty
                        value={filters[col.filterKey] ?? ''}
                        onChange={(e) => onFilterChange && onFilterChange(col.filterKey, e.target.value)}
                        sx={{ fontSize: '0.75rem', '& .MuiSelect-select': { py: 0.5 } }}
                      >
                        <MenuItem value=""><em>All</em></MenuItem>
                        {(col.filterOptions || []).map(opt => (
                          <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
                        ))}
                      </Select>
                    )}
                  </TableCell>
                ))}
              </TableRow>
            )}
          </TableHead>
          <TableBody>
            {loading && rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={columns.length} align="center" sx={{ py: 8 }}>
                  <CircularProgress size={28} />
                </TableCell>
              </TableRow>
            )}
            {!loading && rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={columns.length} align="center" sx={{ py: 8 }}>
                  {emptyIcon}
                  <Typography color="text.secondary">{emptyMessage}</Typography>
                </TableCell>
              </TableRow>
            )}
            {rows.map(row => {
              const id = getRowId ? getRowId(row) : row.id;
              const rowClass = onRowClassName ? onRowClassName(row) : null;
              return (
                <TableRow
                  key={id}
                  hover
                  className={rowClass || undefined}
                  sx={{ '& td': { py: 1 } }}
                >
                  {columns.map(col => {
                    const isEditing = editingCell && editingCell.id === id && editingCell.key === col.key;
                    return (
                      <TableCell
                        key={col.key}
                        align={col.align || 'left'}
                        onDoubleClick={col.editable ? () => setEditingCell({ id, key: col.key }) : undefined}
                        sx={{
                          width: col.width,
                          minWidth: col.width,
                          overflow: 'hidden',
                          cursor: col.editable ? 'cell' : 'default',
                        }}
                      >
                        {isEditing
                          ? <InlineEditor row={row} col={col} onCommit={(v) => commitEdit(row, col, v)} onCancel={() => setEditingCell(null)} />
                          : (col.render ? col.render(row) : row[col.key])}
                      </TableCell>
                    );
                  })}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>

      {onPageChange && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, px: 2, py: 1.25, borderTop: 1, borderColor: 'divider', bgcolor: 'grey.50' }}>
          <Typography variant="caption" color="text.secondary">
            Showing {rows.length === 0 ? 0 : (page - 1) * pageSize + 1}
            –{Math.min(page * pageSize, totalCount)} of {totalCount}
          </Typography>
          <Box sx={{ flex: 1 }} />
          {onPageSizeChange && (
            <>
              <Typography variant="caption" color="text.secondary">Rows per page:</Typography>
              <Select
                size="small"
                value={pageSize}
                onChange={(e) => onPageSizeChange(Number(e.target.value))}
                sx={{ fontSize: '0.8rem' }}
              >
                {pageSizeOptions.map(n => <MenuItem key={n} value={n}>{n}</MenuItem>)}
              </Select>
            </>
          )}
          <Pagination
            page={page}
            count={totalPages}
            onChange={(_, p) => onPageChange(p)}
            size="small"
            shape="rounded"
            showFirstButton
            showLastButton
          />
        </Box>
      )}
    </Box>
  );
}

function InlineEditor({ row, col, onCommit, onCancel }) {
  const initial = col.getValue ? col.getValue(row) : row[col.key];
  const [val, setVal] = useState(initial ?? '');

  const commit = () => onCommit(val);
  const onKey = (e) => {
    if (e.key === 'Enter') commit();
    if (e.key === 'Escape') onCancel();
  };

  if (col.editType === 'select') {
    return (
      <Select
        size="small"
        autoFocus
        open
        value={val}
        onChange={(e) => { setVal(e.target.value); onCommit(e.target.value); }}
        onClose={onCancel}
        fullWidth
        sx={{ fontSize: '0.8rem' }}
      >
        {(col.editOptions || []).map(opt => (
          <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
        ))}
      </Select>
    );
  }

  return (
    <TextField
      size="small"
      autoFocus
      fullWidth
      type={col.editType === 'number' ? 'number' : col.editType === 'date' ? 'date' : 'text'}
      value={val}
      onChange={(e) => setVal(e.target.value)}
      onBlur={commit}
      onKeyDown={onKey}
      sx={{ '& .MuiInputBase-input': { fontSize: '0.8rem', py: 0.5 } }}
    />
  );
}

// ─── Client-side filter + sort helper ──────────────────────────────────────
// Apply filters[col.filterKey] (icontains) and sortBy {key, dir} to a row array.
// Use this in parents that hold all data client-side, then pass the result to <DataTable rows={...}>.
export function applyClientFilters(rows, columns, filters, sortBy) {
  let out = rows;
  for (const col of columns) {
    if (!col.filterKey) continue;
    const v = filters?.[col.filterKey];
    if (v === '' || v == null) continue;
    out = out.filter(r => {
      const raw = col.filterValue ? col.filterValue(r) : r[col.key];
      if (col.filterType === 'bool') return String(!!raw) === String(v);
      return String(raw ?? '').toLowerCase().includes(String(v).toLowerCase());
    });
  }
  if (sortBy?.key) {
    const col = columns.find(c => c.sortKey === sortBy.key);
    const getter = col?.sortValue
      ? col.sortValue
      : (r) => col ? (col.filterValue ? col.filterValue(r) : r[col.key]) : r[sortBy.key];
    out = [...out].sort((a, b) => {
      const va = getter(a); const vb = getter(b);
      if (va == null && vb == null) return 0;
      if (va == null) return 1;
      if (vb == null) return -1;
      const na = Number(va); const nb = Number(vb);
      let cmp;
      if (!isNaN(na) && !isNaN(nb)) cmp = na - nb;
      else cmp = String(va).localeCompare(String(vb));
      return sortBy.dir === 'desc' ? -cmp : cmp;
    });
  }
  return out;
}

// ─── CSV export helper ──────────────────────────────────────────────────────
export function exportRowsToCsv(filename, columns, rows) {
  const headers = columns.filter(c => c.label).map(c => c.label);
  const lines = [headers.join(',')];
  for (const row of rows) {
    const cells = columns.filter(c => c.label).map(c => {
      const v = c.csvValue ? c.csvValue(row) : (c.getValue ? c.getValue(row) : row[c.key]);
      if (v == null) return '';
      const s = String(v).replace(/"/g, '""');
      return /[",\n]/.test(s) ? `"${s}"` : s;
    });
    lines.push(cells.join(','));
  }
  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.csv') ? filename : `${filename}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
