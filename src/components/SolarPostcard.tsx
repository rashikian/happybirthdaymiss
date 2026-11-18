import React from 'react';

interface SolarPostcardProps {
  lapCompleted: boolean;
}

export const SolarPostcard: React.FC<SolarPostcardProps> = ({lapCompleted}) => {
  return (
    <section
      aria-label="Birthday message for Iqra"
      className={`relative rounded-2xl border border-[#1D252B]/18 bg-[#8AE2FD] p-3.5 sm:p-5 shadow-[0_16px_42px_-26px_rgba(29,37,43,0.38)] transition-all duration-300 ${
        lapCompleted ? 'ring-2 ring-[#FDFCFA]' : ''
      }`}
    >
      <div className="postcard-rule rounded-xl border border-[#1D252B]/15 bg-[#FDFCFA] p-5 sm:p-8">
        <div>
          <p className="font-display text-lg italic text-[#97282E]">
            Miss Iqra,
          </p>

          <p className="mt-2.5 text-base sm:text-[17px] leading-[1.85] text-[#1D252B] max-w-prose">
            Congratulations on completing another lap around the Sun!
          </p>

          <p className="mt-3 text-base sm:text-[17px] leading-[1.85] text-[#1D252B] max-w-prose">
            I hope the coming year gives you stories worth telling, songs worth singing, places worth remembering, and moments so beautiful that, for a little while, you wish time would stand still.
          </p>
        </div>

        {/* Perforated HSC Luggage Tag Addendum */}
        <div className="mt-7 border-t border-dashed border-[#5AD7FC] pt-5">
          <span className="font-mono-tabular text-xs font-semibold tracking-[0.12em] uppercase text-[#1D5A70]">
            Luggage Tag
          </span>

          <p className="mt-2 text-sm sm:text-base leading-relaxed text-[#1D252B]/90 max-w-prose">
            Also, Groot, best of luck with your HSC! I guess I&apos;ll see you after another lap around the Sun. Hopefully, by then, HSC will be history. :D
          </p>

          <div className="mt-5 flex items-end justify-between gap-4 border-t border-[#1D252B]/12 pt-3">
            <span className="text-xs text-[#42535E]">
              Signed at Tilagor Platform
            </span>
            <span className="font-display text-2xl italic font-medium text-[#97282E]">
              areqfalgun
            </span>
          </div>
        </div>
      </div>
    </section>
  );
};
