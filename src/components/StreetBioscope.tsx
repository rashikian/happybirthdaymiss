import React, {useState} from 'react';
import {Film, Play, X} from 'lucide-react';
import {stationAudio} from '../utils/stationAudio';

const YOUTUBE_VIDEO_ID = 'XfqOB4hvxlY';
const VIDEO_COVER_URL = '/assets/aistudio/d18fe9ce9251c0b732edf24eb4b0db45_a9898b41.jpg';

interface StreetBioscopeProps {
  reducedMotion: boolean;
}

export const StreetBioscope: React.FC<StreetBioscopeProps> = ({reducedMotion}) => {
  const [shutterOpen, setShutterOpen] = useState(false);
  const [thumbFailed, setThumbFailed] = useState(false);

  const handleOpenShutter = () => {
    stationAudio.playChime(523.25, 0.3, 'triangle', 0.1);
    setShutterOpen(true);
  };

  const handleCloseShutter = () => {
    stationAudio.playChime(392.0, 0.25, 'triangle', 0.08);
    setShutterOpen(false);
  };

  return (
    <section
      aria-label="Bioscope video player"
      className="relative rounded-2xl border border-[#1D252B]/20 bg-[#7EDDFC] p-4 sm:p-6 text-[#1D252B] shadow-[0_18px_46px_-22px_rgba(29,37,43,0.42)]"
    >
      {shutterOpen && (
        <div className="mb-3 flex justify-end">
          <button
            type="button"
            onClick={handleCloseShutter}
            aria-label="Close video player"
            title="Close"
            className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-[#97282E] bg-[#97282E] text-[#FDFCFA] transition-colors hover:bg-[#7D2025] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FDFCFA]"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      )}

      {/* Perforated Film Sprocket Frame */}
      <div className="rounded-xl border-2 border-[#FDFCFA]/85 bg-[#1D252B] p-2 sm:p-3">
        <div className="h-3 w-full sprocket-strip opacity-75 mb-2" aria-hidden="true" />

        <div className="relative w-full aspect-video overflow-hidden rounded-lg bg-[#161D22]">
          {!shutterOpen ? (
            <>
              {!thumbFailed ? (
                <img
                  src={VIDEO_COVER_URL}
                  alt="Cat sitting calmly in front of a fiery explosion"
                  onError={() => setThumbFailed(true)}
                  className={`h-full w-full object-cover object-center ${
                    reducedMotion ? '' : 'transition-transform duration-500 ease-out hover:scale-[1.02]'
                  }`}
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-[#1D252B] p-6">
                  <Film className="h-10 w-10 text-[#5AD7FC]" aria-hidden="true" />
                </div>
              )}

              {/* Icon-only Play Trigger tucked cleanly in lower-left so the cat stays unobstructed */}
              <button
                type="button"
                onClick={handleOpenShutter}
                aria-label="Play YouTube birthday video"
                title="Play"
                className={`absolute bottom-4 left-4 sm:bottom-6 sm:left-6 inline-flex h-14 w-14 sm:h-16 sm:w-16 items-center justify-center rounded-full border-2 border-[#FDFCFA] bg-[#5AD7FC] text-[#1D252B] shadow-xl transition-all ${
                  reducedMotion ? '' : 'hover:scale-105 hover:bg-[#7CE0FD] active:scale-95'
                } focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#FDFCFA]`}
              >
                <Play className="h-6 w-6 sm:h-7 sm:w-7 fill-current ml-0.5" aria-hidden="true" />
              </button>
            </>
          ) : (
            <iframe
              className="h-full w-full border-0"
              src={`https://www.youtube-nocookie.com/embed/${YOUTUBE_VIDEO_ID}?autoplay=1&rel=0`}
              title="Happy Birthday, Iqra! Special YouTube Reel"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              referrerPolicy="strict-origin-when-cross-origin"
              allowFullScreen
            />
          )}
        </div>

        <div className="h-3 w-full sprocket-strip opacity-75 mt-2" aria-hidden="true" />
      </div>
    </section>
  );
};
