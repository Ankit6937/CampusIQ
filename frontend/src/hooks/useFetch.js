import { useCallback, useEffect, useState } from 'react';

/** Runs an async function, tracks loading/error state and exposes reload(). */
export default function useFetch(fn, deps = []) {
  const [state, setState] = useState({ data: null, loading: true, error: null });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const load = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: null }));
    try { setState({ data: await fn(), loading: false, error: null }); }
    catch (e) { setState({ data: null, loading: false, error: e.friendly || e.message }); }
  }, deps);
  useEffect(() => { load(); }, [load]);
  return { ...state, reload: load };
}
