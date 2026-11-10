// Leitor para páginas em que as chamadas não ficam em blocos HTML próprios, mas em
// sequência, separadas por uma marca (uma linha <hr>, um título <h4>, um item <li>).
// Ex.: FAPESP, BNDES, CAPES. Configurado por marcas de texto e seletores CSS.
import * as cheerio from 'cheerio';
import type { Fonte, ItemLista } from '../tipos.ts';
import { baixarTexto } from '../util/http.ts';
import { htmlParaTexto, linha, normalizarLink } from '../util/texto.ts';

interface Config {
  /** Texto que marca o início da região com as chamadas. */
  inicio?: string;
  /** Texto que marca o fim da região. */
  fim?: string;
  /** Expressão regular que divide a região em blocos (ex.: "<hr\\b[^>]*>" ou "(?=<h4\\b)"). */
  separador: string;
  /** Seletor do título dentro de cada bloco. */
  titulo: string;
  /** Seletor do link dentro do bloco. Padrão: primeiro link. */
  link?: string;
  /** Campos extras lidos do texto do bloco por expressão regular (o grupo 1 é o valor). */
  campos?: Partial<Record<'area' | 'modalidade' | 'valor', string>>;
  /** Situação informada pela fonte para todos os itens desta região (ex.: "em andamento"). */
  situacao?: string;
}

export async function htmlBlocos(fonte: Fonte): Promise<ItemLista[]> {
  const c = fonte.config as unknown as Config;
  const html = await baixarTexto(fonte.url);
  const regiao = recortar(html, c.inicio, c.fim);
  const itens: ItemLista[] = [];

  for (const pedaco of regiao.split(new RegExp(c.separador, 'i'))) {
    const $ = cheerio.load(pedaco, null, false);
    const titulo = linha($(c.titulo).first().text());
    const href = $(c.link ?? 'a[href]').first().attr('href');
    if (!titulo || !href) continue;

    const texto = htmlParaTexto(pedaco);
    const item: ItemLista = { titulo, link: normalizarLink(href, fonte.url), texto, situacaoFonte: c.situacao };
    for (const [campo, padrao] of Object.entries(c.campos ?? {})) {
      const m = texto.match(new RegExp(padrao, 'im'));
      if (m) item[campo as 'area' | 'modalidade' | 'valor'] = linha(m[1]);
    }
    itens.push(item);
  }
  return itens;
}

function recortar(html: string, inicio?: string, fim?: string): string {
  let i = 0;
  if (inicio) {
    i = html.indexOf(inicio);
    if (i < 0) throw new Error(`Marca de início não encontrada: "${inicio}". A página pode ter mudado.`);
  }
  let f = html.length;
  if (fim) {
    const pos = html.indexOf(fim, i + (inicio?.length ?? 0));
    if (pos >= 0) f = pos;
  }
  return html.slice(i, f);
}
