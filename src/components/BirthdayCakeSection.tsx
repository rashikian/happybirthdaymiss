import React, {useMemo, useState} from 'react';
import {AnimatePresence, motion} from 'motion/react';
import {stationAudio} from '../utils/stationAudio';

interface BirthdayCakeSectionProps {
  reducedMotion: boolean;
}

interface CandleSpec {
  id: number;
  x: number; // SVG x coordinate inside 380x270 viewBox
  height: number;
  chimeFreq: number;
  stripeColor: string;
}

const CANDLES: CandleSpec[] = [
  {id: 0, x: 116, height: 42, chimeFreq: 523.25, stripeColor: '#97282E'},
  {id: 1, x: 153, height: 48, chimeFreq: 587.33, stripeColor: '#5AD7FC'},
  {id: 2, x: 190, height: 52, chimeFreq: 659.25, stripeColor: '#97282E'},
  {id: 3, x: 227, height: 48, chimeFreq: 783.99, stripeColor: '#5AD7FC'},
  {id: 4, x: 264, height: 42, chimeFreq: 880.0, stripeColor: '#97282E'},
];

interface ConfettiPiece {
  id: number;
  startX: number;
  driftX: number;
  endY: number;
  rotate: number;
  delay: number;
  duration: number;
  size: number;
  isCircle: boolean;
  color: string;
}

const CONFETTI_COLORS = [
  'rgb(90, 215, 252)', // Sky blue
  'rgb(151, 40, 46)', // Deep burgundy
  'rgb(230, 178, 76)', // Warm golden candlelight
  'rgb(253, 252, 250)', // Warm white
];

