import { carregarEditais, carregarExecucoes, carregarFontes } from '@/lib/dados.ts';
import { horaBrasilia } from '@/lib/formatos.ts';
import estilos from './page.module.css';

export const metadata = { title: 'Fontes e coleta — Editais de pesquisa' };

export default function Fontes() {
  const fontes = carregarFontes();
  const { editais } = carregarEditais();
  const { ultimaExecucao, fontes: resultados } = carregarExecucoes();

  return (
    <div className={`envoltorio ${estilos.fontes}`}>
      <h1 className={estilos.titulo}>Fontes e coleta</h1>
      <p className={estilos.texto}>
        Todos os dias, às 6h, um robô visita a página de chamadas de cada órgão abaixo, identifica os editais e procura
        as datas de inscrição na lista, na página do edital ou no PDF. Cada data fica registrada com o trecho de onde
        saiu. Última coleta: {horaBrasilia(ultimaExecucao)}.
      </p>

      <table className={estilos.tabela}>
        <thead>
          <tr>
            <th scope="col">Órgão</th>
            <th scope="col">Editais</th>
            <th scope="col">Com prazo</th>
            <th scope="col">Última coleta</th>
          </tr>
        </thead>
        <tbody>
          {fontes.map((f) => {
            const r = resultados.find((x) => x.fonte === f.id);
            const doOrgao = editais.filter((e) => e.fonte === f.id);
            return (
              <tr key={f.id}>
                <th scope="row">
                  <a href={f.url}>{f.sigla}</a>
                  <span>{f.nome}</span>
                </th>
                <td>{doOrgao.length}</td>
                <td>{doOrgao.filter((e) => e.inscricoesFim || e.fluxoContinuo).length}</td>
                <td className={r?.ok ? estilos.ok : estilos.falha}>
                  {!r ? 'Ainda não coletado' : r.ok ? 'Concluída' : `Falhou: ${r.erro}. Mantidos os dados da coleta anterior.`}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
