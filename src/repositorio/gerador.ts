// Gera a base FICTÍCIA do mock (pacientes, agenda de ~3 meses para trás e 4 semanas para frente, prontuários).
// Tudo relativo a "hoje", para a apresentação sempre ter agenda cheia no dia em que for aberta.
// Sorteio com semente fixa: a mesma data gera sempre a mesma base. Nenhum dado é de pessoa real.
import type { Agendamento, Atendimento, BaseClinica, Bloqueio, Cid, Clinica, Documento, Feriado, FormaPagamento, Paciente, ResumoClinico, Servico, Usuario } from '../tipos/modelos';
import { comparecimento, pedidoExames, receita } from '../regras/documentos';
import { situacaoDia, faixasDoDia } from '../regras/disponibilidade';
import { diaSemana, hhmm, min, somaDias } from '../util/datas';
import clinica from '../dados/clinica.json';
import usuarios from '../dados/usuarios.json';
import servicos from '../dados/servicos.json';
import feriados from '../dados/feriados.json';
import cids from '../dados/cid.json';

/** Sorteio previsível (mulberry32). */
function sorteador(semente: number) {
  let a = semente >>> 0;
  const r = () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const ent = (i: number, f: number) => i + Math.floor(r() * (f - i + 1));
  const um = <T,>(l: readonly T[]) => l[Math.floor(r() * l.length)];
  return { r, ent, um };
}

const NOMES_F = ['Ana', 'Beatriz', 'Carla', 'Daniela', 'Elaine', 'Fernanda', 'Gabriela', 'Helena', 'Isabela', 'Juliana', 'Lúcia', 'Mariana', 'Natália', 'Olga', 'Patrícia', 'Regina', 'Sandra', 'Tereza', 'Vera', 'Márcia', 'Rosana', 'Cecília', 'Denise', 'Sílvia'];
const NOMES_M = ['André', 'Bruno', 'Carlos', 'Diego', 'Eduardo', 'Fábio', 'Gustavo', 'Henrique', 'Igor', 'João', 'Luiz', 'Marcelo', 'Nelson', 'Otávio', 'Paulo', 'Ricardo', 'Sérgio', 'Thiago', 'Vitor', 'Roberto', 'Antônio', 'José', 'Wagner', 'Renato'];
const SOBRENOMES = ['Almeida', 'Barbosa', 'Cardoso', 'Duarte', 'Esteves', 'Ferraz', 'Gonçalves', 'Henriques', 'Lacerda', 'Machado', 'Nogueira', 'Oliveira', 'Pacheco', 'Queiroz', 'Ribeiro', 'Siqueira', 'Teixeira', 'Valente', 'Zanetti', 'Moreira', 'Prado', 'Rezende', 'Toledo', 'Vasconcelos', 'Brandão', 'Camargo', 'Furlan', 'Martins'];
const BAIRROS = ['Cambuí', 'Taquaral', 'Guanabara', 'Castelo', 'Barão Geraldo', 'Nova Campinas', 'Jardim Chapadão', 'Bosque', 'Botafogo', 'Vila Itapura', 'Jardim Proença', 'Sousas'];
const RUAS = ['Rua das Palmeiras', 'Rua dos Ipês', 'Av. das Amoreiras', 'Rua Jasmim', 'Rua dos Girassóis', 'Rua das Acácias', 'Av. Brasil Verde', 'Rua Hortênsia', 'Rua das Orquídeas', 'Rua Manacá'];

