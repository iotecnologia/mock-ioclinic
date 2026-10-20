// Datas sempre como texto 'YYYY-MM-DD' (dia local) e horas como 'HH:mm'. Evita erro de fuso.

const p2 = (n: number) => String(n).padStart(2, '0');

export const iso = (d: Date): string => `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`;
export const deIso = (s: string): Date => { const [a, m, d] = s.split('-').map(Number); return new Date(a, m - 1, d); };
export const somaDias = (s: string, n: number): string => { const d = deIso(s); d.setDate(d.getDate() + n); return iso(d); };
export const diaSemana = (s: string): number => deIso(s).getDay();
export const hoje = (): string => iso(new Date());

/** 'HH:mm' → minutos desde 00:00 */
export const min = (h: string): number => { const [a, b] = h.split(':').map(Number); return a * 60 + b; };
/** minutos → 'HH:mm' */
export const hhmm = (m: number): string => `${p2(Math.floor(m / 60))}:${p2(m % 60)}`;
export const agoraMin = (): number => { const d = new Date(); return d.getHours() * 60 + d.getMinutes(); };

const SEM = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];
const SEM_C = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const MES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];

export const nomeDia = (s: string) => SEM[diaSemana(s)];
export const nomeDiaCurto = (s: string) => SEM_C[diaSemana(s)];
export const nomeMes = (m: number) => MES[m];
/** '2026-10-20' → '20/10/2026' */
export const br = (s: string) => { const [a, m, d] = s.split('-'); return `${d}/${m}/${a}`; };
/** '2026-10-20' → '20/10' */
export const brCurto = (s: string) => { const [, m, d] = s.split('-'); return `${d}/${m}`; };
/** 'terça-feira, 20 de outubro de 2026' */
export const extenso = (s: string) => {
  const d = deIso(s); const dia = SEM[d.getDay()];
  return `${dia}${d.getDay() > 0 && d.getDay() < 6 ? '-feira' : ''}, ${d.getDate()} de ${MES[d.getMonth()]} de ${d.getFullYear()}`;
};
/** Segunda-feira da semana de uma data (semana de seg a sáb). */
export const inicioSemana = (s: string) => { const w = diaSemana(s); return somaDias(s, w === 0 ? 1 : 1 - w); };
