// Leitor da FINEP. As páginas públicas de oportunidades carregam as chamadas por
// JavaScript. O leitor abre essas páginas num navegador automatizado, como uma
// pessoa faria, e aproveita os dados que a própria página recebe para se montar.
import type { Fonte, ItemLista } from '../tipos.ts';
import { abrirNavegador } from '../util/navegador.ts';
import { htmlParaTexto, linha, resumir } from '../util/texto.ts';

interface Config {
  /** Páginas públicas da FINEP que exibem chamadas. */
  paginas: string[];
  /** Modelo do link de cada chamada; "{id}" é trocado pelo número da chamada. */
  modeloLink: string;
}

interface ChamadaFinep {
  id: number;
  titulo: string;
  situacao?: { key: string; name: string };
  publicoAlvo?: { name: string }[];
  dataDePublicacao?: string;
  vigenciaInicio?: string;
  prazoProposto?: string;
  descricao?: string;
}

function dataBr(iso: string): string {
  const [a, m, d] = iso.slice(0, 10).split('-');
  return `${d}/${m}/${a}`;
}

export async function finep(fonte: Fonte): Promise<ItemLista[]> {
  const c = fonte.config as unknown as Config;
  const navegador = await abrirNavegador();
  const pagina = await navegador.newPage();
  const chamadas = new Map<number, ChamadaFinep>();

  pagina.on('response', async (resposta) => {
    if (!resposta.url().includes('/o/c/chamadapublicas')) return;
    try {
      const corpo = (await resposta.json()) as { items?: ChamadaFinep[] };
      for (const item of corpo.items ?? []) chamadas.set(item.id, item);
    } catch {
      // Resposta que não é a lista de chamadas.
    }
  });

  try {
    for (const url of c.paginas) {
      await pagina.goto(url, { waitUntil: 'networkidle', timeout: 90_000 });
    }
  } finally {
    await pagina.close();
  }

  if (chamadas.size === 0) throw new Error('Nenhuma chamada recebida das páginas da FINEP. O site pode ter mudado.');

  return [...chamadas.values()].map((ch) => {
    const texto = ch.descricao ? htmlParaTexto(ch.descricao) : '';
    return {
      titulo: linha(ch.titulo),
      link: c.modeloLink.replace('{id}', String(ch.id)),
      texto,
      resumo: texto ? resumir(texto) : undefined,
      publicadoEm: ch.dataDePublicacao?.slice(0, 10),
      inscricoesInicio: ch.vigenciaInicio?.slice(0, 10),
      inscricoesFim: ch.prazoProposto?.slice(0, 10),
      situacaoFonte: ch.situacao?.name,
      publico: ch.publicoAlvo?.map((p) => p.name),
      origemDatas: ch.prazoProposto ? 'api' : undefined,
      trecho: ch.prazoProposto
        ? `Prazo informado nos dados da página da FINEP: ${dataBr(ch.prazoProposto)}` +
          (ch.vigenciaInicio ? ` (início em ${dataBr(ch.vigenciaInicio)})` : '')
        : undefined,
    };
  });
}
