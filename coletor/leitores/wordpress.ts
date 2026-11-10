// Leitor para sites em WordPress: usa a API pública do próprio WordPress para listar
// os posts de uma categoria (ex.: FAPESC, categoria "chamadas-abertas").
import type { Fonte, ItemLista } from '../tipos.ts';
import { baixarJson } from '../util/http.ts';
import { htmlParaTexto, linha, resumir } from '../util/texto.ts';

interface Config {
  /** Endereço do site (ex.: https://fapesc.sc.gov.br). */
  site: string;
  /** Apelido (slug) da categoria que reúne as chamadas. */
  categoria: string;
}

interface Post {
  date: string;
  link: string;
  title: { rendered: string };
  content: { rendered: string };
}

export async function wordpress(fonte: Fonte): Promise<ItemLista[]> {
  const c = fonte.config as unknown as Config;
  const api = `${c.site.replace(/\/$/, '')}/wp-json/wp/v2`;

  const categorias = await baixarJson<{ id: number }[]>(`${api}/categories?slug=${encodeURIComponent(c.categoria)}`);
  if (!categorias.length) throw new Error(`Categoria "${c.categoria}" não existe mais no site.`);

  const posts = await baixarJson<Post[]>(
    `${api}/posts?categories=${categorias[0].id}&per_page=100&_fields=date,link,title,content`,
  );
  return posts.map((p) => {
    const texto = htmlParaTexto(p.content.rendered);
    return {
      titulo: linha(htmlParaTexto(p.title.rendered)),
      link: p.link,
      texto,
      resumo: resumir(texto),
      publicadoEm: p.date.slice(0, 10),
    };
  });
}
