'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface ActiveBusinessState {
  activeBusinessId: string | null;
  setActiveBusinessId: (id: string | null) => void;
}

/**
 * Persists the operator's currently selected business to localStorage so it
 * survives navigation and reloads. This is purely a UI convenience — every
 * server-side query still re-verifies membership via Row Level Security, so
 * this value is never trusted as an access-control decision on its own.
 */
export const useActiveBusiness = create<ActiveBusinessState>()(
  persist(
    (set) => ({
      activeBusinessId: null,
      setActiveBusinessId: (id) => set({ activeBusinessId: id }),
    }),
    { name: 'blueprint-active-business' }
  )
);
