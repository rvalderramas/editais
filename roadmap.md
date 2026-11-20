# Roadmap

## Concluído

- [x] Estrutura do repositório, formatos de dados e documentação — v0.1, 10/11/2026
- [x] Leitores html-itens, html-blocos, wordpress e finep — v0.1, 10/11/2026
- [x] Fontes CNPq, CAPES, FINEP, EMBRAPII, BNDES, FAPESP e FAPESC — v0.1, 10/11/2026
- [x] Extração de datas de listas, páginas e PDFs, com trecho de evidência — v0.1, 10/11/2026
- [x] Alerta de divergência entre situação da fonte e prazo — v0.1, 10/11/2026
- [x] Coleta diária no GitHub Actions, com disparo manual — v0.1, 10/11/2026
- [x] Site público: régua de prazos, lista com busca e filtros, página do edital com evidência, página de fontes — v0.2, 10/11/2026
- [x] Fluxo contínuo no topo, mapa de abrangência, aba CIIDCMIL, Next.js 16.4.5 (correções de segurança) — v0.3, 19/11/2026

## Próximas etapas

- [ ] Primeira semana de coletas reais no GitHub Actions e ajustes dos leitores
  - BNDES: as páginas de detalhe (worldlabs.org) não revelaram prazos; avaliar leitura com navegador
  - EMBRAPII: 4 chamadas sem prazo identificado; conferir os PDFs
- [ ] Publicar o site na Vercel (importar o repositório)
- [ ] Área de administração: login com GitHub, cadastro e teste de fontes, correção de datas, painel de saúde das fontes, botão de coleta
- [ ] Novas fontes (outras FAPs e órgãos federais). IFSP, Mapa da Cultura e Embratur bloqueiam leitura automática; MIR, MinC, MEMP e MTur avaliados sem editais próprios de pesquisa (19/11/2026)
- [ ] Corrigir o trecho de evidência que começa no meio de uma palavra quando a data é "fluxo contínuo"
