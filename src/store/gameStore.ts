import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface GameMetadata {
  id: string;
  name: string;
  createdAt: number;
  lastPlayedAt: number;
  hasPdf: boolean;
}

interface GameState {
  games: GameMetadata[];
  addGame: (game: GameMetadata) => void;
  updateGame: (id: string, updates: Partial<GameMetadata>) => void;
  deleteGame: (id: string) => void;
  getGame: (id: string) => GameMetadata | undefined;
  // Search state
  lastSearchQuery: string;
  lastSearchResults: string[];
  setLastSearch: (query: string, results: string[]) => void;
}

export const useGameStore = create<GameState>()(
  persist(
    (set, get) => ({
      games: [],
      // Search state initial values
      lastSearchQuery: '',
      lastSearchResults: [],
      
      addGame: (game) =>
        set((state) => ({
          games: [game, ...state.games],
        })),
      updateGame: (id, updates) =>
        set((state) => ({
          games: state.games.map((g) =>
            g.id === id ? { ...g, ...updates } : g
          ),
        })),
      deleteGame: (id) =>
        set((state) => ({
          games: state.games.filter((g) => g.id !== id),
        })),
      getGame: (id) => get().games.find((g) => g.id === id),
      setLastSearch: (query, results) => 
        set(() => ({
          lastSearchQuery: query,
          lastSearchResults: results
        })),
    }),
    {
      name: 'boardgame-teacher-games',
    }
  )
);