const QUEIXAS = ['Palpitações ocasionais há 2 meses', 'Controle de pressão arterial', 'Dor torácica aos esforços moderados', 'Check-up cardiológico anual', 'Cansaço e falta de ar ao subir escadas', 'Avaliação pré-operatória', 'Inchaço nos tornozelos no fim do dia', 'Tontura ao levantar', 'Retorno com resultado de exames', 'Acompanhamento de colesterol alto'];
const CIDS: [string, string][] = [['I10', 'Hipertensão essencial'], ['R00.2', 'Palpitações'], ['I20.9', 'Angina pectoris'], ['E78.0', 'Hipercolesterolemia pura'], ['I48', 'Fibrilação e flutter atrial'], ['R07.4', 'Dor torácica não especificada'], ['I25.1', 'Doença aterosclerótica do coração'], ['Z00.0', 'Exame médico geral'], ['I50.9', 'Insuficiência cardíaca']];
const HDAS = ['Refere sintomas há cerca de 2 meses, piora aos esforços, melhora com repouso.', 'Nega dor torácica, dispneia ou síncope. Em uso regular da medicação.', 'Episódios intermitentes, sem relação com esforço. Nega perda de consciência.', 'Assintomático. Vem para acompanhamento de rotina.'];
const EXAME_FISICO = 'BEG, corado, hidratado, eupneico. ACV: RCR 2T, BNF, sem sopros. AR: MV+ sem RA. Extremidades sem edema, pulsos presentes.';
const ALERGIAS = ['Nenhuma conhecida', 'Nenhuma conhecida', 'Nenhuma conhecida', 'Nenhuma conhecida', 'Dipirona', 'Penicilina', 'AAS', 'Contraste iodado', 'Sulfa'];
const MEDICAMENTOS = ['Losartana 50 mg — 1 cp de 12/12h', 'Atenolol 25 mg — 1 cp pela manhã', 'Sinvastatina 20 mg — 1 cp à noite', 'AAS 100 mg — 1 cp após o almoço', 'Anlodipino 5 mg — 1 cp pela manhã', 'Metformina 850 mg — 1 cp após o café e o jantar', 'Rosuvastatina 10 mg — 1 cp à noite', 'Hidroclorotiazida 25 mg — 1 cp pela manhã', 'Rivaroxabana 20 mg — 1 cp no jantar', 'Levotiroxina 50 mcg — 1 cp em jejum'];
const ANTECEDENTES = ['Hipertensão', 'Diabetes tipo 2', 'Dislipidemia', 'Tabagismo', 'Ex-tabagista', 'Obesidade', 'Sedentarismo', 'IAM prévio', 'História familiar de DAC', 'Hipotireoidismo'];
const LAB = ['Hemograma completo', 'Perfil lipídico', 'Glicemia de jejum', 'Hemoglobina glicada', 'Creatinina', 'Potássio', 'TSH'];
const CONDUTAS = ['Mantida medicação. Solicitado ecocardiograma. Retorno em 30 dias.', 'Ajuste de anti-hipertensivo. MAPA 24h solicitado.', 'Solicitado Holter 24h e exames laboratoriais.', 'Orientação de dieta e atividade física. Reavaliar em 6 meses.', 'Solicitado teste ergométrico. Retorno com resultado.', 'Exames normais. Alta do acompanhamento intensivo; revisão anual.'];

function cpfFicticio(s: ReturnType<typeof sorteador>): string {
  const n = Array.from({ length: 9 }, () => s.ent(0, 9));
  const dv = (l: number[]) => { const soma = l.reduce((t, d, i) => t + d * (l.length + 1 - i), 0); const r = (soma * 10) % 11; return r === 10 ? 0 : r; };
  n.push(dv(n)); n.push(dv(n));
  const t = n.join('');
  return `${t.slice(0, 3)}.${t.slice(3, 6)}.${t.slice(6, 9)}-${t.slice(9)}`;
}

/** A Dra. tem cerca de 200 pacientes. */
export const TOTAL_PACIENTES = 200;

