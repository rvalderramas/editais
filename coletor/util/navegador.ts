// Navegador automatizado, usado só pelas fontes que carregam a lista por JavaScript.
import type { Browser } from 'playwright';

let navegador: Browser | undefined;

export async function abrirNavegador(): Promise<Browser> {
  if (!navegador) {
    const { chromium } = await import('playwright');
    navegador = await chromium.launch();
  }
  return navegador;
}

export async function fecharNavegador(): Promise<void> {
  await navegador?.close();
  navegador = undefined;
}
