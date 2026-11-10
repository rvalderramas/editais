// Conversões de HTML em texto e normalização de links.
import * as cheerio from 'cheerio';

export function htmlParaTexto(html: string): string {
  const $ = cheerio.load(html);
  $('script, style, noscript, svg').remove();
  // Quebra de linha entre blocos para que itens de listas e tabelas não se misturem.
  $('br, p, li, tr, td, th, h1, h2, h3, h4, h5, h6, div').after('\n');
  return limparTexto($.root().text());
}

export function limparTexto(texto: string): string {
  return texto
    .replace(/ /g, ' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/\s*\n\s*/g, '\n')
    .replace(/\n{2,}/g, '\n')
    .trim();
}

/** Texto em uma única linha, para títulos. */
export function linha(texto: string): string {
  return texto.replace(/\s+/g, ' ').trim();
}

/** Resolve links relativos e desfaz embrulhos de redirecionamento (Outlook SafeLinks). */
export function normalizarLink(link: string, base: string): string {
  let url = new URL(link.trim(), base);
  if (url.hostname.endsWith('safelinks.protection.outlook.com')) {
    const destino = url.searchParams.get('url');
    if (destino) url = new URL(destino);
  }
  url.hash = '';
  return url.toString();
}

export function resumir(texto: string, limite = 400): string {
  const t = linha(texto);
  if (t.length <= limite) return t;
  const corte = t.slice(0, limite);
  return corte.slice(0, corte.lastIndexOf(' ')) + '…';
}
