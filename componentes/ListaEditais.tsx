'use client';
// Lista de editais com busca, filtro por órgão e separação por situação.
import { useMemo, useState } from 'react';
import Link from 'next/link';
import type { Status } from '@/coletor/tipos.ts';
import { dataCurta, diasEntre, urgencia } from '@/lib/formatos.ts';
import estilos from './ListaEditais.module.css';
import { MapaAbrangencia, rotuloCurto } from './MapaBrasil.tsx';

export interface ItemListagem {
  id: string;
  orgao: string;
  titulo: string;
  status: Status;
  inicio?: string;
  fim?: string;
  fluxoContinuo?: boolean;
  detalhes: string[];
  alerta: boolean;
  abrangencia: string[];
  /** Temas a que o edital pertence, com os termos que justificam a inclusão. */
  temas: Record<string, string[]>;
}

export interface TemaListagem {
  id: string;
  nome: string;
  descricao: string;
}

/** Uma aba é uma situação ("aberta"...) ou um tema ("tema:ciidcmil"). */
type Aba = Status | `tema:${string}`;

function semAcento(texto: string): string {
  return texto.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
}

export function ListaEditais({
  itens,
  orgaos,
  temas,
  hoje,
}: {
  itens: ItemListagem[];
  orgaos: string[];
  temas: TemaListagem[];
  hoje: string;
}) {
  const [aba, setAba] = useState<Aba>('aberta');
  const [busca, setBusca] = useState('');
  const [orgao, setOrgao] = useState('');

  const filtrados = useMemo(() => {
    const termo = semAcento(busca.trim());
    return itens.filter(
      (e) =>
        (!orgao || e.orgao === orgao) &&
        (!termo || semAcento(`${e.titulo} ${e.orgao} ${e.detalhes.join(' ')}`).includes(termo)),
    );
  }, [itens, busca, orgao]);

  // Abas de tema mostram os editais do tema que ainda não encerraram (abertos e sem prazo).
  const pertence = (e: ItemListagem, a: Aba) =>
    a.startsWith('tema:') ? !!e.temas[a.slice(5)] && e.status !== 'encerrada' : e.status === a;
  const contagem = (a: Aba) => filtrados.filter((e) => pertence(e, a)).length;
  const daAba = filtrados.filter((e) => pertence(e, aba));
  const abas: { id: Aba; rotulo: string }[] = [
    { id: 'aberta', rotulo: 'Abertas' },
    ...temas.map((t) => ({ id: `tema:${t.id}` as Aba, rotulo: t.nome })),
    { id: 'sem-prazo', rotulo: 'Sem prazo identificado' },
    { id: 'encerrada', rotulo: 'Encerradas' },
  ];
  const temaAtual = aba.startsWith('tema:') ? temas.find((t) => `tema:${t.id}` === aba) : undefined;
  if (aba === 'encerrada') daAba.reverse();
  // Editais de fluxo contínuo ficam no topo; os demais mantêm a ordem por prazo.
  daAba.sort((a, b) => Number(!!b.fluxoContinuo) - Number(!!a.fluxoContinuo));

  return (
    <section className={estilos.lista} aria-labelledby="titulo-lista">
      <h2 id="titulo-lista" className="oculto-visualmente">
        Editais
      </h2>

      <div className={estilos.controles}>
        <label className={estilos.campo}>
          <span>Buscar</span>
          <input
            type="search"
            value={busca}
            onChange={(ev) => setBusca(ev.target.value)}
            placeholder="Título, área, modalidade"
          />
        </label>
        <label className={estilos.campo}>
          <span>Órgão</span>
          <select value={orgao} onChange={(ev) => setOrgao(ev.target.value)}>
            <option value="">Todos</option>
            {orgaos.map((o) => (
              <option key={o}>{o}</option>
            ))}
          </select>
        </label>
      </div>

      <div className={estilos.abas} role="tablist" aria-label="Situação">
        {/* Ordem: Abertas, temas (ex.: CIIDCMIL), Sem prazo; Encerradas fica à direita. */}
        {abas.map((a) => (
          <button
            key={a.id}
            role="tab"
            aria-selected={aba === a.id}
            aria-controls="painel-editais"
            className={`${estilos.aba} ${a.id === 'encerrada' ? estilos.abaDireita : ''}`}
            onClick={() => setAba(a.id)}
          >
            {a.rotulo} <span className={estilos.contagem}>{contagem(a.id)}</span>
          </button>
        ))}
      </div>

      <div id="painel-editais" role="tabpanel">
        {temaAtual && (
          <p className={estilos.introTema}>
            {temaAtual.descricao} A seleção é feita automaticamente por palavras-chave no título e na descrição de cada
            edital, inclui chamadas abertas a todas as áreas e reúne os editais abertos e os sem prazo identificado.
          </p>
        )}
        {daAba.length === 0 ? (
          <p className={estilos.vazio}>
            Nenhum edital nesta situação{busca || orgao ? ' com esses filtros. Limpe a busca ou escolha outro órgão.' : '.'}
          </p>
        ) : (
          <ol className={estilos.itens}>
            {daAba.map((e) => (
              <Linha key={e.id} e={e} hoje={hoje} motivo={temaAtual && e.temas[temaAtual.id]} />
            ))}
          </ol>
        )}
      </div>
    </section>
  );
}

