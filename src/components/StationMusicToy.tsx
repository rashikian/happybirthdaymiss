import React, {useEffect, useState} from 'react';
import {Play, Square} from 'lucide-react';
import {HarmoniumNoteEvent, stationAudio} from '../utils/stationAudio';

interface HarmoniumKey {
  id: string;
  sargam: string;
  freq: number;
}

// Authentic reed layout covering the complete passage range: Sa (C4) through Re′ (D5)
const NATURAL_KEYS: HarmoniumKey[] = [
  {id: 'Sa', sargam: 'Sa', freq: 261.63},
  {id: 'Re', sargam: 'Re', freq: 293.66},
  {id: 'Ga', sargam: 'Ga', freq: 329.63},
  {id: 'Ma', sargam: 'Ma', freq: 349.23},
  {id: 'Pa', sargam: 'Pa', freq: 392.0},
  {id: 'Dha', sargam: 'Dha', freq: 440.0},
  {id: 'Ni', sargam: 'Ni', freq: 493.88},
  {id: 'Sa2', sargam: 'Sa′', freq: 523.25},
  {id: 'Re2', sargam: 'Re′', freq: 587.33},
];

const KOMAL_NI_KEY: HarmoniumKey = {
  id: 'KomalNi',
  sargam: 'Ni♭',
  freq: 466.16,
};

// Exact Dadra swaralipi transcription (48 beats, both lines as one continuous melody)
const PASSAGE_EVENTS: HarmoniumNoteEvent[] = [
  // Pickup: Sa Re
  {noteId: 'Sa', freq: 261.63, startBeat: 0, durationBeats: 1},
  {noteId: 'Re', freq: 293.66, startBeat: 1, durationBeats: 1},

  // Bar 1: Ga Ga Ga
  {noteId: 'Ga', freq: 329.63, startBeat: 2, durationBeats: 1},
  {noteId: 'Ga', freq: 329.63, startBeat: 3, durationBeats: 1},
  {noteId: 'Ga', freq: 329.63, startBeat: 4, durationBeats: 1},

  // Bar 2: Ga Ga Ga
  {noteId: 'Ga', freq: 329.63, startBeat: 5, durationBeats: 1},
  {noteId: 'Ga', freq: 329.63, startBeat: 6, durationBeats: 1},
  {noteId: 'Ga', freq: 329.63, startBeat: 7, durationBeats: 1},

  // Bar 3: Ga-Ma -Pa -Ga
  {noteId: 'Ga', freq: 329.63, startBeat: 8, durationBeats: 0.5},
  {noteId: 'Ma', freq: 349.23, startBeat: 8.5, durationBeats: 1},
  {noteId: 'Pa', freq: 392.0, graceFreq: 329.63, startBeat: 9.5, durationBeats: 1},
  {noteId: 'Ga', freq: 329.63, graceFreq: 349.23, startBeat: 10.5, durationBeats: 0.5},

  // Bar 4: (Ga)Re - Re
  {noteId: 'Re', freq: 293.66, graceFreq: 329.63, startBeat: 11, durationBeats: 2},
  {noteId: 'Re', freq: 293.66, startBeat: 13, durationBeats: 1},

  // Bar 5: Re -Ga (Ga)Re
  {noteId: 'Re', freq: 293.66, startBeat: 14, durationBeats: 1.5},
  {noteId: 'Ga', freq: 329.63, startBeat: 15.5, durationBeats: 0.5},
  {noteId: 'Re', freq: 293.66, graceFreq: 329.63, startBeat: 16, durationBeats: 1},

  // Bar 6: Re -Pa (Pa)Ma
  {noteId: 'Re', freq: 293.66, startBeat: 17, durationBeats: 1.5},
  {noteId: 'Pa', freq: 392.0, startBeat: 18.5, durationBeats: 0.5},
  {noteId: 'Ma', freq: 349.23, graceFreq: 392.0, startBeat: 19, durationBeats: 1},

  // Bar 7 + Bar 8: (Dha)Pa - - | - Ga Ma
  {noteId: 'Pa', freq: 392.0, graceFreq: 440.0, startBeat: 20, durationBeats: 4},
  {noteId: 'Ga', freq: 329.63, startBeat: 24, durationBeats: 1},
  {noteId: 'Ma', freq: 349.23, startBeat: 25, durationBeats: 1},

  // Bar 9: Pa - (Pa)Sa′
  {noteId: 'Pa', freq: 392.0, startBeat: 26, durationBeats: 2},
  {noteId: 'Sa2', freq: 523.25, graceFreq: 392.0, startBeat: 28, durationBeats: 1},

  // Bar 10: (Sa′)Ni -Re′ (Re′)Sa′
  {noteId: 'Ni', freq: 493.88, graceFreq: 523.25, startBeat: 29, durationBeats: 1.5},
  {noteId: 'Re2', freq: 587.33, startBeat: 30.5, durationBeats: 0.5},
  {noteId: 'Sa2', freq: 523.25, graceFreq: 587.33, startBeat: 31, durationBeats: 1},

  // Bar 11: (Sa′)Dha -(Sa′)Ni♭ -Dha
  {noteId: 'Dha', freq: 440.0, graceFreq: 523.25, startBeat: 32, durationBeats: 1.5},
  {noteId: 'KomalNi', freq: 466.16, graceFreq: 523.25, startBeat: 33.5, durationBeats: 1},
  {noteId: 'Dha', freq: 440.0, startBeat: 34.5, durationBeats: 0.5},

  // Bar 12: Pa - Sa
  {noteId: 'Pa', freq: 392.0, startBeat: 35, durationBeats: 2},
  {noteId: 'Sa', freq: 261.63, startBeat: 37, durationBeats: 1},

  // Bar 13: Re -Ga (Ga)Re
  {noteId: 'Re', freq: 293.66, startBeat: 38, durationBeats: 1.5},
  {noteId: 'Ga', freq: 329.63, startBeat: 39.5, durationBeats: 0.5},
  {noteId: 'Re', freq: 293.66, graceFreq: 329.63, startBeat: 40, durationBeats: 1},

  // Bar 14: Re -Pa (Pa)Ma
  {noteId: 'Re', freq: 293.66, startBeat: 41, durationBeats: 1.5},
  {noteId: 'Pa', freq: 392.0, startBeat: 42.5, durationBeats: 0.5},
  {noteId: 'Ma', freq: 349.23, graceFreq: 392.0, startBeat: 43, durationBeats: 1},

  // Bar 15 + Bar 16 Beat 1: (Ma)Ga - - | -
  {noteId: 'Ga', freq: 329.63, graceFreq: 349.23, startBeat: 44, durationBeats: 4},
];