export const BirthdayCakeSection: React.FC<BirthdayCakeSectionProps> = ({
  reducedMotion,
}) => {
  const [extinguishedCandles, setExtinguishedCandles] = useState<Set<number>>(
    () => new Set(),
  );

  const allCandlesOut = extinguishedCandles.size === CANDLES.length;

  const confettiPieces = useMemo<ConfettiPiece[]>(() => {
    return Array.from({length: 28}).map((_, idx) => {
      const seed = (idx * 37 + 13) % 100;
      const startX = 8 + ((idx * 19 + 7) % 84);
      const driftX = (idx % 2 === 0 ? 1 : -1) * (14 + (seed % 32));
      const endY = 180 + (seed % 140);
      return {
        id: idx,
        startX,
        driftX,
        endY,
        rotate: (idx % 2 === 0 ? 1 : -1) * (140 + seed * 2),
        delay: (idx % 7) * 0.06,
        duration: 1.9 + (idx % 5) * 0.28,
        size: 6 + (idx % 4) * 2,
        isCircle: idx % 3 === 0,
        color: CONFETTI_COLORS[idx % CONFETTI_COLORS.length],
      };
    });
  }, []);

  const playCelebrationChime = () => {
    stationAudio.playChime(523.25, 0.55, 'triangle', 0.22);
    window.setTimeout(() => {
      stationAudio.playChime(659.25, 0.6, 'triangle', 0.22);
    }, 90);
    window.setTimeout(() => {
      stationAudio.playChime(783.99, 0.75, 'sine', 0.24);
    }, 180);
  };

  const handleCandleTap = (candle: CandleSpec) => {
    if (extinguishedCandles.has(candle.id)) return;
    stationAudio.playPop();

    const next = new Set(extinguishedCandles);
    next.add(candle.id);
    setExtinguishedCandles(next);

    if (next.size === CANDLES.length) {
      window.setTimeout(() => {
        playCelebrationChime();
      }, 110);
    }
  };

  const handleBlowOut = () => {
    if (allCandlesOut) return;
    stationAudio.playPop();
    setExtinguishedCandles(new Set(CANDLES.map((c) => c.id)));
    window.setTimeout(() => {
      playCelebrationChime();
    }, 90);
  };

  const topTierY = 116;

  return (
    <section
      aria-labelledby="birthday-cake-heading"
      className="relative overflow-hidden rounded-2xl border border-[#1D252B]/18 bg-[#8AE2FD] p-4 sm:p-7 shadow-[0_14px_40px_-24px_rgba(29,37,43,0.34)]"
    >
      {/* Subtle warm-white sunlit corner sheen */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-12 -left-12 h-44 w-44 rounded-full bg-[#FDFCFA]/45 blur-2xl"
      />

      {/* Tasteful Palette-Matched Confetti Overlay (only when all candles are out) */}
      <AnimatePresence>
        {allCandlesOut && !reducedMotion && (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 z-20 overflow-hidden"
          >
            {confettiPieces.map((piece) => (
              <motion.span
                key={piece.id}
                initial={{
                  opacity: 0,
                  y: -14,
                  x: 0,
                  rotate: 0,
                  scale: 0.6,
                }}
                animate={{
                  opacity: [0, 0.95, 0.9, 0],
                  y: piece.endY,
                  x: piece.driftX,
                  rotate: piece.rotate,
                  scale: [0.6, 1, 0.95, 0.7],
                }}
                transition={{
                  duration: piece.duration,
                  delay: piece.delay,
                  ease: [0.16, 1, 0.3, 1],
                }}
                style={{
                  position: 'absolute',
                  top: '10%',
                  left: `${piece.startX}%`,
                  width: `${piece.size}px`,
                  height: piece.isCircle ? `${piece.size}px` : `${piece.size * 0.52}px`,
                  borderRadius: piece.isCircle ? '9999px' : '2px',
                  backgroundColor: piece.color,
                  border:
                    piece.color === 'rgb(253, 252, 250)'
                      ? '1px solid rgba(29, 37, 43, 0.16)'
                      : 'none',
                }}
              />
            ))}
          </div>
        )}
      </AnimatePresence>

      {/* Inner Warm-White Editorial Card */}
      <div className="relative z-10 rounded-xl border border-[#1D252B]/14 bg-[#FDFCFA] px-4 py-7 sm:px-8 sm:py-10">
        {/* Top Heading / Celebratory Reveal */}
        <div className="text-center max-w-lg mx-auto">
          <AnimatePresence mode="wait">
            {!allCandlesOut ? (
              <motion.div
                key="wish-prompt"
                initial={reducedMotion ? false : {opacity: 0, y: 6}}
                animate={{opacity: 1, y: 0}}
                exit={reducedMotion ? {opacity: 0} : {opacity: 0, y: -6}}
                transition={{duration: 0.25}}
              >
                <h2
                  id="birthday-cake-heading"
                  className="font-display text-3xl sm:text-4xl font-semibold tracking-tight text-[#1D252B] [text-wrap:balance]"
                >
                  Make a wish, Iqra!
                </h2>
                <p className="mt-2 text-sm text-[#42535E]">
                  Tap the candles.
                </p>
              </motion.div>
            ) : (
              <motion.div
                key="celebration-reveal"
                initial={reducedMotion ? false : {opacity: 0, y: 10}}
                animate={{opacity: 1, y: 0}}
                transition={{duration: 0.4, ease: [0.16, 1, 0.3, 1]}}
              >
                <h2
                  id="birthday-cake-heading"
                  className="font-display text-3xl sm:text-4xl font-semibold tracking-tight text-[#97282E] [text-wrap:balance]"
                >
                  Happy Birthday, Iqra!
                </h2>
                <p className="mt-2.5 text-base leading-relaxed text-[#1D252B]/90 max-w-md mx-auto">
                  Your wish is in the sky now, may the year ahead be gentle, bright, and full of little wonders.
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Illustrated Cake & Interactive Candles */}
        <div className="relative mx-auto mt-6 w-full max-w-[380px] aspect-[380/270] select-none">
          <svg
            viewBox="0 0 380 270"
            role="img"
            aria-label={
              allCandlesOut
                ? 'Illustrated two-tier birthday cake with extinguished candles and gentle wisps of smoke'
                : 'Illustrated two-tier birthday cake with glowing candles'
            }
            className="h-full w-full overflow-visible"
          >
            <defs>
              <radialGradient id="cakeCandleHalo" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#F6C85F" stopOpacity="0.6" />
                <stop offset="55%" stopColor="#F59E0B" stopOpacity="0.18" />
                <stop offset="100%" stopColor="#F59E0B" stopOpacity="0" />
              </radialGradient>
              <linearGradient id="cakeStandShade" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#FDFCFA" />
                <stop offset="100%" stopColor="#E9E4DA" />
              </linearGradient>
              <linearGradient id="cakeTierUpper" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#FBF8F3" />
                <stop offset="50%" stopColor="#FDFCFA" />
                <stop offset="100%" stopColor="#F2ECE1" />
              </linearGradient>
              <linearGradient id="cakeTierLower" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#F8F3EA" />
                <stop offset="50%" stopColor="#FDFCFA" />
                <stop offset="100%" stopColor="#EFE8DB" />
              </linearGradient>
            </defs>

            {/* Ambient candlelight wash behind candles when lit */}
            {!allCandlesOut && (
              <ellipse
                cx="190"
                cy="62"
                rx="118"
                ry="42"
                fill="url(#cakeCandleHalo)"
                fillOpacity={(CANDLES.length - extinguishedCandles.size) / CANDLES.length}
              />
            )}

            {/* Soft table shadow beneath pedestal */}
            <ellipse
              cx="190"
              cy="252"
              rx="106"
              ry="9"
              fill="#1D252B"
              fillOpacity="0.09"
            />

            {/* Porcelain Pedestal Cake Stand */}
            <path
              d="M150 247 Q170 236 174 218 L206 218 Q210 236 230 247 Z"
              fill="url(#cakeStandShade)"
              stroke="#1D252B"
              strokeOpacity="0.24"
              strokeWidth="1.4"
            />
            <ellipse
              cx="190"
              cy="247"
              rx="48"
              ry="6"
              fill="#FDFCFA"
              stroke="#1D252B"
              strokeOpacity="0.24"
              strokeWidth="1.4"
            />
            {/* Plate top */}
            <ellipse
              cx="190"
              cy="214"
              rx="132"
              ry="14"
              fill="url(#cakeStandShade)"
              stroke="#1D252B"
              strokeOpacity="0.28"
              strokeWidth="1.5"
            />
            <ellipse
              cx="190"
              cy="212"
              rx="118"
              ry="9"
              fill="none"
              stroke="#5AD7FC"
              strokeOpacity="0.6"
              strokeWidth="1.4"
            />

            {/* Bottom Cake Tier */}
            <path
              d="M78 164 L78 205 Q190 218 302 205 L302 164 Z"
              fill="url(#cakeTierLower)"
              stroke="#1D252B"
              strokeOpacity="0.28"
              strokeWidth="1.5"
            />
            {/* Sky-blue satin ribbon at bottom tier base */}
            <path
              d="M78 194 Q190 206 302 194 L302 204 Q190 216 78 204 Z"
              fill="#5AD7FC"
              fillOpacity="0.82"
              stroke="#1D252B"
              strokeOpacity="0.18"
              strokeWidth="1"
            />
            {/* Bottom tier top surface */}
            <ellipse
              cx="190"
              cy="164"
              rx="112"
              ry="12"
              fill="#FDFCFA"
              stroke="#1D252B"
              strokeOpacity="0.24"
              strokeWidth="1.4"
            />
            {/* Burgundy scalloped piping along bottom tier rim */}
            <path
              d="M82 168 Q94 179 106 169 Q118 179 130 170 Q142 180 154 171 Q166 181 178 172 Q190 182 202 172 Q214 181 226 171 Q238 180 250 170 Q262 179 274 169 Q286 179 298 168"
              fill="none"
              stroke="#97282E"
              strokeWidth="2.4"
              strokeLinecap="round"
            />

            {/* Top Cake Tier */}
            <path
              d="M96 116 L96 159 Q190 170 284 159 L284 116 Z"
              fill="url(#cakeTierUpper)"
              stroke="#1D252B"
              strokeOpacity="0.28"
              strokeWidth="1.5"
            />
            {/* Deep burgundy ribbon band at top tier base */}
            <path
              d="M96 149 Q190 159 284 149 L284 158 Q190 168 96 158 Z"
              fill="#97282E"
              fillOpacity="0.92"
            />
            {/* Delicate sky-blue swag dots on upper tier */}
            {[114, 139, 164, 190, 216, 241, 266].map((dotX, i) => (
              <circle
                key={dotX}
                cx={dotX}
                cy={138 + (i % 2 === 0 ? 0 : 2)}
                r="2.4"
                fill="#5AD7FC"
              />
            ))}
            {/* Top tier surface */}
            <ellipse
              cx="190"
              cy={topTierY}
              rx="94"
              ry="10.5"
              fill="#FDFCFA"
              stroke="#1D252B"
              strokeOpacity="0.25"
              strokeWidth="1.4"
            />
            {/* Delicate scalloped icing around top tier rim */}
            <path
              d="M98 118 Q109 127 120 119 Q131 128 142 120 Q153 129 164 121 Q175 130 186 122 Q197 130 208 121 Q219 129 230 120 Q241 128 252 119 Q263 127 274 119 Q279 124 282 118"
              fill="none"
              stroke="#5AD7FC"
              strokeWidth="2.4"
              strokeLinecap="round"
            />

            {/* 5 Candles + Flames + Blow-out Smoke Wisps */}
            {CANDLES.map((candle) => {
              const baseY = topTierY + 2;
              const topY = baseY - candle.height;
              const wickTopY = topY - 7;
              const isOut = extinguishedCandles.has(candle.id);

              return (
                <g key={candle.id}>
                  {/* Subtle wax base collar */}
                  <ellipse
                    cx={candle.x}
                    cy={baseY}
                    rx="6.2"
                    ry="2.2"
                    fill="#E9E4DA"
                    stroke="#1D252B"
                    strokeOpacity="0.2"
                    strokeWidth="0.9"
                  />

                  {/* Candle wax shaft */}
                  <rect
                    x={candle.x - 4.5}
                    y={topY}
                    width="9"
                    height={candle.height}
                    rx="2.4"
                    fill="#FDFCFA"
                    stroke="#1D252B"
                    strokeOpacity="0.28"
                    strokeWidth="1.2"
                  />
                  {/* Diagonal decorative stripe */}
                  <line
                    x1={candle.x - 4}
                    y1={topY + 12}
                    x2={candle.x + 4}
                    y2={topY + 7}
                    stroke={candle.stripeColor}
                    strokeWidth="2.4"
                    strokeLinecap="round"
                    strokeOpacity="0.88"
                  />
                  <line
                    x1={candle.x - 4}
                    y1={topY + 24}
                    x2={candle.x + 4}
                    y2={topY + 19}
                    stroke={candle.stripeColor}
                    strokeWidth="2.4"
                    strokeLinecap="round"
                    strokeOpacity="0.88"
                  />
                  <line
                    x1={candle.x - 4}
                    y1={topY + 36}
                    x2={candle.x + 4}
                    y2={topY + 31}
                    stroke={candle.stripeColor}
                    strokeWidth="2.4"
                    strokeLinecap="round"
                    strokeOpacity="0.88"
                  />

                  {/* Wick */}
                  <line
                    x1={candle.x}
                    y1={topY}
                    x2={candle.x}
                    y2={wickTopY}
                    stroke="#1D252B"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />

                  {/* Lit Flame */}
                  <AnimatePresence>
                    {!isOut && (
                      <motion.g
                        key={`flame-${candle.id}`}
                        style={{
                          transformOrigin: `${candle.x}px ${wickTopY}px`,
                        }}
                        initial={{scale: 1, opacity: 1}}
                        animate={
                          reducedMotion
                            ? {scale: 1, opacity: 1}
                            : {
                                scale: [1, 1.05, 0.97, 1.03, 1],
                                rotate: [-2.2, 2.4, -1.6, 1.8, -2.2],
                                opacity: 1,
                              }
                        }
                        exit={
                          reducedMotion
                            ? {opacity: 0}
                            : {
                                scale: 0,
                                y: -6,
                                opacity: 0,
                                transition: {duration: 0.2, ease: 'easeOut'},
                              }
                        }
                        transition={
                          reducedMotion
                            ? {duration: 0.2}
                            : {
                                duration: 1.7 + candle.id * 0.16,
                                repeat: Infinity,
                                ease: 'easeInOut',
                              }
                        }
                      >
                        {/* Warm glow behind flame */}
                        <circle
                          cx={candle.x}
                          cy={wickTopY - 8}
                          r={14}
                          fill="url(#cakeCandleHalo)"
                        />
                        {/* Outer amber teardrop */}
                        <path
                          d={`M ${candle.x} ${wickTopY - 19} C ${candle.x + 6.5} ${wickTopY - 10}, ${candle.x + 6} ${wickTopY - 2}, ${candle.x} ${wickTopY} C ${candle.x - 6} ${wickTopY - 2}, ${candle.x - 6.5} ${wickTopY - 10}, ${candle.x} ${wickTopY - 19} Z`}
                          fill="#F59E0B"
                        />
                        {/* Mid golden flame */}
                        <path
                          d={`M ${candle.x} ${wickTopY - 15} C ${candle.x + 4} ${wickTopY - 8}, ${candle.x + 3.8} ${wickTopY - 2}, ${candle.x} ${wickTopY - 0.5} C ${candle.x - 3.8} ${wickTopY - 2}, ${candle.x - 4} ${wickTopY - 8}, ${candle.x} ${wickTopY - 15} Z`}
                          fill="#FCD34D"
                        />
                        {/* Bright ivory core */}
                        <ellipse
                          cx={candle.x}
                          cy={wickTopY - 5}
                          rx="1.6"
                          ry="3.2"
                          fill="#FDFCFA"
                        />
                      </motion.g>
                    )}
                  </AnimatePresence>

                  {/* Gentle Rising Smoke Wisp after candle goes out */}
                  {isOut && !reducedMotion && (
                    <g aria-hidden="true">
                      <motion.path
                        d={`M ${candle.x} ${wickTopY} Q ${candle.x - 6} ${wickTopY - 12} ${candle.x + 3} ${wickTopY - 24} T ${candle.x - 2} ${wickTopY - 42}`}
                        fill="none"
                        stroke="#42535E"
                        strokeWidth="2"
                        strokeLinecap="round"
                        initial={{opacity: 0, pathLength: 0.2, y: 2}}
                        animate={{
                          opacity: [0, 0.55, 0.3, 0],
                          pathLength: [0.2, 0.9, 1],
                          y: [2, -16, -28],
                        }}
                        transition={{
                          duration: 1.6,
                          ease: 'easeOut',
                        }}
                      />
                      <motion.circle
                        cx={candle.x + (candle.id % 2 === 0 ? 3 : -3)}
                        cy={wickTopY - 8}
                        r="3.2"
                        fill="#42535E"
                        initial={{opacity: 0.45, y: 0, scale: 0.6}}
                        animate={{opacity: 0, y: -34, scale: 1.8}}
                        transition={{
                          duration: 1.4,
                          delay: 0.06,
                          ease: 'easeOut',
                        }}
                      />
                    </g>
                  )}
                </g>
              );
            })}
          </svg>

          {/* Accessible Invisible Tap Targets Aligned Over Each Lit Candle */}
          {CANDLES.map((candle) => {
            const isOut = extinguishedCandles.has(candle.id);
            if (isOut) return null;
            const leftPct = (candle.x / 380) * 100;
            return (
              <button
                key={candle.id}
                type="button"
                onClick={() => handleCandleTap(candle)}
                aria-label={`Blow out candle ${candle.id + 1}`}
                style={{left: `${leftPct}%`, top: '4%'}}
                className="absolute -translate-x-1/2 h-[42%] w-[10.5%] min-w-[36px] min-h-[44px] rounded-full bg-transparent cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#97282E]"
              />
            );
          })}
        </div>

        {/* Single Action Button Before All Candles Are Out */}
        {!allCandlesOut && (
          <div className="mt-4 flex justify-center">
            <button
              type="button"
              onClick={handleBlowOut}
              className="inline-flex min-h-[44px] items-center justify-center rounded-lg bg-[#97282E] px-6 py-2.5 text-sm font-semibold text-[#FDFCFA] shadow-sm transition-all duration-150 hover:bg-[#7D2025] active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#97282E]"
            >
              Blow out the candles.
            </button>
          </div>
        )}
      </div>
    </section>
  );
};