function Linha({ e, hoje, motivo }: { e: ItemListagem; hoje: string; motivo?: string[] }) {
  const dias = e.fim ? diasEntre(hoje, e.fim) : undefined;
  const faixa = e.status === 'aberta' && dias !== undefined ? urgencia(dias) : undefined;

  return (
    <li id={`e-${e.id}`} className={`${estilos.item} ${faixa ? estilos[faixa] : ''}`}>
      <div className={estilos.prazo}>
        <Contador e={e} dias={dias} hoje={hoje} />
      </div>
      <div className={estilos.corpo}>
        <span className={estilos.orgao}>{e.orgao}</span>
        <h3 className={estilos.titulo}>
          <Link href={`/edital/${e.id}`}>{e.titulo}</Link>
        </h3>
        {e.detalhes.length > 0 && <p className={estilos.detalhes}>{e.detalhes.join('; ')}</p>}
        {motivo && (
          <p className={estilos.motivo}>
            {motivo[0] === 'aberta a todas as áreas' ? 'Chamada aberta a todas as áreas' : `Relaciona-se com: ${motivo.join(', ')}`}
          </p>
        )}
        {e.alerta && <p className={estilos.alerta}>A situação na fonte diverge do prazo. Confira antes de submeter.</p>}
      </div>
      <div className={estilos.datas}>
        <Datas e={e} hoje={hoje} />
      </div>
      <div className={estilos.abrangencia}>
        <MapaAbrangencia ufs={e.abrangencia} />
        <span aria-hidden="true">{rotuloCurto(e.abrangencia)}</span>
      </div>
    </li>
  );
}

function Contador({ e, dias, hoje }: { e: ItemListagem; dias?: number; hoje: string }) {
  if (e.status === 'aberta' && e.inicio && e.inicio > hoje) {
    const ate = diasEntre(hoje, e.inicio);
    return (
      <>
        <span className={estilos.numeroMenor}>abre em</span>
        <span className={estilos.numero}>{ate}</span>
        <span className={estilos.unidade}>{ate === 1 ? 'dia' : 'dias'}</span>
      </>
    );
  }
  if (e.status === 'aberta' && dias !== undefined) {
    if (dias === 0) return <span className={estilos.numeroTexto}>termina hoje</span>;
    return (
      <>
        <span className={estilos.numero}>{dias}</span>
        <span className={estilos.unidade}>{dias === 1 ? 'dia' : 'dias'}</span>
      </>
    );
  }
  if (e.status === 'aberta' && e.fluxoContinuo) return <span className={estilos.numeroTexto}>fluxo contínuo</span>;
  if (e.status === 'encerrada') return <span className={estilos.numeroTexto}>encerrado</span>;
  return <span className={estilos.numeroTexto}>sem prazo</span>;
}

function Datas({ e, hoje }: { e: ItemListagem; hoje: string }) {
  if (!e.fim && !e.inicio) return e.fluxoContinuo ? <span>Fluxo contínuo</span> : null;
  return (
    <>
      {e.fim && (
        <span>
          {e.status === 'encerrada' ? 'Encerrou em ' : 'Até '}
          <strong>{dataCurta(e.fim)}</strong>
        </span>
      )}
      {e.inicio && (
        <span className={estilos.inicio}>
          {e.inicio > hoje ? 'Abre em ' : 'Desde '}
          {dataCurta(e.inicio)}
        </span>
      )}
      {e.fluxoContinuo && <span className={estilos.inicio}>Fluxo contínuo</span>}
    </>
  );
}

