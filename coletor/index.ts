// Coleta diária: lê cada fonte ativa, completa as datas e grava os arquivos em dados/.
//
// Uso:
//   npm run coletar                 (todas as fontes)
//   npm run coletar:fonte -- cnpq   (só uma fonte)
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import type { Correcao, Edital, Fonte, ItemLista, ResultadoFonte, Status } from './tipos.ts';
import { leitores } from './leitores/index.ts';
import { buscarDetalhe } from './detalhe.ts';
import { extrairDatas } from './util/datas.ts';
import { esperar } from './util/http.ts';
import { fecharNavegador } from './util/navegador.ts';

const ARQ = {
  fontes: 'dados/fontes.json',
  editais: 'dados/editais.json',
  correcoes: 'dados/correcoes.json',
  execucoes: 'dados/execucoes.json',
};

/** Datas tiradas de página ou PDF são reaproveitadas por alguns dias antes de nova consulta. */
const DIAS_VALIDADE_DETALHE = 3;
const PAUSA_ENTRE_PAGINAS_MS = 500;
const EXECUCOES_GUARDADAS = 60;

async function lerJson<T>(caminho: string, padrao: T): Promise<T> {
  try {
    return JSON.parse(await readFile(caminho, 'utf8')) as T;
  } catch {
    return padrao;
  }
}

async function gravarJson(caminho: string, dados: unknown): Promise<void> {
  await writeFile(caminho, JSON.stringify(dados, null, 2) + '\n');
}

/** Data de hoje no horário de Brasília, no formato AAAA-MM-DD. */
function hojeBrasilia(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date());
}

function idEdital(fonte: string, link: string): string {
  return `${fonte}-${createHash('sha1').update(link).digest('hex').slice(0, 10)}`;
}

function filtrar(fonte: Fonte, itens: ItemLista[]): ItemLista[] {
  const ignorar = fonte.filtros?.ignorarTitulo ? new RegExp(fonte.filtros.ignorarTitulo, 'i') : undefined;
  const anoMinimo = fonte.filtros?.anoMinimo;
  const vistos = new Set<string>();
  return itens.filter((item) => {
    if (vistos.has(item.link)) return false;
    vistos.add(item.link);
    if (ignorar?.test(item.titulo)) return false;
    if (anoMinimo) {
      const anos = [...item.titulo.matchAll(/\b(20\d{2})\b/g)].map((m) => +m[1]);
      if (anos.length && Math.max(...anos) < anoMinimo) return false;
    }
    return true;
  });
}

export function calcularStatus(e: Pick<Edital, 'inscricoesFim' | 'fluxoContinuo' | 'situacaoFonte'>, hoje: string): Status {
  if (e.inscricoesFim) return e.inscricoesFim < hoje ? 'encerrada' : 'aberta';
  if (e.situacaoFonte && /encerrad|realizad|finalizad/i.test(e.situacaoFonte)) return 'encerrada';
  if (e.fluxoContinuo) return 'aberta';
  return 'sem-prazo';
}

/** Aponta quando a situação declarada pela fonte contradiz o prazo encontrado. */
export function verificarDivergencia(e: Edital): string | undefined {
  const s = e.situacaoFonte ?? '';
  if (/abert|andamento/i.test(s) && e.status === 'encerrada') {
    return `A fonte ainda apresenta este edital como "${s}", mas o prazo encontrado já passou. Confira na fonte.`;
  }
  if (/encerrad|realizad/i.test(s) && e.status === 'aberta' && e.inscricoesFim) {
    return `A fonte informa "${s}", mas o prazo encontrado ainda não passou. Confira na fonte.`;
  }
  return undefined;
}

function diasDesde(dataIso: string | undefined, hoje: string): number {
  if (!dataIso) return Infinity;
  return (Date.parse(hoje) - Date.parse(dataIso.slice(0, 10))) / 86_400_000;
}

