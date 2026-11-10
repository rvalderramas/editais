// Registro dos leitores disponíveis. O campo "leitor" de cada fonte em
// dados/fontes.json deve ser uma das chaves abaixo.
import type { Fonte, ItemLista } from '../tipos.ts';
import { htmlItens } from './html-itens.ts';
import { htmlBlocos } from './html-blocos.ts';
import { wordpress } from './wordpress.ts';
import { finep } from './finep.ts';

export type Leitor = (fonte: Fonte) => Promise<ItemLista[]>;

export const leitores: Record<string, Leitor> = {
  'html-itens': htmlItens,
  'html-blocos': htmlBlocos,
  wordpress,
  finep,
};
