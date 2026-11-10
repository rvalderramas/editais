// Leitura do texto de editais em PDF.
import { extractText, getDocumentProxy } from 'unpdf';
import { baixarBinario } from './http.ts';
import { limparTexto } from './texto.ts';

// A biblioteca de PDF usa Promise.try, que só existe a partir do Node 24.
const P = Promise as unknown as { try?: unknown };
if (typeof P.try !== 'function') {
  P.try = (fn: (...a: unknown[]) => unknown, ...args: unknown[]) => new Promise((ok) => ok(fn(...args)));
}

/** Páginas lidas de cada PDF: o cronograma costuma estar no início do edital. */
const PAGINAS_MAXIMAS = 15;

export async function textoDoPdf(url: string): Promise<string> {
  const { dados } = await baixarBinario(url);
  const documento = await getDocumentProxy(dados);
  const { text } = await extractText(documento, { mergePages: false });
  return limparTexto(text.slice(0, PAGINAS_MAXIMAS).join('\n'));
}

export function parecePdf(url: string): boolean {
  return /\.pdf($|[/?#@])/i.test(url);
}
