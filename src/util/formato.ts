// Formatação e validação de texto (moeda, CPF, telefone, busca sem acento).

const BRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
export const moeda = (v: number) => BRL.format(v);

export const semAcento = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
export const digitos = (s: string) => s.replace(/\D/g, '');

export const iniciais = (nome: string) => {
  const p = nome.replace(/^(dra?\.?)\s+/i, '').split(/\s+/).filter(Boolean);
  return ((p[0]?.[0] ?? '') + (p.length > 1 ? p[p.length - 1][0] : '')).toUpperCase();
};

export const mascaraCpf = (s: string) => {
  const d = digitos(s).slice(0, 11);
  return d.replace(/^(\d{3})(\d)/, '$1.$2').replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3').replace(/\.(\d{3})(\d{1,2})$/, '.$1-$2');
};
/** CPF parcialmente oculto, para telas da recepção e listas: ***.456.789-** */
export const cpfOculto = (s: string) => { const c = mascaraCpf(s); return c.length === 14 ? `***.${c.slice(4, 11)}-**` : c; };

export function cpfValido(s: string): boolean {
  const d = digitos(s);
  if (d.length !== 11 || /^(\d)\1+$/.test(d)) return false;
  const dv = (base: string, peso: number) => {
    let soma = 0;
    for (const ch of base) soma += Number(ch) * peso--;
    const r = (soma * 10) % 11;
    return r === 10 ? 0 : r;
  };
  return dv(d.slice(0, 9), 10) === Number(d[9]) && dv(d.slice(0, 10), 11) === Number(d[10]);
}

export const mascaraTelefone = (s: string) => {
  const d = digitos(s).slice(0, 11);
  if (d.length <= 10) return d.replace(/^(\d{2})(\d)/, '($1) $2').replace(/(\d{4})(\d)/, '$1-$2');
  return d.replace(/^(\d{2})(\d)/, '($1) $2').replace(/(\d{5})(\d)/, '$1-$2');
};
export const mascaraCep = (s: string) => digitos(s).slice(0, 8).replace(/^(\d{5})(\d)/, '$1-$2');

/** Link do WhatsApp com mensagem pronta. */
export const linkWhats = (tel: string, msg: string) => `https://wa.me/55${digitos(tel)}?text=${encodeURIComponent(msg)}`;

/** localStorage protegido: só para conveniência (tema). Nunca para dado de paciente. */
export const local = {
  ler<T>(k: string, p: T): T { try { const v = localStorage.getItem('ioclinic:' + k); return v ? (JSON.parse(v) as T) : p; } catch { return p; } },
  gravar(k: string, v: unknown) { try { localStorage.setItem('ioclinic:' + k, JSON.stringify(v)); } catch { /* sem armazenamento */ } },
};
