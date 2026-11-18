/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {useCallback, useEffect, useRef, useState} from 'react';
import {Plus} from 'lucide-react';
import {SolarTrackStage} from './components/SolarTrackStage';
import {SolarPostcard} from './components/SolarPostcard';
import {StationMusicToy} from './components/StationMusicToy';
import {BirthdayCakeSection} from './components/BirthdayCakeSection';
import {StreetBioscope} from './components/StreetBioscope';
import {NotesAppOverlay} from './components/notes/NotesAppOverlay';

export default function App() {
  const [lapCompleted, setLapCompleted] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [notesOpen, setNotesOpen] = useState(false);
  const savedScrollYRef = useRef(0);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(mq.matches);

    const handleChange = (event: MediaQueryListEvent) => {
      setReducedMotion(event.matches);
    };

    mq.addEventListener('change', handleChange);
    return () => mq.removeEventListener('change', handleChange);
  }, []);

  const handleOpenNotes = () => {
    savedScrollYRef.current = window.scrollY;
    document.body.style.overflow = 'hidden';
    setNotesOpen(true);
  };

  const handleCloseNotes = useCallback(() => {
    setNotesOpen(false);
    document.body.style.overflow = '';
    const restoreY = savedScrollYRef.current;
    window.requestAnimationFrame(() => {
      window.scrollTo({top: restoreY, behavior: 'auto'});
    });
  }, []);

  useEffect(() => {
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  const handleCompleteLap = () => {
    setLapCompleted(true);
  };

  return (
    <div className="relative min-h-screen sunlit-canvas text-[#1D252B]">
      {/* Subtle 35mm analog film grain texture */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-30 film-grain-layer"
      />

      {/* Discreet burgundy '+' entry point for personal notes in the top-right corner */}
      <button
        type="button"
        onClick={handleOpenNotes}
        aria-label="Open personal notes"
        title="My Notes"
        className="absolute top-2.5 right-2.5 sm:top-4 sm:right-5 z-20 inline-flex h-11 w-11 items-center justify-center bg-transparent border-0 p-0 text-[#97282E] transition-transform duration-150 hover:scale-110 hover:text-[#7D2025] active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#97282E]"
      >
        <Plus className="h-5 w-5 stroke-[2.2]" aria-hidden="true" />
      </button>

      {/* Main Sunlit Hill-Station World */}
      <main
        id="top"
        className="relative z-10 mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-10 lg:px-8 space-y-8 sm:space-y-10"
      >
        {/* 1. Interactive Toy-Train Solar Track */}
        <div id="solar-track" className="scroll-mt-6">
          <SolarTrackStage
            lapCompleted={lapCompleted}
            onCompleteLap={handleCompleteLap}
            reducedMotion={reducedMotion}
          />
        </div>

        {/* 2. Playable Tilagor Harmonium */}
        <div id="harmonium" className="scroll-mt-6">
          <StationMusicToy reducedMotion={reducedMotion} />
        </div>

        {/* 3. Birthday Message & HSC Luggage Tag */}
        <div id="message" className="scroll-mt-6">
          <SolarPostcard lapCompleted={lapCompleted} />
        </div>

        {/* 4. Interactive Birthday Cake */}
        <div id="birthday-cake" className="scroll-mt-6">
          <BirthdayCakeSection reducedMotion={reducedMotion} />
        </div>

        {/* 5. Old Kolkata Street Bioscope (YouTube Video Reel) */}
        <div id="bioscope" className="scroll-mt-6">
          <StreetBioscope reducedMotion={reducedMotion} />
        </div>

        {/* Parting Musical Note below the video, above the footer */}
        <div className="flex justify-center pt-1">
          <p className="rounded-2xl border border-[#1D252B]/16 bg-[#FDFCFA] px-6 py-4 sm:px-8 sm:py-5 text-center text-base sm:text-lg font-medium tracking-wide leading-relaxed text-[#1D252B] shadow-[0_12px_32px_-22px_rgba(29,37,43,0.32)]">
            তারে বলে দিও গামাপা মাগারে Happy Birthday🥀
          </p>
        </div>
      </main>

      {/* Discreet Credit Footer */}
      <footer className="relative z-10 mx-auto max-w-5xl px-4 pb-10 pt-4 sm:px-6 lg:px-8">
        <div className="border-t border-[#1D252B]/20 pt-6 flex items-center justify-center text-xs font-medium text-[#1D252B]">
          <span>A little birthday thing</span>
        </div>
      </footer>

      {/* Personal Notebook Overlay (mounted persistently to preserve localStorage autosave) */}
      <NotesAppOverlay
        isOpen={notesOpen}
        onClose={handleCloseNotes}
        reducedMotion={reducedMotion}
      />
    </div>
  );
}
