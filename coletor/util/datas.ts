// Extração de datas de inscrição a partir de texto em português.
//
// Estratégia: localizar palavras-chave ("inscrições", "submissão", "data-limite", "prazo")
// e ler as datas que aparecem logo depois delas. O trecho usado é devolvido para que
// qualquer pessoa possa conferir de onde a data saiu.

const MESES: Record<string, number> = {
  janeiro: 1, fevereiro: 2, março: 3, marco: 3, abril: 4, maio: 5, junho: 6,
  julho: 7, agosto: 8, setembro: 9, outubro: 10, novembro: 11, dezembro: 12,
};
const NOMES_MESES = Object.keys(MESES).join('|');

const PADRAO_DATA = new RegExp(
  [
    // 26/10/2026, 26.10.26
    String.raw`(?<dn>\d{1,2})[/.](?<mn>\d{1,2})[/.](?<an>\d{4}|\d{2})(?!\d)`,
    // 26/10 (sem ano)
    String.raw`(?<dc>\d{1,2})/(?<mc>\d{1,2})(?![\d/])`,
    // 18 de novembro de 2026, 1º de março 2027, 18 de novembro
    String.raw`(?<dl>\d{1,2})\s*[º°]?\s+de\s+(?<ml>${NOMES_MESES})(?:\s*(?:de|,)?\s+(?<al>\d{4}))?`,
    // "08" em "08 a 25 de março" (dia que compartilha o mês da data seguinte)
    String.raw`(?<ds>\d{1,2})(?=\s*(?:a|e|até)\s+\d{1,2}\s*[º°]?\s+de\s+(?:${NOMES_MESES}))`,
  ].join('|'),
  'gi',
);

interface Ficha {
  dia: number;
  mes?: number;
  ano?: number;
  ini: number;
  fim: number;
}

function lerFichas(texto: string): Ficha[] {
  const fichas: Ficha[] = [];
  for (const m of texto.matchAll(PADRAO_DATA)) {
    const g = m.groups!;
    const ini = m.index!;
    const fim = ini + m[0].length;
    if (g.dn) fichas.push({ dia: +g.dn, mes: +g.mn, ano: ajustarAno(+g.an), ini, fim });
    else if (g.dc) fichas.push({ dia: +g.dc, mes: +g.mc, ini, fim });
    else if (g.dl) fichas.push({ dia: +g.dl, mes: MESES[g.ml.toLowerCase()], ano: g.al ? +g.al : undefined, ini, fim });
    else if (g.ds) fichas.push({ dia: +g.ds, ini, fim });
  }
  return fichas.filter((f) => f.dia >= 1 && f.dia <= 31 && (f.mes === undefined || (f.mes >= 1 && f.mes <= 12)));
}

function ajustarAno(ano: number): number {
  return ano < 100 ? 2000 + ano : ano;
}

function iso(ano: number, mes: number, dia: number): string | undefined {
  const d = new Date(Date.UTC(ano, mes - 1, dia));
  if (d.getUTCMonth() !== mes - 1) return undefined;
  return d.toISOString().slice(0, 10);
}

// Aceita "a", "até", "–" e também horários no meio: "até as 18h do dia", "até às 23:59 do dia".
const SEPARADOR_INTERVALO =
  /^\s*(?:a|até|ate|e|ao|à|-|–|—)(?:\s+(?:as|às|o)?\s*\d{1,2}(?::\d{2}|h\d{0,2})?(?:min)?)?(?:\s+(?:do|de)\s+dia)?\s*$/i;

// Entre a palavra-chave e a data: indica que a data é de um ato legal, não do prazo.
const EXCLUIR_ENTRE = /portaria|resolu[çc][ãa]o|decreto|\blei\b|publicad|di[áa]rio oficial/i;

