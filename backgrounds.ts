/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import { Background } from './types';

// Default background options hosted for easy access
export const defaultBackgrounds: Background[] = [
  {
    id: 'studio',
    name: 'Neutral Studio',
    thumbnailUrl: 'https://storage.googleapis.com/gemini-95-icons/background-studio.jpg',
    prompt: 'a clean, neutral studio backdrop (light gray, #f0f0f0)',
  },
  {
    id: 'outdoor-cafe',
    name: 'Outdoor Cafe',
    thumbnailUrl: 'https://storage.googleapis.com/gemini-95-icons/background-cafe.jpg',
    prompt: 'a blurry, sun-drenched outdoor cafe patio with green plants in the background, creating a soft bokeh effect',
  },
  {
    id: 'city-street',
    name: 'City Street',
    thumbnailUrl: 'https://storage.googleapis.com/gemini-95-icons/background-city.jpg',
    prompt: 'a vibrant, slightly blurred city street scene during the day, with architectural details and soft light',
  },
  {
    id: 'abstract',
    name: 'Abstract',
    thumbnailUrl: 'https://storage.googleapis.com/gemini-95-icons/background-gradient.jpg',
    prompt: 'a minimal, abstract background with a soft, tasteful gradient of pastel colors (light peach to soft lavender)',
  },
];