const BEAT_DURATION_SEC = 0.42;

interface StationMusicToyProps {
  reducedMotion: boolean;
}

export const StationMusicToy: React.FC<StationMusicToyProps> = ({reducedMotion}) => {
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);
  const [isPlayingPassage, setIsPlayingPassage] = useState(false);

  useEffect(() => {
    return () => {
      stationAudio.stopHarmoniumPassage();
    };
  }, []);

  const handleManualKey = (key: HarmoniumKey) => {
    if (isPlayingPassage) {
      stationAudio.stopHarmoniumPassage();
      setIsPlayingPassage(false);
    }
    setActiveNoteId(key.id);
    stationAudio.playHarmoniumKey(key.freq, 0.55);
    window.setTimeout(() => {
      setActiveNoteId((curr) => (curr === key.id ? null : curr));
    }, 260);
  };

  const handleTogglePassage = () => {
    if (isPlayingPassage) {
      stationAudio.stopHarmoniumPassage();
      setIsPlayingPassage(false);
      setActiveNoteId(null);
      return;
    }

    if (!stationAudio.enabled) {
      stationAudio.enabled = true;
    }

    setIsPlayingPassage(true);
    stationAudio.playHarmoniumPassage(
      PASSAGE_EVENTS,
      BEAT_DURATION_SEC,
      (ev) => {
        setActiveNoteId(ev.noteId);
      },
      () => {
        setIsPlayingPassage(false);
        setActiveNoteId(null);
      },
    );
  };

  return (
    <section
      aria-labelledby="station-music-heading"
      className="rounded-2xl border border-[#1D252B]/18 bg-[#8AE2FD] p-4 sm:p-7 shadow-[0_12px_32px_-24px_rgba(29,37,43,0.34)]"
    >
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 rounded-xl border border-[#1D252B]/14 bg-[#FDFCFA] p-4 sm:p-5">
        <div>
          <p className="text-xs font-semibold tracking-[0.14em] uppercase text-[#42535E]">
            Tilagor Harmonium · Dadra Tal
          </p>
          <h2
            id="station-music-heading"
            className="mt-1 font-display text-2xl sm:text-3xl font-semibold text-[#1B4332]"
          >
            Music for Tilagor Platform
          </h2>
        </div>

        <button
          type="button"
          onClick={handleTogglePassage}
          className={`inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg border px-4 py-2 text-sm font-semibold shadow-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#5AD7FC] whitespace-nowrap shrink-0 ${
            isPlayingPassage
              ? 'border-[#97282E] bg-[#97282E] text-[#FDFCFA] hover:bg-[#7D2025]'
              : 'border-[#1D252B]/20 bg-[#5AD7FC] text-[#1D252B] hover:bg-[#7CE0FD]'
          }`}
        >
          {isPlayingPassage ? (
            <>
              <Square className="h-3.5 w-3.5 fill-current" aria-hidden="true" />
              <span>Stop Passage</span>
            </>
          ) : (
            <>
              <Play className="h-4 w-4 fill-current" aria-hidden="true" />
              <span>Play Harmonium</span>
            </>
          )}
        </button>
      </div>

      {/* Tactile Sky-Blue Enamel Harmonium Keyboard (9 Warm-White Natural Reeds + Komal Ni Upper Key) */}
      <div className="mt-4 rounded-xl border-2 border-[#1D252B]/28 bg-[#37B8DF] p-2 sm:p-3 shadow-inner">
        <div className="relative">
          <div
            role="group"
            aria-label="Playable harmonium reeds"
            className="grid grid-cols-9 gap-1 sm:gap-1.5"
          >
            {NATURAL_KEYS.map((key) => {
              const isActive = activeNoteId === key.id;
              return (
                <button
                  key={key.id}
                  type="button"
                  onClick={() => handleManualKey(key)}
                  aria-label={`Play harmonium note ${key.sargam}`}
                  className={`flex min-h-[104px] sm:min-h-[124px] flex-col items-center justify-end rounded-b-md border border-[#1D252B]/25 px-0.5 pb-2.5 pt-14 ${
                    reducedMotion ? '' : 'transition-all duration-100'
                  } focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#FDFCFA] ${
                    isActive
                      ? 'translate-y-0.5 bg-[#5AD7FC] text-[#1D252B] shadow-inner'
                      : 'bg-[#FDFCFA] text-[#1D252B] shadow-[0_3px_0_0_rgba(29,37,43,0.28)] hover:bg-[#E7F8FE]'
                  }`}
                >
                  <span className="font-display text-[11px] sm:text-sm md:text-base font-semibold leading-none whitespace-nowrap">
                    {key.sargam}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Raised Komal Ni (Ni♭) Key positioned cleanly between Dha and Ni */}
          <button
            type="button"
            onClick={() => handleManualKey(KOMAL_NI_KEY)}
            aria-label="Play harmonium note Komal Ni"
            style={{left: 'calc((6 / 9) * 100%)'}}
            className={`absolute top-0 -translate-x-1/2 z-10 flex h-[54px] sm:h-[68px] w-[10%] min-w-[30px] max-w-[46px] flex-col items-center justify-end rounded-b-md border border-[#15100C] px-0.5 pb-1.5 ${
              reducedMotion ? '' : 'transition-all duration-100'
            } focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#FDFCFA] ${
              activeNoteId === KOMAL_NI_KEY.id
                ? 'translate-y-0.5 bg-[#97282E] text-[#FDFCFA]'
                : 'bg-[#1D252B] text-[#FDFCFA] shadow-[0_3px_0_0_rgba(0,0,0,0.45)] hover:bg-[#2B3740]'
            }`}
          >
            <span className="font-display text-[10px] sm:text-xs font-semibold leading-none whitespace-nowrap">
              {KOMAL_NI_KEY.sargam}
            </span>
          </button>
        </div>
      </div>
    </section>
  );
};
