import React, {useCallback, useEffect, useRef, useState} from 'react';
import {Pause, Play, RotateCcw, Sparkles} from 'lucide-react';
import {stationAudio} from '../utils/stationAudio';

interface SolarTrackStageProps {
  lapCompleted: boolean;
  onCompleteLap: () => void;
  reducedMotion: boolean;
}

interface GagNotice {
  title: string;
  caption: string;
}

const SILENT_GAGS: GagNotice[] = [
  {
    title: 'Intertitle 01',
    caption: '940 million kilometres covered this lap. Zero speeding tickets.',
  },
  {
    title: 'Intertitle 02',
    caption: 'Warning: Approaching perihelion. Keep hands and birthday cake inside the carriage.',
  },
  {
    title: 'Intertitle 03',
    caption: 'Station Sparrow Report: Wind in the pines, sunlight on the tracks, mischief ahead.',
  },
  {
    title: 'Intertitle 04',
    caption: 'Gravity check passed. Axial tilt remains delightfully dramatic.',
  },
];

export const SolarTrackStage: React.FC<SolarTrackStageProps> = ({
  lapCompleted,
  onCompleteLap,
  reducedMotion,
}) => {
  // Start at 338 deg (just shy of 360 deg finish arch at top 12 o'clock)
  const [angle, setAngle] = useState<number>(338);
  const [isDragging, setIsDragging] = useState(false);
  const [autoChugging, setAutoChugging] = useState(false);
  const [sunWink, setSunWink] = useState(false);
  const [gagIndex, setGagIndex] = useState(0);
  const [showGagCard, setShowGagCard] = useState(false);

  const svgRef = useRef<SVGSVGElement | null>(null);
  const prevAngleRef = useRef<number>(338);

  const trackCenter = 200;
  const trackRadius = 142;

  const triggerLapCelebration = useCallback(() => {
    if (!lapCompleted) {
      stationAudio.playTrainWhistle();
      onCompleteLap();
    }
  }, [lapCompleted, onCompleteLap]);

  // Handle completing lap or counting victory laps when crossing 360 deg
  const updateAngle = useCallback(
    (nextRaw: number) => {
      const normalized = ((nextRaw % 360) + 360) % 360;
      const prev = prevAngleRef.current;
      // Detect clockwise crossing past 0/360
      if (prev > 270 && normalized < 90) {
        if (!lapCompleted) {
          triggerLapCelebration();
        } else {
          stationAudio.playChime(659.25, 0.35, 'triangle', 0.08);
        }
      }
      prevAngleRef.current = normalized;
      setAngle(normalized);
    },
    [lapCompleted, triggerLapCelebration],
  );

  // Smooth auto-chug animation loop
  useEffect(() => {
    if (!autoChugging) return;
    if (reducedMotion) {
      updateAngle(0);
      setAutoChugging(false);
      return;
    }

    let frameId = 0;
    let lastTime = performance.now();

    const tick = (now: number) => {
      const dt = Math.min((now - lastTime) / 1000, 0.05);
      lastTime = now;
      const speedDegPerSec = lapCompleted ? 42 : 34;

      const current = prevAngleRef.current;
      const next = current + speedDegPerSec * dt;
      const wrapped = next >= 360 ? next - 360 : next;

      if (current > 270 && wrapped < 90 && !lapCompleted) {
        // Stop nicely just past finish banner on initial completion
        prevAngleRef.current = 4;
        setAngle(4);
        setAutoChugging(false);
        triggerLapCelebration();
        return;
      }

      prevAngleRef.current = wrapped;
      setAngle(wrapped);
      frameId = requestAnimationFrame(tick);
    };

    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
  }, [autoChugging, lapCompleted, reducedMotion, triggerLapCelebration, updateAngle]);

  // Play rhythmic toy train chug sound while the train is rolling
  useEffect(() => {
    if (autoChugging && !reducedMotion) {
      stationAudio.startTrainChug();
      return () => {
        stationAudio.stopTrainChug();
      };
    }
    stationAudio.stopTrainChug();
    return undefined;
  }, [autoChugging, reducedMotion]);

  const computeAngleFromPointer = (clientX: number, clientY: number) => {
    const svg = svgRef.current;
    if (!svg) return null;
    const rect = svg.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = clientX - cx;
    const dy = clientY - cy;
    // 0 deg at 12 o'clock (top), increasing clockwise
    const rad = Math.atan2(dx, -dy);
    const deg = ((rad * 180) / Math.PI + 360) % 360;
    return deg;
  };

  const handlePointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    setAutoChugging(false);
    setIsDragging(true);
    e.currentTarget.setPointerCapture(e.pointerId);
    const deg = computeAngleFromPointer(e.clientX, e.clientY);
    if (deg !== null) {
      updateAngle(deg);
    }
  };

  const handlePointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!isDragging) return;
    const deg = computeAngleFromPointer(e.clientX, e.clientY);
    if (deg !== null) {
      updateAngle(deg);
    }
  };

  const handlePointerUp = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!isDragging) return;
    setIsDragging(false);
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
  };

  const handleCompleteButton = () => {
    if (lapCompleted) {
      setAutoChugging((prev) => !prev);
      stationAudio.playChime(587.33, 0.25);
      return;
    }
    if (reducedMotion) {
      prevAngleRef.current = 359;
      updateAngle(4);
      return;
    }
    setAutoChugging(true);
    stationAudio.playChime(523.25, 0.25);
  };

  const handleResetLap = () => {
    setAutoChugging(false);
    prevAngleRef.current = 338;
    setAngle(338);
    stationAudio.playChime(440, 0.22);
  };

  const handleSunClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSunWink(true);
    setGagIndex((i) => (i + 1) % SILENT_GAGS.length);
    setShowGagCard(true);
    stationAudio.playChime(783.99, 0.35, 'sine', 0.1);
    window.setTimeout(() => setSunWink(false), 650);
  };

  // Convert angle (0 deg = top) to SVG coordinates
  const rad = ((angle - 90) * Math.PI) / 180;
  const trainX = trackCenter + trackRadius * Math.cos(rad);
  const trainY = trackCenter + trackRadius * Math.sin(rad);

  // Trailing carriage 14 degrees behind the locomotive
  const coachRad = (((angle - 15) - 90) * Math.PI) / 180;
  const coachX = trackCenter + trackRadius * Math.cos(coachRad);
  const coachY = trackCenter + trackRadius * Math.sin(coachRad);

  return (
    <section
      aria-labelledby="solar-station-heading"
      className="relative rounded-2xl border border-[#1D252B]/18 bg-[#8AE2FD] p-4 sm:p-7 shadow-[0_14px_40px_-24px_rgba(29,37,43,0.34)]"
    >
      {/* Subtle warm-white sunlit sheen */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-10 -right-10 h-44 w-44 rounded-full bg-[#FDFCFA]/45 blur-2xl"
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 lg:gap-8 items-center">
        {/* Left: Interactive Circular Toy-Train Solar Dial + Controls Directly Below Track */}
        <div className="lg:col-span-6 flex flex-col items-center">
          <div className="relative w-full max-w-[300px] sm:max-w-[380px] aspect-square">
            <svg
              ref={svgRef}
              viewBox="0 0 400 400"
              role="slider"
              aria-label="Toy train solar orbit dial. Drag or use controls to complete the 360 degree lap around the Sun."
              aria-valuemin={0}
              aria-valuemax={360}
              aria-valuenow={Math.round(angle)}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
              className="w-full h-full select-none touch-none cursor-grab active:cursor-grabbing"
            >
              <defs>
                <radialGradient id="sunGlow" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#F6C85F" stopOpacity="0.48" />
                  <stop offset="70%" stopColor="#D98A1C" stopOpacity="0.12" />
                  <stop offset="100%" stopColor="#D98A1C" stopOpacity="0" />
                </radialGradient>
                <clipPath id="valleyClip">
                  <circle cx="200" cy="200" r="110" />
                </clipPath>
              </defs>

              {/* Outer warm-white compass ring */}
              <circle
                cx="200"
                cy="200"
                r="182"
                fill="#FDFCFA"
                stroke="#1D252B"
                strokeOpacity="0.18"
                strokeWidth="1.5"
              />

              {/* Degree tick marks around outer dial */}
              {Array.from({length: 36}).map((_, i) => {
                const tickDeg = i * 10;
                const tickRad = ((tickDeg - 90) * Math.PI) / 180;
                const inner = i % 3 === 0 ? 166 : 172;
                const outer = 179;
                return (
                  <line
                    key={tickDeg}
                    x1={200 + inner * Math.cos(tickRad)}
                    y1={200 + inner * Math.sin(tickRad)}
                    x2={200 + outer * Math.cos(tickRad)}
                    y2={200 + outer * Math.sin(tickRad)}
                    stroke="#231B15"
                    strokeOpacity={i % 3 === 0 ? 0.45 : 0.2}
                    strokeWidth={i % 3 === 0 ? 1.8 : 1}
                  />
                );
              })}

              {/* Railway sleepers around the circular track */}
              {Array.from({length: 48}).map((_, i) => {
                const sleeperDeg = i * 7.5;
                const sRad = ((sleeperDeg - 90) * Math.PI) / 180;
                return (
                  <line
                    key={sleeperDeg}
                    x1={200 + 135 * Math.cos(sRad)}
                    y1={200 + 135 * Math.sin(sRad)}
                    x2={200 + 149 * Math.cos(sRad)}
                    y2={200 + 149 * Math.sin(sRad)}
                    stroke="#5B4231"
                    strokeWidth="3.2"
                    strokeLinecap="round"
                    strokeOpacity="0.6"
                  />
                );
              })}

              {/* Inner and outer steel rails */}
              <circle
                cx="200"
                cy="200"
                r="138"
                fill="none"
                stroke="#2D241E"
                strokeWidth="2.2"
                strokeOpacity="0.72"
              />
              <circle
                cx="200"
                cy="200"
                r="146"
                fill="none"
                stroke="#2D241E"
                strokeWidth="2.2"
                strokeOpacity="0.72"
              />

              {/* Misty Darjeeling hill diorama inside the track */}
              <g clipPath="url(#valleyClip)">
                <rect x="85" y="85" width="230" height="230" fill="#5AD7FC" fillOpacity="0.52" />
                {/* Distant misty sky-blue ridge */}
                <path
                  d="M80 225 Q140 172 195 198 T315 184 L315 315 L80 315 Z"
                  fill="#4C6C7C"
                  fillOpacity="0.4"
                />
                {/* Mid tea-garden green slope */}
                <path
                  d="M80 245 Q150 205 218 228 T315 215 L315 315 L80 315 Z"
                  fill="#275D47"
                  fillOpacity="0.58"
                />
                {/* Foreground deep pine hill */}
                <path
                  d="M80 268 Q170 242 245 262 T320 252 L320 320 L80 320 Z"
                  fill="#1B4332"
                />
                {/* Tiny stylized pine silhouettes */}
                <polygon points="126,256 134,232 142,256" fill="#143326" />
                <polygon points="144,258 150,240 156,258" fill="#143326" />
                <polygon points="256,255 264,230 272,255" fill="#143326" />
              </g>

              <circle
                cx="200"
                cy="200"
                r="110"
                fill="none"
                stroke="#231B15"
                strokeOpacity="0.22"
                strokeWidth="1.5"
              />

              {/* Finish Arch / Perihelion Station Gate at 12 o'clock (0 deg) */}
              <g transform="translate(200, 58)">
                <rect x="-18" y="-22" width="36" height="14" rx="2" fill="#1B4332" />
                <text
                  x="0"
                  y="-12"
                  textAnchor="middle"
                  fill="#FDFCFA"
                  fontSize="7.5"
                  fontFamily="JetBrains Mono, monospace"
                  fontWeight="600"
                >
                  360°
                </text>
                {/* Signal flag */}
                <line x1="16" y1="-22" x2="16" y2="10" stroke="#231B15" strokeWidth="2" />
                <polygon
                  points={lapCompleted ? '16,-22 30,-16 16,-10' : '16,-14 28,-9 16,-4'}
                  fill={lapCompleted ? '#97282E' : '#5AD7FC'}
                />
              </g>

              {/* Central Interactive Sun */}
              <circle cx="200" cy="176" r="64" fill="url(#sunGlow)" />
              <g
                onClick={handleSunClick}
                className="cursor-pointer"
                role="button"
                tabIndex={0}
                aria-label="Sun mascot. Click for an orbital surprise note."
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setSunWink(true);
                    setGagIndex((i) => (i + 1) % SILENT_GAGS.length);
                    setShowGagCard(true);
                    stationAudio.playChime(783.99, 0.35);
                    window.setTimeout(() => setSunWink(false), 650);
                  }
                }}
              >
                {/* Sun rays */}
                {Array.from({length: 12}).map((_, idx) => {
                  const rayAngle = (idx * 30 * Math.PI) / 180;
                  const r1 = 36;
                  const r2 = sunWink || lapCompleted ? 49 : 44;
                  return (
                    <line
                      key={idx}
                      x1={200 + r1 * Math.cos(rayAngle)}
                      y1={176 + r1 * Math.sin(rayAngle)}
                      x2={200 + r2 * Math.cos(rayAngle)}
                      y2={176 + r2 * Math.sin(rayAngle)}
                      stroke="#D98A1C"
                      strokeWidth="2.6"
                      strokeLinecap="round"
                    />
                  );
                })}
                <circle
                  cx="200"
                  cy="176"
                  r="31"
                  fill="#E6B24C"
                  stroke="#B56E12"
                  strokeWidth="2"
                />
                {/* Cute silent-film face on the Sun */}
                {sunWink ? (
                  <>
                    <path
                      d="M187 173 Q191 169 195 173"
                      fill="none"
                      stroke="#231B15"
                      strokeWidth="2.2"
                      strokeLinecap="round"
                    />
                    <circle cx="209" cy="172" r="2.3" fill="#231B15" />
                  </>
                ) : (
                  <>
                    <circle cx="191" cy="172" r="2.3" fill="#231B15" />
                    <circle cx="209" cy="172" r="2.3" fill="#231B15" />
                  </>
                )}
                <path
                  d="M192 182 Q200 189 208 182"
                  fill="none"
                  stroke="#231B15"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                />
                {/* Tiny rosy cheeks */}
                <circle cx="185" cy="179" r="3" fill="#97282E" fillOpacity="0.26" />
                <circle cx="215" cy="179" r="3" fill="#97282E" fillOpacity="0.26" />
              </g>

              {/* Trailing passenger & HSC luggage coach */}
              <g transform={`translate(${coachX}, ${coachY}) rotate(${angle - 15})`}>
                <rect
                  x="-11"
                  y="-7"
                  width="22"
                  height="14"
                  rx="2.5"
                  fill="#1B4332"
                  stroke="#231B15"
                  strokeWidth="1.5"
                />
                <rect x="-7" y="-3.5" width="5" height="5" rx="0.8" fill="#FDFCFA" />
                <rect x="2" y="-3.5" width="5" height="5" rx="0.8" fill="#FDFCFA" />
                {/* Tiny sky-blue HSC crate on roof */}
                <rect
                  x="-5"
                  y="-11"
                  width="10"
                  height="4.5"
                  rx="0.8"
                  fill="#5AD7FC"
                  stroke="#231B15"
                  strokeWidth="1"
                />
              </g>

              {/* Main Darjeeling-style miniature steam locomotive */}
              <g transform={`translate(${trainX}, ${trainY}) rotate(${angle})`}>
                {/* Gentle steam puff */}
                {!reducedMotion && (
                  <circle cx="9" cy="-14" r="4.2" fill="#FDFCFA" fillOpacity="0.92" />
                )}
                {/* Locomotive body in deep burgundy */}
                <rect
                  x="-14"
                  y="-9"
                  width="26"
                  height="18"
                  rx="3.5"
                  fill="#97282E"
                  stroke="#231B15"
                  strokeWidth="1.8"
                />
                {/* Warm brass boiler band */}
                <rect
                  x="0"
                  y="-8"
                  width="11"
                  height="16"
                  rx="2"
                  fill="#E6B24C"
                  stroke="#231B15"
                  strokeWidth="1.3"
                />
                {/* Chimney */}
                <circle cx="8" cy="0" r="3.2" fill="#231B15" />
                {/* Warm-white headlamp */}
                <circle cx="13.5" cy="0" r="2.4" fill="#FDFCFA" stroke="#231B15" strokeWidth="1" />
                {/* Sky-blue grip indicator halo */}
                <circle
                  cx="0"
                  cy="0"
                  r="22"
                  fill="transparent"
                  stroke="#5AD7FC"
                  strokeOpacity={isDragging ? 0.9 : 0.45}
                  strokeWidth="1.6"
                  strokeDasharray="3 3"
                />
              </g>
            </svg>
          </div>

          {/* Red Icon-Only Play/Pause & Restart Controls (no background) below track, above Tilagor Station box */}
          <div className="mt-2 flex items-center justify-center gap-5">
            <button
              type="button"
              onClick={handleCompleteButton}
              aria-label={
                autoChugging
                  ? 'Pause toy train'
                  : lapCompleted
                    ? 'Resume toy train loop'
                    : 'Play and complete the solar lap'
              }
              title={autoChugging ? 'Pause' : 'Play'}
              className="inline-flex h-11 w-11 items-center justify-center bg-transparent text-[#97282E] transition-transform duration-150 hover:scale-110 hover:text-[#7D2025] active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#97282E]"
            >
              {autoChugging ? (
                <Pause className="h-7 w-7 fill-current" aria-hidden="true" />
              ) : (
                <Play className="h-7 w-7 fill-current ml-0.5" aria-hidden="true" />
              )}
            </button>

            <button
              type="button"
              onClick={handleResetLap}
              aria-label="Restart toy train to starting position"
              title="Restart"
              className="inline-flex h-11 w-11 items-center justify-center bg-transparent text-[#97282E] transition-transform duration-150 hover:scale-110 hover:text-[#7D2025] active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#97282E]"
            >
              <RotateCcw className="h-6 w-6 stroke-[2.4]" aria-hidden="true" />
            </button>
          </div>
        </div>

        {/* Right: Warm-White Greeting Panel & Silent-Film Gag Card */}
        <div className="lg:col-span-6 flex flex-col justify-center gap-5 rounded-xl border border-[#1D252B]/14 bg-[#FDFCFA] p-5 sm:p-7">
          <div>
            <p className="text-xs font-semibold tracking-[0.14em] uppercase text-[#42535E]">
              Tilagor Station · Passenger: Miss Iqra
            </p>
            <h1
              id="solar-station-heading"
              className="mt-2 font-display text-4xl sm:text-5xl font-semibold tracking-tight text-[#1B4332] [text-wrap:balance]"
            >
              Happy Birthday, Iqra!
            </h1>
            <p className="mt-2 font-display text-xl sm:text-2xl italic text-[#97282E]">
              Another trip around the Sun!
            </p>
          </div>

          {/* Silent-Film Intertitle Surprise Box (shown only on Sun mascot click) */}
          {showGagCard && (
            <div
              role="status"
              className="rounded-xl border border-[#231B15]/20 bg-[#231B15] px-4 py-3.5 text-[#FDFCFA] transition-opacity duration-200"
            >
              <div className="flex items-center justify-between gap-3">
                <span className="font-mono-tabular text-[11px] uppercase tracking-[0.14em] text-[#5AD7FC]">
                  {SILENT_GAGS[gagIndex].title}
                </span>
                <Sparkles className="h-3.5 w-3.5 text-[#5AD7FC]" aria-hidden="true" />
              </div>
              <p className="mt-1 font-display text-base italic text-[#FDFCFA]">
                “{SILENT_GAGS[gagIndex].caption}”
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};
