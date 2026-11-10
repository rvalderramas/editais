import { carregarEditais, carregarFontes, hoje } from '@/lib/dados.ts';
import { horaBrasilia, plural } from '@/lib/formatos.ts';
import { Regua } from '@/componentes/Regua.tsx';
import { ListaEditais, type ItemListagem } from '@/componentes/ListaEditais.tsx';
import estilos from './page.module.css';

export default function Inicio() {
  const { atualizadoEm, editais } = carregarEditais();
  const fontes = carregarFontes();
  const dia = hoje();

  const itens: ItemListagem[] = editais.map((e) => ({
    id: e.id,
    orgao: e.orgao,
    titulo: e.titulo,
    status: e.status,
    inicio: e.inscricoesInicio,
    fim: e.inscricoesFim,
    fluxoContinuo: e.fluxoContinuo,
    detalhes: [e.modalidade, e.area, e.publico?.join(', ')].filter((x): x is string => !!x),
    alerta: !!e.alerta,
  }));
  const abertas = editais.filter((e) => e.status === 'aberta');

  return (
    <div className="envoltorio">
      <section className={estilos.abertura}>
        <h1 className={estilos.titulo}>Prazos de editais de pesquisa</h1>
        <p className={estilos.resumo}>
          {plural(abertas.length, 'edital com inscrições abertas', 'editais com inscrições abertas')} em{' '}
          {plural(fontes.length, 'órgão de fomento', 'órgãos de fomento')}. Atualizado em {horaBrasilia(atualizadoEm)}.
        </p>
        <Regua
          hoje={dia}
          marcas={abertas
            .filter((e) => e.inscricoesFim)
            .map((e) => ({ id: e.id, orgao: e.orgao, titulo: e.titulo, fim: e.inscricoesFim! }))}
        />
      </section>
      <ListaEditais itens={itens} orgaos={fontes.map((f) => f.sigla)} hoje={dia} />
    </div>
  );
}
