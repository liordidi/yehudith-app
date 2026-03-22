// useCandle.js
// Shared memorial candle counter backed by Supabase.
//
// - Initial count loaded from public.memorial_candles where id = 'main'
// - Increment calls an RPC that atomically updates the row server-side
// - Realtime subscription keeps all connected browsers in sync

import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

const CANDLE_ID = 'main';

export function useCandle() {
  const [count,   setCount]   = useState(null); // null = still loading
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // ── Initial fetch ────────────────────────────────────────────────────────
    supabase
      .from('memorial_candles')
      .select('count')
      .eq('id', CANDLE_ID)
      .single()
      .then(({ data, error }) => {
        if (error) {
          console.error('[candle] initial fetch failed:', error.message);
        } else {
          setCount(data.count);
        }
        setLoading(false);
      });

    // ── Realtime subscription ────────────────────────────────────────────────
    const channel = supabase
      .channel('memorial_candles_main')
      .on(
        'postgres_changes',
        {
          event:  'UPDATE',
          schema: 'public',
          table:  'memorial_candles',
          filter: `id=eq.${CANDLE_ID}`,
        },
        (payload) => {
          setCount(payload.new.count);
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  // ── Increment ────────────────────────────────────────────────────────────────
  // Calls a server-side RPC that atomically does UPDATE … SET count = count + 1
  // and returns the updated row. The realtime subscription will also fire, but
  // applying the RPC result directly gives immediate local feedback.
  const increment = async () => {
    const { data, error } = await supabase.rpc('increment_memorial_candle', {
      p_id: CANDLE_ID,
    });
    if (error) {
      console.error('[candle] increment failed:', error.message);
    } else if (data?.count != null) {
      setCount(data.count);
    }
  };

  return { count, loading, increment };
}
