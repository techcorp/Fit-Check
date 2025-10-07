/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import StartScreen from './components/StartScreen';
import Canvas from './components/Canvas';
import WardrobePanel from './components/WardrobeModal';
import OutfitStack from './components/OutfitStack';
import { generateVirtualTryOnImage, generatePoseVariation, changeBackgroundImage } from './services/geminiService';
import { OutfitLayer, WardrobeItem, SavedOutfit, Background } from './types';
import { ChevronDownIcon, ChevronUpIcon } from './components/icons';
import { defaultWardrobe } from './wardrobe';
import { defaultBackgrounds } from './backgrounds';
import Footer from './components/Footer';
import { getFriendlyErrorMessage, urlToFile } from './lib/utils';
import Spinner from './components/Spinner';
import SavedOutfitsPanel from './components/SavedOutfitsPanel';
import BackgroundPanel from './components/BackgroundPanel';

const POSE_INSTRUCTIONS = [
  "Full frontal view, hands on hips",
  "Slightly turned, 3/4 view",
  "Side profile view",
  "Jumping in the air, mid-action shot",
  "Walking towards camera",
  "Leaning against a wall",
];

const SAVED_OUTFITS_KEY = 'virtual-try-on-saved-outfits';

const useMediaQuery = (query: string): boolean => {
  const [matches, setMatches] = useState(() => window.matchMedia(query).matches);

  useEffect(() => {
    const mediaQueryList = window.matchMedia(query);
    const listener = (event: MediaQueryListEvent) => setMatches(event.matches);

    mediaQueryList.addEventListener('change', listener);
    
    if (mediaQueryList.matches !== matches) {
      setMatches(mediaQueryList.matches);
    }

    return () => {
      mediaQueryList.removeEventListener('change', listener);
    };
  }, [query, matches]);

  return matches;
};


