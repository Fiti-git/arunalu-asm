import React, { useRef } from 'react';
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
 *   filterType?:'text' | 'bool' | 'select'
 *   filterOptions?: [{ value, label }]  — required for filterType:'select'
 *   boolLabels?: { true, false }        — labels for bool filter (default Yes/No)
 *   render:     (row) => ReactNode      — cell renderer
 * }
 *
 * Filters/sorting/pagination are fully controlled — parent owns state and fetches data.
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
  // misc
  onRowClassName,
  emptyIcon,
  emptyMessage = 'No records found',
  height = 'calc(100vh - 220px)',
  minHeight = 560,
  debounceMs = 300,
}) {
  const filterTimeouts = useRef({});

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
      {hasActiveFilters && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 2, py: 1, borderBottom: 1, borderColor: 'divider', bgcolor: 'primary.50' }}>
          <Typography variant="caption" color="primary.dark" fontWeight={600}>
            Filters active — showing {totalCount} matching records
          </Typography>
          <Box sx={{ flex: 1 }} />
          <Button size="small" onClick={clearAll} variant="text">Clear all</Button>
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
                  {columns.map(col => (
                    <TableCell
                      key={col.key}
                      align={col.align || 'left'}
                      sx={{ width: col.width, minWidth: col.width, overflow: 'hidden' }}
                    >
                      {col.render ? col.render(row) : row[col.key]}
                    </TableCell>
                  ))}
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
