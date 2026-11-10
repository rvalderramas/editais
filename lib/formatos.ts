// Formatação de datas e prazos. Sem dependências de servidor: usado também no navegador.

const DIA_MS = 86_400_000;

export function diasEntre(deIso: string, ateIso: string): number {
  return Math.round((Date.parse(ateIso) - Date.parse(deIso)) / DIA_MS);
}

const curta = new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
const longa = new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
const mes = new Intl.DateTimeFormat('pt-BR', { month: 'short', timeZone: 'UTC' });

/** "8 de dez. de 2026" → "8 dez. 2026" */
export function dataCurta(iso: string): string {
  return curta.format(new Date(iso)).replace(/ de /g, ' ');
}

export function dataLonga(iso: string): string {
  return longa.format(new Date(iso));
}

export function nomeMes(iso: string): string {
  return mes.format(new Date(iso)).replace('.', '');
}

export function horaBrasilia(isoDataHora: string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo',
  }).format(new Date(isoDataHora));
}

export function somarDias(iso: string, dias: number): string {
  return new Date(Date.parse(iso) + dias * DIA_MS).toISOString().slice(0, 10);
}

/** Faixa de urgência usada nas cores: até 7 dias, até 30 dias, mais. */
export function urgencia(dias: number): 'urgente' | 'proximo' | 'folga' {
  if (dias <= 7) return 'urgente';
  if (dias <= 30) return 'proximo';
  return 'folga';
}

export function plural(n: number, um: string, varios: string): string {
  return `${n} ${n === 1 ? um : varios}`;
}
