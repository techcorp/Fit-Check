/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React from 'react';
import { Background } from '../types';
import { CheckCircleIcon, ImageIcon } from './icons';

interface BackgroundPanelProps {
  backgrounds: Background[];
  selectedBackgroundId: string;
  onBackgroundSelect: (id: string) => void;
  isLoading: boolean;
}

const BackgroundPanel: React.FC<BackgroundPanelProps> = ({ backgrounds, selectedBackgroundId, onBackgroundSelect, isLoading }) => {
  return (
    <div className="pt-6 border-t border-gray-400/50">
      <h2 className="text-xl font-serif tracking-wider text-gray-800 mb-3 flex items-center">
        <ImageIcon className="w-5 h-5 mr-2" />
        Background
      </h2>
      <div className="grid grid-cols-4 gap-2">
        {backgrounds.map((bg) => {
          const isSelected = bg.id === selectedBackgroundId;
          return (
            <button
              key={bg.id}
              onClick={() => onBackgroundSelect(bg.id)}
              disabled={isLoading || isSelected}
              className="relative aspect-video border rounded-lg overflow-hidden transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-800 group disabled:cursor-not-allowed"
              aria-label={`Select ${bg.name} background`}
            >
              <img src={bg.thumbnailUrl} alt={bg.name} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-black/40 flex items-end justify-center p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <p className="text-white text-[10px] font-bold text-center leading-tight">{bg.name}</p>
              </div>
              {isSelected && (
                <div className="absolute inset-0 bg-gray-900/70 border-2 border-white rounded-[6px] flex items-center justify-center">
                  <CheckCircleIcon className="w-6 h-6 text-white" />
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default BackgroundPanel;
