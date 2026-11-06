import React, { useState } from 'react';
import defaultLogoAsset from '../assets/images/jj_corp_shield_logo_1793909841397.jpg';

interface CorporateLogoProps {
  src?: string;
  alt?: string;
  className?: string;
  fallbackText?: string;
}

export const CorporateLogo: React.FC<CorporateLogoProps> = ({
  src,
  alt = 'Logo Corporativo JJ',
  className = 'w-full h-full object-cover rounded-lg',
  fallbackText = 'JJ',
}) => {
  const [hasError, setHasError] = useState(false);

  // Preferred source order: custom src -> imported asset -> public static file
  const effectiveSrc = src && src.trim() ? src.trim() : (defaultLogoAsset || '/images/logo.jpg');

  if (hasError) {
    // Beautiful vector corporate shield fallback if image loading fails on internet
    return (
      <div
        className={`flex items-center justify-center bg-gradient-to-br from-[#0A192F] via-[#102A4C] to-[#0A192F] text-white select-none border border-red-600/40 ${className}`}
        title="Escudo Corporativo JJ"
      >
        <svg
          viewBox="0 0 100 100"
          className="w-full h-full p-1"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Escudo exterior */}
          <path
            d="M50 5 L88 18 C88 56 68 84 50 95 C32 84 12 56 12 18 Z"
            fill="#0A192F"
            stroke="#DC2626"
            strokeWidth="3.5"
          />
          {/* Línea interior dorada/blanca */}
          <path
            d="M50 11 L82 22 C82 53 65 77 50 87 C35 77 18 53 18 22 Z"
            stroke="#F8FAFC"
            strokeWidth="1.2"
            opacity="0.8"
          />
          {/* Franja central roja */}
          <path
            d="M32 45 L68 45 L64 53 L36 53 Z"
            fill="#DC2626"
          />
          {/* Letras JJ Monograma Corporativo */}
          <text
            x="50"
            y="42"
            textAnchor="middle"
            fill="#FFFFFF"
            fontSize="26"
            fontWeight="900"
            fontFamily="'Plus Jakarta Sans', sans-serif"
            letterSpacing="-1"
          >
            {fallbackText}
          </text>
          <text
            x="50"
            y="65"
            textAnchor="middle"
            fill="#F1F5F9"
            fontSize="7"
            fontWeight="700"
            letterSpacing="1.8"
            fontFamily="'Plus Jakarta Sans', sans-serif"
          >
            EXECUTIVE
          </text>
          <text
            x="50"
            y="74"
            textAnchor="middle"
            fill="#DC2626"
            fontSize="6"
            fontWeight="800"
            letterSpacing="1.2"
            fontFamily="'Plus Jakarta Sans', sans-serif"
          >
            SPORTS
          </text>
        </svg>
      </div>
    );
  }

  return (
    <img
      src={effectiveSrc}
      alt={alt}
      onError={() => {
        // If relative /src path or broken URL, try public fallback first, else show vector
        if (effectiveSrc !== '/images/logo.jpg' && effectiveSrc !== defaultLogoAsset) {
          // retry with defaultLogoAsset
          setHasError(false);
        } else {
          setHasError(true);
        }
      }}
      className={className}
      loading="eager"
    />
  );
};