async function processarFonte(
  fonte: Fonte,
  anteriores: Map<string, Edital>,
  hoje: string,
): Promise<{ editais: Edital[]; resultado: ResultadoFonte }> {
  const inicio = new Date().toISOString();
  const leitor = leitores[fonte.leitor];
  if (!leitor) throw new Error(`Leitor desconhecido: "${fonte.leitor}"`);

  const itens = filtrar(fonte, await leitor(fonte));
  const anoReferencia = +hoje.slice(0, 4);
  const editais: Edital[] = [];

  for (const item of itens) {
    const id = idEdital(fonte.id, item.link);
    const antigo = anteriores.get(id);
    const e: Edital = {
      id,
      fonte: fonte.id,
      orgao: fonte.sigla,
      titulo: item.titulo,
      link: item.link,
      resumo: item.resumo ?? antigo?.resumo,
      publicadoEm: item.publicadoEm ?? antigo?.publicadoEm,
      situacaoFonte: item.situacaoFonte,
      publico: item.publico,
      valor: item.valor,
      area: item.area,
      modalidade: item.modalidade,
      status: 'sem-prazo',
      primeiraVezVisto: antigo?.primeiraVezVisto ?? hoje,
      ultimaVerificacao: hoje,
    };

    // 1. Datas fornecidas pela própria fonte em dados estruturados.
    if (item.inscricoesFim || item.inscricoesInicio) {
      e.inscricoesInicio = item.inscricoesInicio;
      e.inscricoesFim = item.inscricoesFim;
      e.evidencia = { origem: item.origemDatas ?? 'lista', url: fonte.url, trecho: item.trecho };
    }

    // 2. Datas escritas no texto da lista.
    if (!e.evidencia && item.texto) {
      const d = extrairDatas(item.texto, anoReferencia);
      if (d.fim || d.inicio || d.fluxoContinuo) {
        Object.assign(e, { inscricoesInicio: d.inicio, inscricoesFim: d.fim, fluxoContinuo: d.fluxoContinuo });
        e.evidencia = { origem: 'lista', url: fonte.url, trecho: d.trecho };
      }
    }

    // 3. Página ou PDF do edital (reaproveita consulta recente).
    if (!e.evidencia && (fonte.detalhe?.pagina || fonte.detalhe?.pdf)) {
      const recente = antigo && antigo.link === e.link && diasDesde(antigo.detalheVerificadoEm, hoje) < DIAS_VALIDADE_DETALHE;
      if (recente) {
        Object.assign(e, {
          inscricoesInicio: antigo.inscricoesInicio,
          inscricoesFim: antigo.inscricoesFim,
          fluxoContinuo: antigo.fluxoContinuo,
          evidencia: antigo.evidencia,
          pdf: antigo.pdf,
          detalheVerificadoEm: antigo.detalheVerificadoEm,
        });
      } else {
        try {
          const det = await buscarDetalhe(fonte, e.link, anoReferencia);
          e.detalheVerificadoEm = hoje;
          e.pdf = det.pdf;
          const d = det.datas;
          if (d.fim || d.inicio || d.fluxoContinuo) {
            Object.assign(e, { inscricoesInicio: d.inicio, inscricoesFim: d.fim, fluxoContinuo: d.fluxoContinuo });
            e.evidencia = { origem: det.origem, url: det.url, trecho: d.trecho };
          }
        } catch (erro) {
          console.warn(`  ! detalhe de "${e.titulo}": ${(erro as Error).message}`);
        }
        await esperar(PAUSA_ENTRE_PAGINAS_MS);
      }
    }

    // 4. "Fluxo contínuo" no próprio título.
    if (!e.evidencia && /fluxo cont[íi]nuo/i.test(e.titulo)) {
      e.fluxoContinuo = true;
      e.evidencia = { origem: 'lista', url: fonte.url, trecho: e.titulo };
    }

    e.status = calcularStatus(e, hoje);
    editais.push(e);
  }

  return {
    editais,
    resultado: {
      fonte: fonte.id,
      inicio,
      fim: new Date().toISOString(),
      ok: true,
      encontrados: editais.length,
      comPrazo: editais.filter((e) => e.inscricoesFim).length,
    },
  };
}

