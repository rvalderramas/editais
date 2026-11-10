import type { Metadata } from 'next';
import '@fontsource-variable/archivo/standard.css';
import Link from 'next/link';
import './globals.css';
import estilos from './layout.module.css';

export const metadata: Metadata = {
  title: 'Editais de pesquisa',
  description: 'Prazos de editais de fomento à pesquisa no Brasil, atualizados todos os dias a partir das páginas dos órgãos.',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>
        <header className={estilos.topo}>
          <div className={`envoltorio ${estilos.topoInterno}`}>
            <Link href="/" className={estilos.marca}>
              Editais de pesquisa
            </Link>
            <nav aria-label="Principal">
              <Link href="/fontes">Fontes e coleta</Link>
            </nav>
          </div>
        </header>
        <main>{children}</main>
        <footer className={estilos.rodape}>
          <div className="envoltorio">
            Dados coletados automaticamente das páginas oficiais de cada órgão. Antes de submeter uma proposta,
            confirme as datas no edital.
          </div>
        </footer>
      </body>
    </html>
  );
}
