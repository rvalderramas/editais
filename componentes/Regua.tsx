// Régua dos próximos 90 dias: cada marca é o fim das inscrições de um edital aberto.
import { diasEntre, nomeMes, plural, somarDias, urgencia, dataCurta } from '@/lib/formatos.ts';
import estilos from './Regua.module.css';

export interface MarcaRegua {
  id: string;
  orgao: string;
  titulo: string;
  fim: string;
}

const DIAS = 90;
const LINHAS = 4;

export function Regua({ marcas, hoje }: { marcas: MarcaRegua[]; hoje: string }) {
  const ate = somarDias(hoje, DIAS);
  const visiveis = marcas
    .filter((m) => m.fim >= hoje && m.fim <= ate)
    .sort((a, b) => a.fim.localeCompare(b.fim));

  // Distribui marcas próximas em linhas diferentes para não se sobreporem.
  const ultimaPorLinha: number[] = Array(LINHAS).fill(-Infinity);
  const posicionadas = visiveis.map((m) => {
    const dias = diasEntre(hoje, m.fim);
    let linha = ultimaPorLinha.findIndex((ultimo) => dias - ultimo >= 2);
    if (linha < 0) linha = LINHAS - 1;
    ultimaPorLinha[linha] = dias;
    return { ...m, dias, linha };
  });

  const meses: { rotulo: string; pos: number }[] = [];
  for (let d = 1; d <= DIAS; d++) {
    const data = somarDias(hoje, d);
    if (data.endsWith('-01')) meses.push({ rotulo: nomeMes(data), pos: (d / DIAS) * 100 });
  }

  return (
    <figure className={estilos.regua}>
      <figcaption className={estilos.legenda}>
        {visiveis.length
          ? `${plural(visiveis.length, 'prazo termina', 'prazos terminam')} nos próximos ${DIAS} dias`
          : `Nenhum prazo termina nos próximos ${DIAS} dias`}
      </figcaption>
      <div className={estilos.rolagem}>
        <div className={estilos.faixa}>
          <span className={estilos.hoje} style={{ left: 0 }}>
            hoje
          </span>
          {meses.map((m) => (
            <span key={m.rotulo} className={estilos.mes} style={{ left: `${m.pos}%` }}>
              {m.rotulo}
            </span>
          ))}
          <ol className={estilos.marcas}>
            {posicionadas.map((m) => (
              <li
                key={m.id}
                className={[
                  estilos.marca,
                  estilos[urgencia(m.dias)],
                  m.dias < 12 ? estilos.inicio : m.dias > 72 ? estilos.final : '',
                ].join(' ')}
                style={{ left: `${(m.dias / DIAS) * 100}%`, '--linha': m.linha } as React.CSSProperties}
              >
                <a href={`#e-${m.id}`} className={estilos.alvo}>
                  <span className={estilos.dica}>
                    <strong>
                      {m.orgao}, {m.dias === 0 ? 'termina hoje' : `em ${plural(m.dias, 'dia', 'dias')}`}
                    </strong>
                    <span>{m.titulo}</span>
                    <span className={estilos.dicaData}>{dataCurta(m.fim)}</span>
                  </span>
                </a>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </figure>
  );
}
