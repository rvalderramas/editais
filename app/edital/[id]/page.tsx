import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Edital, OrigemDado } from '@/coletor/tipos.ts';
import { carregarEditais, carregarFontes, hoje } from '@/lib/dados.ts';
import { dataLonga, diasEntre, plural } from '@/lib/formatos.ts';
import estilos from './page.module.css';

export function generateStaticParams() {
  return carregarEditais().editais.map((e) => ({ id: e.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const e = carregarEditais().editais.find((x) => x.id === id);
  return { title: e ? `${e.orgao}: ${e.titulo}` : 'Edital não encontrado' };
}

const ORIGENS: Record<OrigemDado, string> = {
  lista: 'na lista de chamadas do órgão',
  pagina: 'na página do edital',
  pdf: 'no PDF do edital',
  api: 'nos dados publicados pelo órgão',
  manual: 'em correção feita manualmente',
};

function situacao(e: Edital, dia: string): string {
  if (e.status === 'aberta') {
    if (e.inscricoesInicio && e.inscricoesInicio > dia) {
      return `Inscrições abrem em ${dataLonga(e.inscricoesInicio)}${e.inscricoesFim ? ` e vão até ${dataLonga(e.inscricoesFim)}` : ''}.`;
    }
    if (e.inscricoesFim) {
      const dias = diasEntre(dia, e.inscricoesFim);
      return `Inscrições abertas até ${dataLonga(e.inscricoesFim)}, ${dias === 0 ? 'último dia hoje' : `${plural(dias, 'dia restante', 'dias restantes')}`}.`;
    }
    return 'Inscrições em fluxo contínuo.';
  }
  if (e.status === 'encerrada') {
    return e.inscricoesFim ? `Inscrições encerradas em ${dataLonga(e.inscricoesFim)}.` : `Encerrado, segundo o órgão (“${e.situacaoFonte}”).`;
  }
  return 'Não foi possível identificar o prazo de inscrição automaticamente. Consulte o edital.';
}

export default async function PaginaEdital({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const e = carregarEditais().editais.find((x) => x.id === id);
  if (!e) notFound();
  const fonte = carregarFontes().find((f) => f.id === e.fonte);
  const dia = hoje();

  const ficha: [string, string | undefined][] = [
    ['Modalidade', e.modalidade],
    ['Área', e.area],
    ['Público', e.publico?.join(', ')],
    ['Valor', e.valor],
    ['Publicado em', e.publicadoEm && dataLonga(e.publicadoEm)],
    ['Situação informada pelo órgão', e.situacaoFonte],
    ['Visto pela primeira vez em', dataLonga(e.primeiraVezVisto)],
    ['Verificado pela última vez em', dataLonga(e.ultimaVerificacao)],
  ];

  return (
    <article className={`envoltorio ${estilos.edital}`}>
      <Link href={`/#e-${e.id}`} className={estilos.voltar}>
        Voltar para a lista
      </Link>

      <p className={estilos.orgao}>{fonte?.nome ?? e.orgao}</p>
      <h1 className={estilos.titulo}>{e.titulo}</h1>
      <p className={`${estilos.situacao} ${estilos[e.status]}`}>{situacao(e, dia)}</p>

      {e.alerta && <p className={estilos.alerta}>{e.alerta}</p>}

      <div className={estilos.acoes}>
        <a href={e.link} className={estilos.botao}>
          Abrir o edital no site do órgão
        </a>
        {e.pdf && e.pdf !== e.link && <a href={e.pdf}>Baixar o PDF do edital</a>}
      </div>

      <section className={estilos.evidencia} aria-labelledby="titulo-evidencia">
        <h2 id="titulo-evidencia">De onde vem esta data</h2>
        {e.evidencia ? (
          <>
            <p>Encontrada {ORIGENS[e.evidencia.origem]}:</p>
            {e.evidencia.trecho && <blockquote>{e.evidencia.trecho}</blockquote>}
            <p>
              <a href={e.evidencia.url}>Ver o texto original</a>
            </p>
          </>
        ) : (
          <p>Nenhum trecho com datas de inscrição foi encontrado na lista, na página ou no PDF deste edital.</p>
        )}
      </section>

      {e.resumo && (
        <section className={estilos.resumo}>
          <h2>Resumo</h2>
          <p>{e.resumo}</p>
        </section>
      )}

      <dl className={estilos.ficha}>
        {ficha
          .filter(([, valor]) => valor)
          .map(([rotulo, valor]) => (
            <div key={rotulo}>
              <dt>{rotulo}</dt>
              <dd>{valor}</dd>
            </div>
          ))}
      </dl>
    </article>
  );
}