const App: React.FC = () => {
  const [modelImageUrl, setModelImageUrl] = useState<string | null>(null);
  const [outfitHistory, setOutfitHistory] = useState<OutfitLayer[]>([]);
  const [currentOutfitIndex, setCurrentOutfitIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [currentPoseIndex, setCurrentPoseIndex] = useState(0);
  const [isSheetCollapsed, setIsSheetCollapsed] = useState(false);
  const [wardrobe, setWardrobe] = useState<WardrobeItem[]>(defaultWardrobe);
  const [savedOutfits, setSavedOutfits] = useState<SavedOutfit[]>([]);
  const [currentBackgroundId, setCurrentBackgroundId] = useState<string>(defaultBackgrounds[0].id);
  const isMobile = useMediaQuery('(max-width: 767px)');

  useEffect(() => {
    try {
      const storedOutfits = localStorage.getItem(SAVED_OUTFITS_KEY);
      if (storedOutfits) {
        setSavedOutfits(JSON.parse(storedOutfits));
      }
    } catch (error) {
      console.error("Failed to load saved outfits from localStorage", error);
    }
  }, []);

  const activeOutfitLayers = useMemo(() => 
    outfitHistory.slice(0, currentOutfitIndex + 1), 
    [outfitHistory, currentOutfitIndex]
  );
  
  const activeGarmentIds = useMemo(() => 
    activeOutfitLayers.map(layer => layer.garment?.id).filter(Boolean) as string[], 
    [activeOutfitLayers]
  );
  
  const displayImageUrl = useMemo(() => {
    if (outfitHistory.length === 0) return modelImageUrl;
    const currentLayer = outfitHistory[currentOutfitIndex];
    if (!currentLayer) return modelImageUrl;

    const poseInstruction = POSE_INSTRUCTIONS[currentPoseIndex];
    return currentLayer.poseImages[poseInstruction] ?? Object.values(currentLayer.poseImages)[0];
  }, [outfitHistory, currentOutfitIndex, currentPoseIndex, modelImageUrl]);

  const availablePoseKeys = useMemo(() => {
    if (outfitHistory.length === 0) return [];
    const currentLayer = outfitHistory[currentOutfitIndex];
    return currentLayer ? Object.keys(currentLayer.poseImages) : [];
  }, [outfitHistory, currentOutfitIndex]);

  const currentBackground = useMemo(() => 
    defaultBackgrounds.find(bg => bg.id === currentBackgroundId) || defaultBackgrounds[0],
    [currentBackgroundId]
  );

  const handleModelFinalized = (url: string) => {
    setModelImageUrl(url);
    setOutfitHistory([{
      garment: null,
      poseImages: { [POSE_INSTRUCTIONS[0]]: url }
    }]);
    setCurrentOutfitIndex(0);
  };

  const handleStartOver = () => {
    setModelImageUrl(null);
    setOutfitHistory([]);
    setCurrentOutfitIndex(0);
    setIsLoading(false);
    setLoadingMessage('');
    setError(null);
    setCurrentPoseIndex(0);
    setIsSheetCollapsed(false);
    setWardrobe(defaultWardrobe);
    setCurrentBackgroundId(defaultBackgrounds[0].id);
  };

  const handleGarmentSelect = useCallback(async (garmentFile: File, garmentInfo: WardrobeItem) => {
    if (!displayImageUrl || isLoading) return;

    const nextLayer = outfitHistory[currentOutfitIndex + 1];
    if (nextLayer && nextLayer.garment?.id === garmentInfo.id) {
        setCurrentOutfitIndex(prev => prev + 1);
        setCurrentPoseIndex(0);
        return;
    }

    setError(null);
    setIsLoading(true);
    setLoadingMessage(`Adding ${garmentInfo.name}...`);

    try {
      const newImageUrl = await generateVirtualTryOnImage(displayImageUrl, garmentFile, currentBackground.prompt);
      const currentPoseInstruction = POSE_INSTRUCTIONS[currentPoseIndex];
      
      const newLayer: OutfitLayer = { 
        garment: garmentInfo, 
        poseImages: { [currentPoseInstruction]: newImageUrl } 
      };

      setOutfitHistory(prevHistory => {
        const newHistory = prevHistory.slice(0, currentOutfitIndex + 1);
        return [...newHistory, newLayer];
      });
      setCurrentOutfitIndex(prev => prev + 1);
      
      setWardrobe(prev => {
        if (prev.find(item => item.id === garmentInfo.id)) {
            return prev;
        }
        return [...prev, garmentInfo];
      });
    } catch (err) {
      setError(getFriendlyErrorMessage(err, 'Failed to apply garment'));
    } finally {
      setIsLoading(false);
      setLoadingMessage('');
    }
  }, [displayImageUrl, isLoading, currentPoseIndex, outfitHistory, currentOutfitIndex, currentBackground.prompt]);

  const handleRemoveLastGarment = () => {
    if (currentOutfitIndex > 0) {
      setCurrentOutfitIndex(prevIndex => prevIndex - 1);
      setCurrentPoseIndex(0);
    }
  };
  
  const handlePoseSelect = useCallback(async (newIndex: number) => {
    if (isLoading || outfitHistory.length === 0 || newIndex === currentPoseIndex) return;
    
    const poseInstruction = POSE_INSTRUCTIONS[newIndex];
    const currentLayer = outfitHistory[currentOutfitIndex];

    if (currentLayer.poseImages[poseInstruction]) {
      setCurrentPoseIndex(newIndex);
      return;
    }

    const baseImageForPoseChange = Object.values(currentLayer.poseImages)[0];
    if (!baseImageForPoseChange) return;

    setError(null);
    setIsLoading(true);
    setLoadingMessage(`Changing pose...`);
    
    const prevPoseIndex = currentPoseIndex;
    setCurrentPoseIndex(newIndex);

    try {
      const newImageUrl = await generatePoseVariation(baseImageForPoseChange, poseInstruction, currentBackground.prompt);
      setOutfitHistory(prevHistory => {
        const newHistory = [...prevHistory];
        const updatedLayer = newHistory[currentOutfitIndex];
        updatedLayer.poseImages[poseInstruction] = newImageUrl;
        return newHistory;
      });
    } catch (err) {
      setError(getFriendlyErrorMessage(err, 'Failed to change pose'));
      setCurrentPoseIndex(prevPoseIndex);
    } finally {
      setIsLoading(false);
      setLoadingMessage('');
    }
  }, [currentPoseIndex, outfitHistory, isLoading, currentOutfitIndex, currentBackground.prompt]);

  const handleBackgroundChange = useCallback(async (newBackgroundId: string) => {
    const selectedBg = defaultBackgrounds.find(bg => bg.id === newBackgroundId);
    if (!selectedBg || isLoading || currentBackgroundId === newBackgroundId || outfitHistory.length === 0) {
      return;
    }
  
    setError(null);
    setIsLoading(true);
    setLoadingMessage(`Changing background to ${selectedBg.name}...`);
  
    const prevBackgroundId = currentBackgroundId;
    setCurrentBackgroundId(newBackgroundId);
  
    try {
      const currentLayer = outfitHistory[currentOutfitIndex];
      const currentPoseInstruction = POSE_INSTRUCTIONS[currentPoseIndex];
      const baseImageForBgChange = currentLayer.poseImages[currentPoseInstruction] ?? Object.values(currentLayer.poseImages)[0];
  
      if (!baseImageForBgChange) {
        throw new Error("No valid base image found to change background.");
      }
  
      const newImageUrl = await changeBackgroundImage(baseImageForBgChange, selectedBg.prompt);
  
      setOutfitHistory(prevHistory => {
        const newHistory = [...prevHistory];
        const updatedLayer = { ...newHistory[currentOutfitIndex] };
        // Resetting poses for this layer, as old poses have the wrong background.
        // The new image for the current pose is now the only one.
        updatedLayer.poseImages = { [currentPoseInstruction]: newImageUrl };
        newHistory[currentOutfitIndex] = updatedLayer;
        return newHistory;
      });
    } catch (err) {
      setError(getFriendlyErrorMessage(err, 'Failed to change background'));
      setCurrentBackgroundId(prevBackgroundId); // Revert on error
    } finally {
      setIsLoading(false);
      setLoadingMessage('');
    }
  }, [isLoading, currentBackgroundId, outfitHistory, currentOutfitIndex, currentPoseIndex]);

  const handleSaveOutfit = useCallback(() => {
    if (activeOutfitLayers.length <= 1 || !displayImageUrl) {
      return;
    }
    
    const newSavedOutfit: SavedOutfit = {
      id: Date.now().toString(),
      name: `Outfit ${savedOutfits.length + 1}`,
      thumbnailUrl: displayImageUrl,
      layers: activeOutfitLayers.map(layer => layer.garment),
    };

    setSavedOutfits(prev => {
      const updatedOutfits = [...prev, newSavedOutfit];
      try {
        localStorage.setItem(SAVED_OUTFITS_KEY, JSON.stringify(updatedOutfits));
      } catch (error) {
        console.error("Failed to save outfits to localStorage", error);
        setError("Could not save outfit. Storage might be full.");
      }
      return updatedOutfits;
    });

  }, [activeOutfitLayers, displayImageUrl, savedOutfits.length]);

  const handleDeleteOutfit = useCallback((idToDelete: string) => {
    setSavedOutfits(prev => {
      const updatedOutfits = prev.filter(outfit => outfit.id !== idToDelete);
      try {
        localStorage.setItem(SAVED_OUTFITS_KEY, JSON.stringify(updatedOutfits));
      } catch (error) {
        console.error("Failed to update saved outfits in localStorage", error);
      }
      return updatedOutfits;
    });
  }, []);

  const handleLoadOutfit = useCallback(async (outfitToLoad: SavedOutfit) => {
    if (isLoading || !modelImageUrl) return;

    setError(null);
    setIsLoading(true);
    setCurrentBackgroundId(defaultBackgrounds[0].id); // Reset to default background

    try {
      let currentImageUrl = modelImageUrl;
      const newHistory: OutfitLayer[] = [{
        garment: null,
        poseImages: { [POSE_INSTRUCTIONS[0]]: modelImageUrl }
      }];

      const garmentsToApply = outfitToLoad.layers.filter(l => l !== null) as WardrobeItem[];
      
      for (let i = 0; i < garmentsToApply.length; i++) {
        const garment = garmentsToApply[i];
        setLoadingMessage(`Applying ${garment.name}... (${i + 1}/${garmentsToApply.length})`);

        const garmentFile = await urlToFile(garment.url, garment.name);
        // Loading an outfit uses the default background for consistency
        const newImageUrl = await generateVirtualTryOnImage(currentImageUrl, garmentFile, defaultBackgrounds[0].prompt);
        
        const newLayer: OutfitLayer = {
            garment: garment,
            poseImages: { [POSE_INSTRUCTIONS[0]]: newImageUrl }
        };
        newHistory.push(newLayer);
        currentImageUrl = newImageUrl;
      }
      
      setOutfitHistory(newHistory);
      setCurrentOutfitIndex(newHistory.length - 1);
      setCurrentPoseIndex(0);

    } catch (err) {
      setError(getFriendlyErrorMessage(err, 'Failed to load outfit'));
    } finally {
      setIsLoading(false);
      setLoadingMessage('');
    }
  }, [isLoading, modelImageUrl]);

  const viewVariants = {
    initial: { opacity: 0, y: 15 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -15 },
  };

  return (
    <div className="font-sans">
      <AnimatePresence mode="wait">
        {!modelImageUrl ? (
          <motion.div
            key="start-screen"
            className="w-screen min-h-screen flex items-start sm:items-center justify-center bg-gray-50 p-4 pb-20"
            variants={viewVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ duration: 0.5, ease: 'easeInOut' }}
          >
            <StartScreen onModelFinalized={handleModelFinalized} />
          </motion.div>
        ) : (
          <motion.div
            key="main-app"
            className="relative flex flex-col h-screen bg-white overflow-hidden"
            variants={viewVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ duration: 0.5, ease: 'easeInOut' }}
          >
            <main className="flex-grow relative flex flex-col md:flex-row overflow-hidden">
              <div className="w-full h-full flex-grow flex items-center justify-center bg-white pb-16 relative">
                <Canvas 
                  displayImageUrl={displayImageUrl}
                  onStartOver={handleStartOver}
                  isLoading={isLoading}
                  loadingMessage={loadingMessage}
                  onSelectPose={handlePoseSelect}
                  poseInstructions={POSE_INSTRUCTIONS}
                  currentPoseIndex={currentPoseIndex}
                  availablePoseKeys={availablePoseKeys}
                />
              </div>

              <aside 
                className={`absolute md:relative md:flex-shrink-0 bottom-0 right-0 h-auto md:h-full w-full md:w-1/3 md:max-w-sm bg-white/80 backdrop-blur-md flex flex-col border-t md:border-t-0 md:border-l border-gray-200/60 transition-transform duration-500 ease-in-out ${isSheetCollapsed ? 'translate-y-[calc(100%-4.5rem)]' : 'translate-y-0'} md:translate-y-0`}
                style={{ transitionProperty: 'transform' }}
              >
                  <button 
                    onClick={() => setIsSheetCollapsed(!isSheetCollapsed)} 
                    className="md:hidden w-full h-8 flex items-center justify-center bg-gray-100/50"
                    aria-label={isSheetCollapsed ? 'Expand panel' : 'Collapse panel'}
                  >
                    {isSheetCollapsed ? <ChevronUpIcon className="w-6 h-6 text-gray-500" /> : <ChevronDownIcon className="w-6 h-6 text-gray-500" />}
                  </button>
                  <div className="p-4 md:p-6 pb-20 overflow-y-auto flex-grow flex flex-col gap-8">
                    {error && (
                      <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-4 rounded-md" role="alert">
                        <p className="font-bold">Error</p>
                        <p>{error}</p>
                      </div>
                    )}
                    <OutfitStack 
                      outfitHistory={activeOutfitLayers}
                      onRemoveLastGarment={handleRemoveLastGarment}
                      onSaveOutfit={handleSaveOutfit}
                      isLoading={isLoading}
                    />
                    <WardrobePanel
                      onGarmentSelect={handleGarmentSelect}
                      activeGarmentIds={activeGarmentIds}
                      isLoading={isLoading}
                      wardrobe={wardrobe}
                    />
                    <BackgroundPanel
                      backgrounds={defaultBackgrounds}
                      selectedBackgroundId={currentBackgroundId}
                      onBackgroundSelect={handleBackgroundChange}
                      isLoading={isLoading}
                    />
                    <SavedOutfitsPanel
                      savedOutfits={savedOutfits}
                      onLoadOutfit={handleLoadOutfit}
                      onDeleteOutfit={handleDeleteOutfit}
                      isLoading={isLoading}
                    />
                  </div>
              </aside>
            </main>
            <AnimatePresence>
              {isLoading && isMobile && (
                <motion.div
                  className="fixed inset-0 bg-white/80 backdrop-blur-md flex flex-col items-center justify-center z-50"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <Spinner />
                  {loadingMessage && (
                    <p className="text-lg font-serif text-gray-700 mt-4 text-center px-4">{loadingMessage}</p>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
      <Footer isOnDressingScreen={!!modelImageUrl} />
    </div>
  );
};

export default App;
