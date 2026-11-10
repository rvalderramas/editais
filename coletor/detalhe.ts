// Segunda etapa da coleta: abrir a página (ou o PDF) de um edital para encontrar
// as datas de inscrição quando a lista da fonte não as traz.
import * as cheerio from 'cheerio';
import type { Fonte, OrigemDado } from './tipos.ts';
import { baixarTexto } from './util/http.ts';
import { extrairDatas, type DatasEncontradas } from './util/datas.ts';
import { htmlParaTexto, linha, normalizarLink } from './util/texto.ts';
import { parecePdf, textoDoPdf } from './util/pdf.ts';

export interface ResultadoDetalhe {
  datas: DatasEncontradas;
  origem: OrigemDado;
  url: string;
  pdf?: string;
}

export async function buscarDetalhe(fonte: Fonte, link: string, anoReferencia: number): Promise<ResultadoDetalhe> {
  if (parecePdf(link)) {
    return { datas: extrairDatas(await textoDoPdf(link), anoReferencia), origem: 'pdf', url: link, pdf: link };
  }

  const html = await baixarTexto(link);
  const $ = cheerio.load(html);
  const area = fonte.detalhe?.conteudo ? $(fonte.detalhe.conteudo) : $('main').length ? $('main') : $('body');
  const datasPagina = extrairDatas(htmlParaTexto(area.html() ?? ''), anoReferencia);

  const pdf = fonte.detalhe?.pdf ? acharPdf($, area, fonte.detalhe.pdf, link) : undefined;
  if (datasPagina.fim || datasPagina.inicio || !pdf) {
    return { datas: datasPagina, origem: 'pagina', url: link, pdf };
  }

  const datasPdf = extrairDatas(await textoDoPdf(pdf), anoReferencia);
  return { datas: datasPdf, origem: 'pdf', url: pdf, pdf };
}

/** Primeiro link de PDF cujo texto casa com a expressão (ex.: "^Edital"). */
function acharPdf($: cheerio.CheerioAPI, area: cheerio.Cheerio<any>, padrao: string, base: string): string | undefined {
  const regex = new RegExp(padrao, 'i');
  for (const a of area.find('a[href]').toArray()) {
    const href = $(a).attr('href')!;
    if (regex.test(linha($(a).text())) && parecePdf(href)) return normalizarLink(href, base);
  }
  return undefined;
}