const PALAVRAS_CHAVE: RegExp[] = [
  /inscri[çc](?:[õo]es|[ãa]o)|per[íi]odo de inscri/gi,
  /submiss[ãa]o|submeter|envio d[aeo]s? (?:pr[ée]-?)?propostas?|recebimento d[aeo]s? propostas?|apresenta[çc][ãa]o d[aeo]s? propostas?/gi,
  /data[- ]limite|prazo final|prazo (?:para|de) (?:o )?(?:envio|submiss|inscri|apresenta|candidat)/gi,
  /\bprazo\b/gi,
];

// Contextos que indicam outra etapa do cronograma, não o período de inscrição.
const EXCLUIR_CONTEXTO = /recurso|resultado|homologa|divulga|impugna|esclarecimento|d[úu]vidas|contrata/i;

const JANELA_DEPOIS = 140;

export interface DatasEncontradas {
  inicio?: string;
  fim?: string;
  fluxoContinuo?: boolean;
  trecho?: string;
}

/**
 * Procura o período de inscrição em um texto.
 * @param anoReferencia ano usado quando a data não traz ano e nada ao redor indica outro.
 */
export function extrairDatas(texto: string, anoReferencia = new Date().getUTCFullYear()): DatasEncontradas {
  const t = texto.replace(/\s+/g, ' ');

  for (const chave of PALAVRAS_CHAVE) {
    for (const m of t.matchAll(chave)) {
      const posChave = m.index!;
      const fimChave = posChave + m[0].length;
      // Olha só a mesma frase: o que vem antes de um ponto pertence a outra etapa.
      const antesDaChave = t.slice(Math.max(0, posChave - 40), posChave).split(/[.;]/).pop()!;
      const contexto = antesDaChave + t.slice(posChave, fimChave + 20);
      if (EXCLUIR_CONTEXTO.test(contexto)) continue;

      const janela = t.slice(fimChave, fimChave + JANELA_DEPOIS);
      const fichas = lerFichas(janela);
      if (fichas.length === 0) continue;

      const [a, b] = fichas;
      if (EXCLUIR_ENTRE.test(janela.slice(0, a.ini))) continue;
      const intervalo = b && SEPARADOR_INTERVALO.test(janela.slice(a.fim, b.ini));
      completar(a, intervalo ? b : undefined, anoReferencia);
      if (b) completar(b, undefined, anoReferencia);

      const antes = janela.slice(0, a.ini);
      const fluxo = /fluxo cont[íi]nuo/i.test(antes) || undefined;
      const ultimo = intervalo ? b : a;
      const trecho = t.slice(posChave, fimChave + ultimo.fim).trim();

      const dataA = iso(a.ano!, a.mes!, a.dia);
      if (!dataA) continue;
      if (intervalo) {
        const dataB = iso(b.ano!, b.mes!, b.dia);
        if (!dataB) continue;
        return { inicio: dataA, fim: dataB, fluxoContinuo: fluxo, trecho };
      }
      if (/a partir d[eo]|in[íi]cio/i.test(antes)) return { inicio: dataA, fluxoContinuo: fluxo, trecho };
      return { fim: dataA, fluxoContinuo: fluxo, trecho };
    }
  }

  const fluxo = t.match(/.{0,60}fluxo cont[íi]nuo.{0,40}/i);
  if (fluxo) return { fluxoContinuo: true, trecho: fluxo[0].trim() };
  return {};
}

/** Preenche mês e ano ausentes usando a data seguinte do intervalo ou o ano de referência. */
function completar(f: Ficha, seguinte: Ficha | undefined, anoReferencia: number): void {
  if (f.mes === undefined) f.mes = seguinte?.mes;
  if (f.ano === undefined) {
    if (seguinte?.ano !== undefined) {
      // "22 de dezembro a 05 de janeiro de 2027": a primeira data é do ano anterior.
      f.ano = f.mes! > seguinte.mes! ? seguinte.ano - 1 : seguinte.ano;
    } else {
      f.ano = anoReferencia;
    }
  }
}

/** Converte "26/10/2026" ou "26/10/2026 11h52" em "2026-10-26". */
export function dataNumerica(texto: string): string | undefined {
  const m = texto.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  return m ? iso(+m[3], +m[2], +m[1]) : undefined;
}
