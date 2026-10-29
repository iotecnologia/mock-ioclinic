// Emblema da Dra. (o mesmo do protótipo Vitalis/AI Studio): órbita protetora + coração com fita.
// `tinta`: 'cor' (azul da marca) ou 'clara' (para fundo escuro) · `marcaDagua`: versão bem clara para o fundo da folha.
export function LogoDra({ tam = 48, tinta = 'cor', marcaDagua }: { tam?: number; tinta?: 'cor' | 'clara'; marcaDagua?: boolean }) {
  const orbita = tinta === 'clara' ? '#FFFFFF' : '#547793';
  const coracao = tinta === 'clara' ? '#DEE8F4' : '#0C3257';
  return (
    <svg width={tam} height={tam} viewBox="0 0 100 100" fill="none" aria-hidden="true" className={'logo-dra' + (marcaDagua ? ' marca-dagua' : '')}>
      <path d="M 50 14 C 28 14 10 32 10 54 C 10 74 27 90 48 90 C 58 90 67 86 73 80 C 66 84 57 86 48 86 C 30 86 14 71 14 53 C 14 34 30 18 50 18 C 68 18 84 32 86 50 C 87 43 85 36 80 29 C 73 19 62 14 50 14 Z" fill={orbita} />
      <path d="M 85 45 C 86.5 48 87 51 87 54 C 87 56 86.5 58 85.5 60 C 85.8 57 85.5 54 84.8 51 C 84.2 48.5 83 46 81.5 43.5 C 83.2 44.5 84.5 44.8 85 45 Z" fill="#91AFC7" />
      <path d="M 50 72 C 48 70 28 53 28 38 C 28 29 35 23 43 23 C 46.5 23 49.5 25 51 28 C 52.5 25 55.5 23 59 23 C 67 23 74 29 74 38 C 74 53 52 70 50 72 Z" fill={coracao} />
      <path d="M 50 67 C 48.5 65 32 50 32 38 C 32 31.5 37 26.5 43 26.5 C 45.8 26.5 48.2 28 49.5 30.5 C 50.8 28 53.2 26.5 56 26.5 C 62 26.5 67 31.5 67 38 C 67 50 51.5 65 50 67 Z" fill="#547793" opacity="0.35" />
      <path d="M 50 75 C 47.5 72.5 25 54 25 38 C 25 26.5 34 20 44 20 C 47.8 20 51.3 22.2 53 25.5 C 54.7 22.2 58.2 20 62 20 C 72 20 81 26.5 81 38 C 81 54 52.5 72.5 50 75 Z" stroke={orbita} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M 50 75 Q 49 82 45 85" stroke={orbita} strokeWidth="3.5" strokeLinecap="round" />
    </svg>
  );
}
