import { useId } from 'react'

/** Broche de estrela do Denkynho: peça esmaltada dourada, sem o ícone genérico do Lucide. */
export function DenkynhoStarPin() {
  const goldId = `denkPinGold${useId().replace(/[^a-zA-Z0-9]/g, '')}`
  return <svg className="denk-pin" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false" data-cosmetic="star-pin">
    <defs>
      <linearGradient id={goldId} x1="18" y1="8" x2="48" y2="56" gradientUnits="userSpaceOnUse">
        <stop offset="0" stopColor="#FFF6C8" />
        <stop offset="0.42" stopColor="#F0C94A" />
        <stop offset="1" stopColor="#B67A12" />
      </linearGradient>
    </defs>
    <circle cx="32" cy="33" r="12" fill="#5A4318" opacity="0.42" />
    <path d="M32 6 L38.17 23.51 L56.73 23.97 L41.99 35.24 L47.28 53.03 L32 42.5 L16.72 53.03 L22.01 35.24 L7.27 23.97 L25.83 23.51 Z" fill={`url(#${goldId})`} stroke="#3A2710" strokeWidth="2.4" strokeLinejoin="round" />
    <path d="M32 18 L35.29 27.47 L45.31 27.67 L37.33 33.73 L40.23 43.33 L32 37.6 L23.77 43.33 L26.67 33.73 L18.69 27.67 L28.71 27.47 Z" fill="#FFF8D8" opacity="0.38" />
    <path d="M32 9.5 L34.8 18.2 L27.4 17.9 Z" fill="#FFFBEA" opacity="0.7" />
  </svg>
}
