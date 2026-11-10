// Leitor para páginas em que cada chamada fica num bloco HTML próprio
// (ex.: CNPq, EMBRAPII). Tudo é configurado por seletores CSS.
import * as cheerio from 'cheerio';
import type { Fonte, ItemLista } from '../tipos.ts';
import { baixarTexto } from '../util/http.ts';
import { linha, limparTexto, normalizarLink, resumir } from '../util/texto.ts';
import { dataNumerica } from '../util/datas.ts';

interface Config {
  /** Seletor de cada bloco de chamada. */
  item: string;
  /** Seletor do título dentro do bloco. */
  titulo: string;
  /** Seletor do link dentro do bloco. Padrão: o próprio título ou o primeiro link. */
  link?: string;
  /** Seletor do texto descritivo (onde costumam estar as datas). Padrão: o bloco inteiro. */
  texto?: string;
  /** Seletor da data de publicação. */
  publicado?: string;
}

export async function htmlItens(fonte: Fonte): Promise<ItemLista[]> {
  const c = fonte.config as unknown as Config;
  const $ = cheerio.load(await baixarTexto(fonte.url));
  const itens: ItemLista[] = [];

  $(c.item).each((_, el) => {
    const bloco = $(el);
    const titulo = linha(bloco.find(c.titulo).first().text());
    const ancora = c.link ? bloco.find(c.link).first() : bloco.find(c.titulo).filter('a').first();
    const href = (ancora.length ? ancora : bloco.find('a[href]').first()).attr('href');
    if (!titulo || !href) return;

    const texto = limparTexto((c.texto ? bloco.find(c.texto) : bloco).text());
    const publicado = c.publicado ? dataNumerica(bloco.find(c.publicado).first().text()) : undefined;

    itens.push({
      titulo,
      link: normalizarLink(href, fonte.url),
      texto,
      resumo: c.texto ? resumir(texto) : undefined,
      publicadoEm: publicado,
    });
  });
  return itens;
}
