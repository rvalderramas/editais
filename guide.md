# Guia do projeto

Leia este arquivo antes de mexer no código: ele diz onde cada coisa está e por quê.

## Arquitetura

- **GitHub Actions** roda a coleta uma vez por dia (`.github/workflows/coleta.yml`) e grava o resultado no próprio repositório.
- **Sem banco de dados.** Os dados ficam em arquivos JSON em `dados/`. O histórico do Git é o registro de mudanças.
- **Vercel** (etapa futura) vai publicar o site a partir deste repositório, lendo `dados/editais.json`.

## Estrutura

```
coletor/
  index.ts          Orquestra a coleta: lê as fontes, completa as datas, grava dados/
  detalhe.ts        Segunda etapa: abre a página ou o PDF de um edital para achar datas
  tipos.ts          Formatos de dados (Fonte, Edital, Correcao...)
  leitores/         Um arquivo por tipo de leitor
    index.ts        Registro: nome do leitor em fontes.json → função
    html-itens.ts   Páginas em que cada chamada tem um bloco HTML próprio
    html-blocos.ts  Páginas em que as chamadas vêm em sequência, separadas por uma marca
    wordpress.ts    Sites WordPress, via API pública de posts por categoria
    finep.ts        FINEP: página carregada por JavaScript, lida com navegador automatizado
  util/
    datas.ts        Extração de datas de inscrição em português (com testes)
    http.ts         Download com identificação, tempo limite e novas tentativas
    pdf.ts          Texto de PDFs (até 15 páginas)
    navegador.ts    Abre e fecha o navegador automatizado
    texto.ts        HTML para texto, normalização de links
dados/              Fontes, editais, execuções e correções
```

## Como a data de um edital é obtida

Em ordem, para cada edital, para no primeiro que der resultado:

1. Dados estruturados da fonte (FINEP).
2. Texto que acompanha o edital na lista (CNPq, FAPESP, FAPESC).
3. Página do edital e, se configurado, o PDF do edital (CAPES, EMBRAPII, BNDES).
4. "Fluxo contínuo" no título.

A extração procura palavras-chave (inscrições, submissão, data-limite, prazo) e lê a data logo depois delas. Ignora etapas como recurso, resultado e homologação, e datas de portarias. O trecho usado fica em `evidencia.trecho`.

Datas tiradas de páginas e PDFs são reaproveitadas por 3 dias antes de nova consulta, para não sobrecarregar os sites.

## Decisões

- **TypeScript em tudo.** Uma linguagem só para coletor e site.
- **Leitores genéricos configuráveis.** Uma fonte nova que se pareça com uma existente entra só com cadastro em `fontes.json`, sem programar. Fontes com estrutura nova exigem um leitor novo.
- **Falha de uma fonte não apaga dados.** Se uma fonte falha, os editais da coleta anterior são mantidos e o erro fica em `execucoes.json`.
- **Correções manuais prevalecem.** `correcoes.json` é aplicado por último, indexado pelo `id` do edital.
- **Status calculado pelo prazo.** A situação declarada pela fonte é guardada em `situacaoFonte`; quando ela contradiz o prazo, o edital recebe um `alerta`.
- **FINEP.** O leitor só abre as páginas públicas e aproveita os dados que a própria página recebe; não chama serviços internos diretamente.

## Convenções

- Nomes em português, sem abreviações.
- `id` de edital: `<fonte>-<10 primeiros caracteres do SHA-1 do link>`.
- Datas em ISO (`AAAA-MM-DD`), dia de referência no horário de Brasília.

## Limitações conhecidas

- BNDES: a página cobre só as chamadas de contratação de inovação; os detalhes ficam em worldlabs.org.
- CAPES: a lista "Editais Abertos" mistura programas antigos; muitos aparecem com alerta porque o prazo já passou.
- PDFs escaneados (imagem) não têm texto e ficam sem prazo identificado.
