import { useEffect, useState } from 'react';
import api from 'utils/api';

export const STATUS_FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'pending', label: 'Pending' },
  { key: 'approved', label: 'Approved' },
  { key: 'rejected', label: 'Rejected' },
  { key: 'cancelled', label: 'Cancelled' },
];

export const statusChipColor = (s) => {
  if (s === 'approved') return 'success';
  if (s === 'rejected') return 'error';
  if (s === 'pending') return 'warning';
  return 'default';
};

export const getInitials = (name = '') =>
  name.trim().split(' ').slice(0, 2).map((w) => w[0]).join('').toUpperCase() || '?';

/** Fetch the current user's assigned outlets. */
export function useUserOutlets() {
  const [outlets, setOutlets] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await api.get('/api/user/');
        if (!cancelled) setOutlets(res.data.outlets || []);
      } catch (err) {
        if (!cancelled) setError('Failed to load your outlets.');
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return { outlets, error };
}

/** Fetch employees whose PRIMARY outlet equals outletId.
 *  When startDate + endDate are supplied, the backend restricts the list to
 *  employees who were active for at least 1 day in the range, and adds
 *  active_days / range_days / fully_active metadata. Pass both dates or
 *  neither — passing only one is treated as "not ready" (empty list) so the
 *  caller can disable the Employee dropdown until dates are set.
 */
export function usePrimaryOutletEmployees(outletId, startDate, endDate) {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!outletId) {
      setEmployees([]);
      return;
    }
    if ((startDate && !endDate) || (endDate && !startDate)) {
      setEmployees([]);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const params = { outlet_id: outletId };
        if (startDate && endDate) {
          params.start_date = startDate;
          params.end_date = endDate;
        }
        const res = await api.get('/api/primary-outlet-employees/', { params });
        if (!cancelled) setEmployees(res.data || []);
      } catch (err) {
        if (!cancelled) setEmployees([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [outletId, startDate, endDate]);

  return { employees, loading };
}

/** Fetch all active leave types. */
export function useLeaveTypes() {
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await api.get('/api/leavetypes/');
        if (!cancelled) setLeaveTypes((res.data || []).filter((t) => t.active !== false));
      } catch (err) {
        if (!cancelled) setLeaveTypes([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return { leaveTypes, loading };
}