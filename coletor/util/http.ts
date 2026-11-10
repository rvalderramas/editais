// Acesso às páginas das fontes: identificação, tempo limite e novas tentativas.

const AGENTE =
  'Mozilla/5.0 (compatible; EditaisPesquisa/0.1; +https://github.com/rvalderramas/editais)';

const TEMPO_LIMITE_MS = 45_000;
const TENTATIVAS = 3;

async function buscar(url: string, init: RequestInit = {}): Promise<Response> {
  let ultimoErro: unknown;
  for (let tentativa = 1; tentativa <= TENTATIVAS; tentativa++) {
    try {
      const resposta = await fetch(url, {
        ...init,
        redirect: 'follow',
        signal: AbortSignal.timeout(TEMPO_LIMITE_MS),
        headers: { 'user-agent': AGENTE, 'accept-language': 'pt-BR,pt;q=0.9', ...init.headers },
      });
      if (resposta.ok) return resposta;
      ultimoErro = new Error(`HTTP ${resposta.status} em ${url}`);
      if (resposta.status < 500) break;
    } catch (erro) {
      ultimoErro = erro;
    }
    await esperar(2000 * tentativa);
  }
  throw ultimoErro instanceof Error ? ultimoErro : new Error(String(ultimoErro));
}

export async function baixarTexto(url: string): Promise<string> {
  return (await buscar(url)).text();
}

export async function baixarJson<T>(url: string): Promise<T> {
  return (await buscar(url, { headers: { accept: 'application/json' } })).json() as Promise<T>;
}

export async function baixarBinario(url: string): Promise<{ dados: Uint8Array; tipo: string }> {
  const resposta = await buscar(url);
  return {
    dados: new Uint8Array(await resposta.arrayBuffer()),
    tipo: resposta.headers.get('content-type') ?? '',
  };
}

export function esperar(ms: number): Promise<void> {
  return new Promise((resolver) => setTimeout(resolver, ms));
}
