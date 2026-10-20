// Regras do paciente: idade, busca e histórico (linha do tempo).
import type { BaseClinica, Paciente, Perfil } from '../tipos/modelos';
import { deIso, min } from '../util/datas';
import { digitos, semAcento } from '../util/formato';
import { STATUS } from './agenda';

export function idade(nascimento: string, ref: string): number {
  const n = deIso(nascimento), r = deIso(ref);
  let i = r.getFullYear() - n.getFullYear();
  if (r.getMonth() < n.getMonth() || (r.getMonth() === n.getMonth() && r.getDate() < n.getDate())) i--;
  return i;
}

/** Busca por nome (sem acento, qualquer parte) ou por CPF/telefone (só números). */
export function buscarPacientes(lista: Paciente[], termo: string): Paciente[] {
  const t = semAcento(termo);
  if (!t) return [...lista].sort((a, b) => a.nome.localeCompare(b.nome));
  const num = digitos(termo);
  const partes = t.split(/\s+/);
  return lista
    .filter((p) => {
      if (num.length >= 3 && (digitos(p.cpf).includes(num) || digitos(p.telefone).includes(num))) return true;
      const n = semAcento(p.nome);
      return partes.every((x) => n.includes(x));
    })
    .sort((a, b) => a.nome.localeCompare(b.nome));
}

export interface ItemHistorico {
  data: string; hora?: string;
  tipo: 'agendamento' | 'pagamento' | 'clinico' | 'cadastro';
  titulo: string; detalhe?: string; status?: string; statusCls?: string;
}

type BaseHist = Pick<BaseClinica, 'agendamentos' | 'servicos' | 'atendimentos' | 'pacientes'>;

/**
 * Linha do tempo do paciente, do mais recente para o mais antigo.
 * A recepção vê só o administrativo (agenda e pagamentos). O conteúdo clínico aparece só para a médica (LGPD).
 */
export function historico(pacienteId: string, b: BaseHist, perfil: Perfil): ItemHistorico[] {
  const itens: ItemHistorico[] = [];
  const pac = b.pacientes.find((p) => p.id === pacienteId);
  for (const a of b.agendamentos.filter((x) => x.pacienteId === pacienteId)) {
    const s = b.servicos.find((x) => x.id === a.servicoId);
    itens.push({ data: a.data, hora: a.hora, tipo: 'agendamento', titulo: s?.nome ?? a.servicoId, status: STATUS[a.status].nome, statusCls: STATUS[a.status].cls });
    if (a.pagamento?.status === 'pago') {
      itens.push({ data: a.pagamento.pagoEm ?? a.data, hora: a.hora, tipo: 'pagamento', titulo: 'Pagamento recebido', detalhe: `${s?.curto ?? ''} · ${a.pagamento.forma ?? ''}`, status: 'pago' });
    }
    if (perfil === 'medica') {
      const at = b.atendimentos.find((x) => x.agendamentoId === a.id);
      if (at) {
        const sinais = [at.pa && `PA ${at.pa}`, at.fc && `FC ${at.fc} bpm`, at.pesoKg && `${at.pesoKg} kg`].filter(Boolean).join(' · ');
        itens.push({ data: at.data, hora: a.hora, tipo: 'clinico', titulo: at.cid ? `${at.cid} · ${at.cidDescricao}` : 'Evolução clínica', detalhe: [at.queixa, sinais, at.conduta].filter(Boolean).join(' — ') });
      }
    }
  }
  if (pac) itens.push({ data: pac.criadoEm, tipo: 'cadastro', titulo: 'Cadastro do paciente', detalhe: pac.consentimentoLgpd ? 'Termo LGPD aceito' : 'Termo LGPD pendente' });
  const ordemTipo = { clinico: 0, pagamento: 1, agendamento: 2, cadastro: 3 };
  return itens.sort((x, y) => y.data.localeCompare(x.data) || min(y.hora ?? '00:00') - min(x.hora ?? '00:00') || ordemTipo[x.tipo] - ordemTipo[y.tipo]);
}

/** Última visita (atendido) e próximo agendamento futuro. */
export function resumoPaciente(pacienteId: string, b: Pick<BaseClinica, 'agendamentos'>, hojeIso: string) {
  const ags = b.agendamentos.filter((a) => a.pacienteId === pacienteId);
  const ultima = ags.filter((a) => a.status === 'atendido').sort((x, y) => y.data.localeCompare(x.data))[0];
  const proximo = ags.filter((a) => a.data >= hojeIso && ['agendado', 'confirmado', 'chegou'].includes(a.status)).sort((x, y) => x.data.localeCompare(y.data) || min(x.hora) - min(y.hora))[0];
  return { ultima, proximo, total: ags.filter((a) => a.status === 'atendido').length };
}
