// Classificação de editais por temas de interesse (ex.: as linhas de pesquisa do CIIDCMIL).
// Os termos ficam em dados/temas.json para poderem ser ajustados sem mexer no código.
// Cada termo encontrado vale pontos (forte: 2, de apoio: 1); o edital entra no tema ao
// atingir a pontuação mínima. Os termos encontrados são guardados para mostrar o motivo.
import { readFileSync } from 'node:fs';
import path from 'node:path';
import type { Edital } from '@/coletor/tipos.ts';

export interface Tema {
  nome: string;
  descricao: string;
  pontosMinimos: number;
  termosFortes: string[];
  termosDeApoio: string[];
  /** Ids de editais incluídos ou excluídos à mão. */
  incluir: string[];
  excluir: string[];
  /** Chamadas abertas a todas as áreas também entram no tema: termos procurados na área e no título. */
  todasAsAreas?: { area: string[]; titulo: string[] };
}

export const TODAS_AS_AREAS = 'aberta a todas as áreas';

export function carregarTemas(): Record<string, Tema> {
  return JSON.parse(readFileSync(path.join(process.cwd(), 'dados', 'temas.json'), 'utf8'));
}

/** Tira acentos letra a letra, para as posições no texto normalizado baterem com o original. */
function normalizar(texto: string): string {
  return [...texto.toLowerCase()].map((c) => c.normalize('NFD').replace(/\p{Diacritic}/gu, '')[0] ?? c).join('');
}

function textoDoEdital(e: Edital): string {
  return [e.titulo, e.resumo, e.area, e.modalidade, e.publico?.join(' ')].filter(Boolean).join(' ').toLowerCase();
}

/** Termos do tema encontrados no edital, ou undefined se o edital não pertence ao tema. */
export function classificar(e: Edital, tema: Tema): string[] | undefined {
  if (tema.excluir.includes(e.id)) return undefined;
  const original = textoDoEdital(e);
  const texto = normalizar(original);
  const achados: string[] = [];
  let pontos = 0;
  const procurar = (termos: string[], valor: number) => {
    for (const termo of termos) {
      // O termo precisa começar uma palavra: "ética" não casa com "genética".
      const padrao = new RegExp(`(^|[^\\p{L}])(${normalizar(termo).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\p{L}*)`, 'u');
      const m = texto.match(padrao);
      if (m) {
        // Mostra a palavra como está escrita no edital (ex.: "educação", não o radical "educaç").
        const inicio = m.index! + m[1].length;
        const palavra = original.slice(inicio, inicio + m[2].length);
        if (!achados.some((a) => a.includes(palavra))) achados.push(palavra);
        pontos += valor;
      }
    }
  };
  procurar(tema.termosFortes, 2);
  procurar(tema.termosDeApoio, 1);
  if (tema.incluir.includes(e.id)) return achados.length ? achados : ['incluído manualmente'];
  if (pontos >= tema.pontosMinimos) return achados;
  const geral = tema.todasAsAreas;
  if (geral) {
    const area = normalizar(e.area ?? '');
    const titulo = normalizar(e.titulo);
    if (geral.area.some((t) => area.includes(normalizar(t))) || geral.titulo.some((t) => titulo.includes(normalizar(t)))) {
      return [TODAS_AS_AREAS];
    }
  }
  return undefined;
}
