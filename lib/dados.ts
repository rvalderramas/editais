// Leitura dos arquivos de dados (gerados pelo coletor) e funções de apoio para as páginas.
import { readFileSync } from 'node:fs';
import path from 'node:path';
import type { Edital, Fonte, ResultadoFonte } from '@/coletor/tipos.ts';

function ler<T>(arquivo: string): T {
  return JSON.parse(readFileSync(path.join(process.cwd(), 'dados', arquivo), 'utf8')) as T;
}

export function carregarEditais(): { atualizadoEm: string; editais: Edital[] } {
  return ler('editais.json');
}

export function carregarFontes(): Fonte[] {
  return ler<Fonte[]>('fontes.json').filter((f) => f.ativa);
}

export function carregarExecucoes(): { ultimaExecucao: string; fontes: ResultadoFonte[] } {
  return ler('execucoes.json');
}

/** Hoje no horário de Brasília (AAAA-MM-DD). */
export function hoje(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date());
}
