import { create } from 'zustand';

export type GanttZoom = 14 | 28 | 56;

interface GanttState {
  zoom: GanttZoom;
  setZoom: (z: GanttZoom) => void;
}

export const useGanttStore = create<GanttState>((set) => ({
  zoom: 28,
  setZoom: (zoom) => set({ zoom }),
}));