function aplicarCorrecoes(e: Edital, c: Correcao | undefined, hoje: string): Edital | undefined {
  if (!c) return e;
  if (c.oculto) return undefined;
  const corrigido = { ...e };
  if (c.inscricoesInicio !== undefined) corrigido.inscricoesInicio = c.inscricoesInicio;
  if (c.inscricoesFim !== undefined) corrigido.inscricoesFim = c.inscricoesFim;
  if (c.fluxoContinuo !== undefined) corrigido.fluxoContinuo = c.fluxoContinuo;
  if (c.inscricoesInicio !== undefined || c.inscricoesFim !== undefined) {
    corrigido.evidencia = { origem: 'manual', url: e.link, trecho: c.observacao };
  }
  corrigido.status = calcularStatus(corrigido, hoje);
  corrigido.alerta = c.inscricoesFim !== undefined ? undefined : corrigido.alerta;
  return corrigido;
}

async function principal(): Promise<void> {
  const somente = process.argv.includes('--fonte') ? process.argv[process.argv.indexOf('--fonte') + 1] : undefined;
  const hoje = hojeBrasilia();

  const fontes = (await lerJson<Fonte[]>(ARQ.fontes, [])).filter((f) => f.ativa && (!somente || f.id === somente));
  const base = await lerJson<{ editais: Edital[] }>(ARQ.editais, { editais: [] });
  const correcoes = await lerJson<Record<string, Correcao>>(ARQ.correcoes, {});
  const execucoes = await lerJson<{ fontes: ResultadoFonte[]; historico: unknown[] }>(ARQ.execucoes, { fontes: [], historico: [] });

  const anteriores = new Map(base.editais.map((e) => [e.id, e]));
  const porFonte = new Map<string, Edital[]>();
  for (const e of base.editais) porFonte.set(e.fonte, [...(porFonte.get(e.fonte) ?? []), e]);

  const resultados = new Map(execucoes.fontes.map((r) => [r.fonte, r]));

  try {
    for (const fonte of fontes) {
      console.log(`→ ${fonte.sigla}`);
      try {
        const { editais, resultado } = await processarFonte(fonte, anteriores, hoje);
        porFonte.set(fonte.id, editais);
        resultados.set(fonte.id, resultado);
        console.log(`  ${resultado.encontrados} editais, ${resultado.comPrazo} com prazo`);
      } catch (erro) {
        // Falha da fonte: mantém os editais da coleta anterior e registra o erro.
        const mensagem = (erro as Error).message;
        console.error(`  ✗ ${mensagem}`);
        resultados.set(fonte.id, {
          fonte: fonte.id, inicio: new Date().toISOString(), fim: new Date().toISOString(),
          ok: false, encontrados: porFonte.get(fonte.id)?.length ?? 0, comPrazo: 0, erro: mensagem,
        });
      }
    }
  } finally {
    await fecharNavegador();
  }

  const todos = [...porFonte.values()]
    .flat()
    .map((e) => {
      const atual = { ...e, status: calcularStatus(e, hoje) };
      atual.alerta = verificarDivergencia(atual);
      return aplicarCorrecoes(atual, correcoes[e.id], hoje);
    })
    .filter((e): e is Edital => !!e)
    .sort((a, b) => (a.inscricoesFim ?? '9999').localeCompare(b.inscricoesFim ?? '9999') || a.titulo.localeCompare(b.titulo));

  await gravarJson(ARQ.editais, { atualizadoEm: new Date().toISOString(), editais: todos });

  const listaResultados = [...resultados.values()];
  await gravarJson(ARQ.execucoes, {
    ultimaExecucao: new Date().toISOString(),
    fontes: listaResultados,
    historico: [
      {
        data: new Date().toISOString(),
        total: todos.length,
        falhas: listaResultados.filter((r) => !r.ok).map((r) => r.fonte),
      },
      ...execucoes.historico,
    ].slice(0, EXECUCOES_GUARDADAS),
  });

  const falhas = listaResultados.filter((r) => !r.ok);
  console.log(`\nTotal: ${todos.length} editais. Fontes com falha: ${falhas.length ? falhas.map((f) => f.fonte).join(', ') : 'nenhuma'}.`);
}

principal().catch((erro) => {
  console.error(erro);
  process.exit(1);
});
