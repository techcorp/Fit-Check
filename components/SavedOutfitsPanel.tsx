/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React from 'react';
import { SavedOutfit } from '../types';
import { Trash2Icon } from './icons';

interface SavedOutfitsPanelProps {
  savedOutfits: SavedOutfit[];
  onLoadOutfit: (outfit: SavedOutfit) => void;
  onDeleteOutfit: (id: string) => void;
  isLoading: boolean;
}

const SavedOutfitsPanel: React.FC<SavedOutfitsPanelProps> = ({ savedOutfits, onLoadOutfit, onDeleteOutfit, isLoading }) => {
  return (
    <div className="pt-6 border-t border-gray-400/50">
      <h2 className="text-xl font-serif tracking-wider text-gray-800 mb-3">Saved Outfits</h2>
      {savedOutfits.length === 0 ? (
        <p className="text-center text-sm text-gray-500 py-4">You have no saved outfits. Style an outfit and click "Save" to add it here.</p>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {savedOutfits.map((outfit) => (
            <div key={outfit.id} className="relative group border rounded-lg overflow-hidden">
              <img src={outfit.thumbnailUrl} alt={outfit.name} className="w-full h-full object-cover aspect-[2/3]" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/40 to-transparent p-2 flex flex-col justify-end">
                <p className="text-white text-sm font-bold truncate">{outfit.name}</p>
              </div>
              <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => onLoadOutfit(outfit)}
                  disabled={isLoading}
                  className="w-3/4 bg-white text-gray-900 font-semibold py-2 px-3 rounded-md text-sm hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Load Outfit
                </button>
                <button
                  onClick={() => onDeleteOutfit(outfit.id)}
                  disabled={isLoading}
                  className="absolute top-1 right-1 p-1.5 rounded-full bg-black/50 hover:bg-red-600 text-white transition-colors disabled:opacity-50"
                  aria-label={`Delete ${outfit.name}`}
                >
                  <Trash2Icon className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SavedOutfitsPanel;
