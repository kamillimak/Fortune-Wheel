
import React, { useState } from 'react';
import { Player } from '../types';
import { Plus, Trash2, Users } from 'lucide-react';

interface PlayerInputProps {
  players: Player[];
  onAdd: (name: string) => void;
  onRemove: (id: string) => void;
  disabled: boolean;
}

export const PlayerInput: React.FC<PlayerInputProps> = ({ players, onAdd, onRemove, disabled }) => {
  const [name, setName] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim() && !disabled) {
      onAdd(name.trim());
      setName('');
    }
  };

  return (
    <div className="bg-slate-800/50 backdrop-blur-sm p-6 rounded-2xl border border-slate-700 shadow-lg">
      <div className="flex items-center gap-2 mb-6 text-indigo-400">
        <Users size={24} />
        <h2 className="text-xl font-bold">Manage Players ({players.length}/8)</h2>
      </div>

      <form onSubmit={handleSubmit} className="flex gap-2 mb-6">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Enter player name..."
          disabled={disabled || players.length >= 8}
          className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={disabled || !name.trim() || players.length >= 8}
          className="bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 p-2 rounded-lg transition-colors"
        >
          <Plus size={24} />
        </button>
      </form>

      <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
        {players.map((player) => (
          <div 
            key={player.id} 
            className="flex items-center justify-between bg-slate-900/80 p-3 rounded-lg border border-slate-700 hover:border-indigo-500/50 transition-colors"
          >
            <span className="font-semibold text-slate-200">{player.name}</span>
            {!disabled && (
              <button
                onClick={() => onRemove(player.id)}
                className="text-slate-500 hover:text-rose-500 transition-colors"
              >
                <Trash2 size={18} />
              </button>
            )}
          </div>
        ))}
        {players.length === 0 && (
          <p className="text-center text-slate-500 py-4 italic">No players added yet</p>
        )}
      </div>
      
      {players.length < 8 && !disabled && (
        <p className="text-sm text-slate-400 mt-4 animate-pulse">
          Need {8 - players.length} more players to start the round
        </p>
      )}
    </div>
  );
};
