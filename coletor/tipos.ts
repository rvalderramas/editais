// Formatos de dados compartilhados pelo coletor e pelo site.

/** Cadastro de uma fonte (um órgão ou uma página de chamadas). Fica em dados/fontes.json. */
export interface Fonte {
  id: string;
  sigla: string;
  nome: string;
  ativa: boolean;
  /** Página onde as chamadas são listadas. */
  url: string;
  /** Qual leitor sabe interpretar a página (ver coletor/leitores). */
  leitor: string;
  /** Configurações específicas do leitor. */
  config: Record<string, unknown>;
  filtros?: FiltrosFonte;
  detalhe?: ConfigDetalhe;
}

export interface FiltrosFonte {
  /** Expressão regular: títulos que casam são descartados. */
  ignorarTitulo?: string;
  /** Descarta itens cujo título traz um ano menor que este. */
  anoMinimo?: number;
}

export interface ConfigDetalhe {
  /** Abrir a página de cada edital para procurar datas quando a lista não as traz. */
  pagina?: boolean;
  /** Seletor CSS da área principal da página de detalhe (reduz ruído). */
  conteudo?: string;
  /** Expressão regular aplicada ao texto dos links: o primeiro PDF que casar é lido. */
  pdf?: string;
}

/** O que um leitor devolve para cada item encontrado na lista. */
export interface ItemLista {
  titulo: string;
  link: string;
  /** Texto que acompanha o item na lista (pode conter datas). */
  texto?: string;
  resumo?: string;
  publicadoEm?: string;
  inscricoesInicio?: string;
  inscricoesFim?: string;
  /** Situação informada pela própria fonte (ex.: "aberta", "encerrada", "em andamento"). */
  situacaoFonte?: string;
  publico?: string[];
  valor?: string;
  area?: string;
  modalidade?: string;
  /** Quando o leitor já obteve as datas de dados estruturados da fonte. */
  origemDatas?: OrigemDado;
  /** Descrição de onde as datas estruturadas vieram, para conferência. */
  trecho?: string;
}

export type OrigemDado = 'lista' | 'pagina' | 'pdf' | 'api' | 'manual';

export type Status = 'aberta' | 'encerrada' | 'sem-prazo';

/** Um edital, como fica gravado em dados/editais.json. */
export interface Edital {
  id: string;
  fonte: string;
  orgao: string;
  titulo: string;
  link: string;
  resumo?: string;
  publicadoEm?: string;
  inscricoesInicio?: string;
  inscricoesFim?: string;
  fluxoContinuo?: boolean;
  status: Status;
  situacaoFonte?: string;
  publico?: string[];
  valor?: string;
  area?: string;
  modalidade?: string;
  /** De onde vieram as datas, com o trecho de texto usado, para conferência. */
  evidencia?: Evidencia;
  /** Aviso de divergência entre a situação informada pela fonte e o prazo encontrado. */
  alerta?: string;
  /** PDF do edital, quando identificado. */
  pdf?: string;
  primeiraVezVisto: string;
  ultimaVerificacao: string;
  detalheVerificadoEm?: string;
}

export interface Evidencia {
  origem: OrigemDado;
  url: string;
  trecho?: string;
}

/** Correções feitas à mão (pela área de administração). Fica em dados/correcoes.json. */
export interface Correcao {
  inscricoesInicio?: string;
  inscricoesFim?: string;
  fluxoContinuo?: boolean;
  oculto?: boolean;
  observacao?: string;
}

export interface ResultadoFonte {
  fonte: string;
  inicio: string;
  fim: string;
  ok: boolean;
  encontrados: number;
  comPrazo: number;
  erro?: string;
}