export function gerarBase(hojeIso: string, agoraMin: number, semente = 20261024): BaseClinica {
  const s = sorteador(semente);
  const cli = clinica as Clinica;
  const servs = servicos as Servico[];
  const fers = feriados as Feriado[];

  // ---- bloqueio de exemplo: primeiro dia útil a partir de hoje + 9
  let dBloq = somaDias(hojeIso, 9);
  while (diaSemana(dBloq) === 0 || diaSemana(dBloq) === 6 || fers.some((f) => f.data === dBloq)) dBloq = somaDias(dBloq, 1);
  const bloqueios: Bloqueio[] = [{ data: dBloq, motivo: 'Congresso de Cardiologia (exemplo)' }];

  // ---- pacientes
  const pacientes: Paciente[] = [];
  const usados = new Set<string>();
  const alturas: Record<string, number> = {}, pesos: Record<string, number> = {};
  while (pacientes.length < TOTAL_PACIENTES) {
    const fem = s.r() < 0.55;
    const sob1 = s.um(SOBRENOMES), sob2 = s.um(SOBRENOMES);
    const nome = `${s.um(fem ? NOMES_F : NOMES_M)} ${sob1} ${sob2}`;
    if (sob1 === sob2 || usados.has(nome)) continue;
    usados.add(nome);
    const id = 'p' + String(pacientes.length + 1).padStart(2, '0');
    const ano = s.ent(1942, 1994);
    const tel = `(19) 9${s.ent(8000, 9999)}-${s.ent(1000, 9999)}`;
    const primeiro = nome.split(' ')[0].toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
    const lgpd = s.r() > 0.06;
    const criado = somaDias(hojeIso, -s.ent(120, 700));
    pacientes.push({
      id, nome, cpf: cpfFicticio(s), nascimento: `${ano}-${String(s.ent(1, 12)).padStart(2, '0')}-${String(s.ent(1, 28)).padStart(2, '0')}`,
      sexo: fem ? 'F' : 'M', telefone: tel, email: s.r() < 0.7 ? `${primeiro}.${id}@email.exemplo` : undefined,
      endereco: { cep: `130${s.ent(10, 99)}-${s.ent(100, 999)}`, logradouro: s.um(RUAS), numero: String(s.ent(10, 1999)), bairro: s.um(BAIRROS), cidade: 'Campinas', uf: 'SP' },
      contatoEmergencia: s.r() < 0.6 ? `${s.um(fem ? NOMES_M : NOMES_F)} (familiar) · (19) 9${s.ent(8000, 9999)}-${s.ent(1000, 9999)}` : undefined,
      consentimentoLgpd: lgpd, consentimentoData: lgpd ? criado : undefined, criadoEm: criado,
    });
    alturas[id] = fem ? s.ent(152, 172) : s.ent(165, 188);
    pesos[id] = fem ? s.ent(52, 92) : s.ent(64, 112);
  }

  // ---- agenda
  const exames = servs.filter((x) => x.tipo === 'exame');
  const consulta = servs.find((x) => x.id === 'consulta')!;
  const retorno = servs.find((x) => x.id === 'retorno')!;
  const formas: FormaPagamento[] = ['pix', 'pix', 'pix', 'cartao_credito', 'cartao_credito', 'cartao_debito', 'dinheiro'];
  const agendamentos: Agendamento[] = [];
  const atendimentos: Atendimento[] = [];
  const base = { clinica: cli, agendamentos, feriados: fers, bloqueios };

  // ---- quem vem quando (realista): ninguém duas vezes no mesmo dia; consulta no máx. 1 a cada 60 dias;
  // retorno só para quem consultou há 7–30 dias; exame de preferência para quem consultou há até 45 dias.
  const ultimaConsulta: Record<string, string> = {};
  const ultimoExame: Record<string, string> = {};
  const noDia = new Set<string>();
  let diaAtual = '';
  const legado = new Set<string>();
  const ativos = () => pacientes.filter((p) => !legado.has(p.id) && !noDia.has(p.id));
  function escolher(data: string, cabe60: boolean): { serv: Servico; pac: Paciente } | null {
    if (data !== diaAtual) { diaAtual = data; noDia.clear(); }
    const livres = ativos();
    const dias = (p: Paciente) => (ultimaConsulta[p.id] ? (+new Date(data) - +new Date(ultimaConsulta[p.id])) / 864e5 : Infinity);
    const x = s.r();
    let serv: Servico, cand: Paciente[];
    if (cabe60 && x < 0.16) { serv = retorno; cand = livres.filter((p) => dias(p) >= 7 && dias(p) <= 30); }
    else if (cabe60 && x < 0.55) { serv = consulta; cand = livres.filter((p) => dias(p) > 60); }
    else {
      serv = s.um(exames);
      const semExameRecente = livres.filter((p) => !ultimoExame[p.id] || (+new Date(data) - +new Date(ultimoExame[p.id])) / 864e5 > 25);
      cand = semExameRecente.filter((p) => dias(p) <= 45);
      if (!cand.length || s.r() < 0.3) cand = semExameRecente;
    }
    if (!cand.length) { if (serv === retorno && cabe60) { serv = consulta; cand = livres.filter((p) => dias(p) > 60); } }
    if (!cand.length) return null;
    const pac = s.um(cand);
    noDia.add(pac.id);
    if (serv.tipo === 'consulta') ultimaConsulta[pac.id] = data;
    if (serv.tipo === 'exame') ultimoExame[pac.id] = data;
    return { serv, pac };
  }

  // ---- ~12% dos pacientes vieram só há mais de 1 ano (aparecem no filtro "Revisão anual")
  const diasLegado = new Set<string>();
  for (const p of pacientes) {
    if (s.r() > 0.12) continue;
    legado.add(p.id);
    let d = somaDias(hojeIso, -s.ent(380, 620));
    while (!situacaoDia(d, { clinica: cli, agendamentos: [], feriados: fers, bloqueios }).aberto || diasLegado.has(d)) d = somaDias(d, 1);
    diasLegado.add(d);
    const id = 'a' + String(agendamentos.length + 1).padStart(4, '0');
    const valor = consulta.valor;
    agendamentos.push({ id, pacienteId: p.id, servicoId: 'consulta', data: d, hora: '09:00', duracaoMin: 60, status: 'atendido', pagamento: { status: 'pago', valor, forma: 'cartao_credito', pagoEm: d }, criadoEm: somaDias(d, -10) });
    const [cid, cidDescricao] = s.um(CIDS);
    atendimentos.push({ id: 'at' + id, agendamentoId: id, pacienteId: p.id, data: d, queixa: 'Check-up cardiológico anual', pa: '130/80', fc: s.ent(60, 88), pesoKg: pesos[p.id], alturaCm: alturas[p.id], cid, cidDescricao, conduta: 'Exames normais. Alta do acompanhamento intensivo; revisão anual.' });
    if (p.criadoEm > d) p.criadoEm = somaDias(d, -5);
    if (p.consentimentoData && p.consentimentoData > d) p.consentimentoData = p.criadoEm;
  }

  for (let off = -100; off <= 28; off++) {
    const data = somaDias(hojeIso, off);
    if (!situacaoDia(data, base).aberto) continue;
    const ocup = off < 0 ? 0.72 : off === 0 ? 0.9 : off <= 7 ? 0.6 - off * 0.03 : Math.max(0.12, 0.38 - (off - 7) * 0.012);
    for (const f of faixasDoDia(data, base)) {
      let t = f.inicio;
      while (t < f.fim) {
        if (s.r() > ocup) { t += cli.gradeMin; continue; }
        const cabe60 = t + 60 <= f.fim;
        const escolha = escolher(data, cabe60);
        if (!escolha) { t += cli.gradeMin; continue; }
        const { serv, pac } = escolha;
        const hora = hhmm(t);
        const fimMin = t + serv.duracaoMin;
        // status conforme o dia/horário
        let status: Agendamento['status'];
        if (off < 0) { const x = s.r(); status = x < 0.05 ? 'cancelado' : x < 0.1 ? 'faltou' : 'atendido'; }
        else if (off === 0) {
          if (fimMin <= agoraMin) status = 'atendido';
          else if (t <= agoraMin) status = 'em_atendimento';
          else if (t - agoraMin <= 60) status = 'chegou';
          else status = s.r() < 0.7 ? 'confirmado' : 'agendado';
        } else if (off <= 2) status = s.r() < 0.5 ? 'confirmado' : 'agendado';
        else status = s.r() < 0.15 ? 'confirmado' : 'agendado';
        // pagamento
        let pagamento: Agendamento['pagamento'];
        if (serv.valor === 0) pagamento = { status: 'isento', valor: 0 };
        else if (status === 'cancelado' || status === 'faltou') pagamento = undefined;
        else if (status === 'atendido' && (off < 0 ? s.r() > 0.03 : s.r() > 0.3)) {
          const forma = s.um(formas);
          const valor = forma === 'pix' || forma === 'dinheiro' ? +(serv.valor * (1 - cli.descontoPix / 100)).toFixed(2) : serv.valor;
          pagamento = { status: 'pago', valor, forma, pagoEm: data };
        } else pagamento = { status: 'pendente', valor: serv.valor };
        const id = 'a' + String(agendamentos.length + 1).padStart(4, '0');
        agendamentos.push({ id, pacienteId: pac.id, servicoId: serv.id, data, hora, duracaoMin: serv.duracaoMin, status, pagamento, criadoEm: somaDias(data, -s.ent(1, 20)) });
        // prontuário das consultas/retornos atendidos
        if (status === 'atendido' && serv.tipo !== 'exame') {
          const [cid, cidDescricao] = s.um(CIDS);
          atendimentos.push({
            id: 'at' + id, agendamentoId: id, pacienteId: pac.id, data,
            queixa: serv.tipo === 'retorno' ? 'Retorno com resultado de exames' : s.um(QUEIXAS),
            hda: s.um(HDAS), exameFisico: EXAME_FISICO,
            examesSolicitados: s.r() < 0.5 ? [s.um(exames).nome, ...(s.r() < 0.5 ? [s.um(LAB)] : [])] : [],
            retornoDias: s.r() < 0.6 ? 30 : undefined,
            pa: `${s.ent(11, 16)}${s.um(['0', '5'])}/${s.ent(7, 10)}0`, fc: s.ent(58, 96),
            pesoKg: pesos[pac.id] + s.ent(-2, 2), alturaCm: alturas[pac.id], cid, cidDescricao, conduta: s.um(CONDUTAS),
          });
        }
        t = fimMin;
      }
    }
  }

  // ---- resumo clínico e documentos dos pacientes que já consultaram
  const resumos: ResumoClinico[] = [];
  const documentos: Documento[] = [];
  const comAtendimento = new Set(atendimentos.map((a) => a.pacienteId));
  for (const p of pacientes) {
    if (!comAtendimento.has(p.id)) continue;
    const ant = [...new Set(Array.from({ length: s.ent(0, 3) }, () => s.um(ANTECEDENTES)))];
    const meds = [...new Set(Array.from({ length: s.ent(0, 3) }, () => s.um(MEDICAMENTOS)))];
    const ult = atendimentos.filter((a) => a.pacienteId === p.id).sort((x, y) => y.data.localeCompare(x.data))[0];
    resumos.push({ pacienteId: p.id, alergias: s.um(ALERGIAS), medicamentos: meds, antecedentes: ant, atualizadoEm: ult.data });
  }
  for (const at of atendimentos) {
    const p = pacientes.find((x) => x.id === at.pacienteId)!;
    const ag = agendamentos.find((x) => x.id === at.agendamentoId)!;
    if (at.examesSolicitados?.length) documentos.push({ id: 'd' + documentos.length, ...pedidoExames(p, { data: at.data, exames: at.examesSolicitados, indicacao: at.cid ? `${at.cid} · ${at.cidDescricao}` : undefined }) });
    const r = resumos.find((x) => x.pacienteId === p.id);
    if (r?.medicamentos.length && s.r() < 0.5) documentos.push({ id: 'd' + documentos.length, ...receita(p, { data: at.data, itens: r.medicamentos.map((m) => { const [nome, uso] = m.split(' — '); return { nome, uso: uso ?? '' }; }) }) });
    if (s.r() < 0.15) documentos.push({ id: 'd' + documentos.length, ...comparecimento(p, { data: at.data, de: ag.hora, ate: hhmm(min(ag.hora) + ag.duracaoMin) }) });
  }

  return { clinica: cli, usuarios: usuarios as Usuario[], servicos: servs, pacientes, agendamentos, atendimentos, resumos, documentos, cids: cids as Cid[], bloqueios, feriados: fers };
}
