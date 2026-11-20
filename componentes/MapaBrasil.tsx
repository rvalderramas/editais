// Mapa do Brasil com os estados onde um edital vale pintados.
// O desenho dos estados entra uma única vez na página (MapaSimbolo); cada mapa pequeno
// reaproveita esse desenho e só troca as cores, para a página não ficar pesada.
import { CAIXAS, ESTADOS, VIEWBOX } from '@/lib/mapa-brasil.ts';
import estilos from './MapaBrasil.module.css';

const NOMES = Object.fromEntries(ESTADOS.map((e) => [e.uf, e.nome]));

export function MapaSimbolo() {
  return (
    <svg aria-hidden="true" className={estilos.simbolo}>
      <symbol id="mapa-brasil" viewBox={VIEWBOX}>
        {ESTADOS.map((e) => (
          <path key={e.uf} d={e.d} fill={`var(--uf-${e.uf}, var(--mapa-base))`} vectorEffect="non-scaling-stroke" />
        ))}
      </symbol>
    </svg>
  );
}

const [, , LARGURA, ALTURA] = VIEWBOX.split(' ').map(Number);

/**
 * Enquadramento ampliado nos estados indicados, com a mesma proporção do mapa inteiro,
 * para o ícone manter o tamanho. Os estados vizinhos aparecem em volta, como referência.
 */
function enquadrar(ufs: string[]): string {
  const caixas = ufs.map((uf) => CAIXAS[uf]).filter(Boolean);
  if (!caixas.length) return VIEWBOX;
  const x0 = Math.min(...caixas.map((c) => c[0]));
  const y0 = Math.min(...caixas.map((c) => c[1]));
  const x1 = Math.max(...caixas.map((c) => c[0] + c[2]));
  const y1 = Math.max(...caixas.map((c) => c[1] + c[3]));
  const lado = Math.min(Math.max(x1 - x0, y1 - y0) * 1.9, LARGURA);
  const w = Math.max(lado, 110);
  const h = (w * ALTURA) / LARGURA;
  const limitar = (v: number, max: number) => Math.min(Math.max(v, 0), Math.max(max, 0));
  const x = limitar((x0 + x1) / 2 - w / 2, LARGURA - w);
  const y = limitar((y0 + y1) / 2 - h / 2, ALTURA - h);
  return [x, y, w, h].map((v) => Math.round(v)).join(' ');
}

/** "Nacional", "São Paulo", "São Paulo e Santa Catarina". */
export function descreverAbrangencia(ufs: string[]): string {
  if (ufs.includes('br')) return 'Nacional';
  const nomes = ufs.map((uf) => NOMES[uf] ?? uf.toUpperCase());
  return nomes.length > 1 ? `${nomes.slice(0, -1).join(', ')} e ${nomes.at(-1)}` : nomes[0];
}

/** Rótulo curto para a lista: "Nacional", "SP", "SP, SC". */
export function rotuloCurto(ufs: string[]): string {
  return ufs.includes('br') ? 'Nacional' : ufs.map((uf) => uf.toUpperCase()).join(', ');
}

export function MapaAbrangencia({ ufs, tamanho = 'pequeno' }: { ufs: string[]; tamanho?: 'pequeno' | 'grande' }) {
  const nacional = ufs.includes('br');
  const cores: Record<string, string> = nacional ? { '--mapa-base': 'var(--mapa-cor)' } : {};
  if (!nacional) for (const uf of ufs) cores[`--uf-${uf}`] = 'var(--mapa-cor)';

  // No ícone da lista, editais estaduais aparecem ampliados no estado; na página do edital, o país inteiro.
  const caixa = tamanho === 'pequeno' && !nacional ? enquadrar(ufs) : VIEWBOX;

  return (
    <svg
      viewBox={caixa}
      className={`${estilos.mapa} ${estilos[tamanho]}`}
      role="img"
      aria-label={`Abrangência: ${descreverAbrangencia(ufs)}`}
      style={cores as React.CSSProperties}
    >
      {/* Tamanho fixo do desenho inteiro: o viewBox acima decide o recorte (ampliado ou não). */}
      <use href="#mapa-brasil" x={0} y={0} width={LARGURA} height={ALTURA} />
    </svg>
  );
}
