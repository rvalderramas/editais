'use client';
// Lista de editais com busca, filtro por órgão e separação por situação.
import { useMemo, useState } from 'react';
import Link from 'next/link';
import type { Status } from '@/coletor/tipos.ts';
import { dataCurta, diasEntre, urgencia } from '@/lib/formatos.ts';
import estilos from './ListaEditais.module.css';

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
}

const ABAS: { status: Status; rotulo: string }[] = [
  { status: 'aberta', rotulo: 'Abertas' },
  { status: 'sem-prazo', rotulo: 'Sem prazo identificado' },
  { status: 'encerrada', rotulo: 'Encerradas' },
];

function semAcento(texto: string): string {
  return texto.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
}

export function ListaEditais({ itens, orgaos, hoje }: { itens: ItemListagem[]; orgaos: string[]; hoje: string }) {
  const [aba, setAba] = useState<Status>('aberta');
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

  const contagem = (s: Status) => filtrados.filter((e) => e.status === s).length;
  const daAba = filtrados.filter((e) => e.status === aba);
  if (aba === 'encerrada') daAba.reverse();

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
        {ABAS.map((a) => (
          <button
            key={a.status}
            role="tab"
            aria-selected={aba === a.status}
            aria-controls="painel-editais"
            className={estilos.aba}
            onClick={() => setAba(a.status)}
          >
            {a.rotulo} <span className={estilos.contagem}>{contagem(a.status)}</span>
          </button>
        ))}
      </div>

      <div id="painel-editais" role="tabpanel">
        {daAba.length === 0 ? (
          <p className={estilos.vazio}>
            Nenhum edital nesta situação{busca || orgao ? ' com esses filtros. Limpe a busca ou escolha outro órgão.' : '.'}
          </p>
        ) : (
          <ol className={estilos.itens}>
            {daAba.map((e) => (
              <Linha key={e.id} e={e} hoje={hoje} />
            ))}
          </ol>
        )}
      </div>
    </section>
  );
}

function Linha({ e, hoje }: { e: ItemListagem; hoje: string }) {
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
        {e.alerta && <p className={estilos.alerta}>A situação na fonte diverge do prazo. Confira antes de submeter.</p>}
      </div>
      <div className={estilos.datas}>
        <Datas e={e} hoje={hoje} />
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

