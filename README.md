# Editais de pesquisa

Acompanhamento diário de editais de fomento à pesquisa no Brasil. Um robô visita as páginas de chamadas de cada órgão todos os dias, identifica os editais, procura as datas de inscrição e grava tudo em arquivos de dados. Cada data vem acompanhada do trecho de texto e do endereço de onde foi tirada, para que possa ser conferida.

## O que já funciona (versão 0.1)

- Coleta automática diária, às 6h de Brasília, pelo GitHub Actions.
- Sete fontes: CNPq, CAPES, FINEP, EMBRAPII, BNDES, FAPESP e FAPESC.
- Datas de inscrição lidas da lista da fonte, da página do edital ou do PDF do edital.
- Situação de cada edital: aberta, encerrada ou sem prazo identificado.
- Alerta quando a fonte apresenta um edital como aberto, mas o prazo encontrado já passou.
- Registro do resultado de cada fonte a cada coleta (quantidade, erros).

Ainda não existe o site público nem a área de administração. Veja `roadmap.md`.

## Onde estão os dados

| Arquivo | Conteúdo |
|---|---|
| `dados/fontes.json` | Cadastro das fontes e de como cada uma é lida |
| `dados/editais.json` | Editais encontrados na última coleta |
| `dados/execucoes.json` | Resultado das últimas coletas, por fonte |
| `dados/correcoes.json` | Correções manuais de datas e editais ocultados |

## Como rodar a coleta sem terminal

No GitHub, abra a aba **Actions**, escolha **Coleta de editais** e clique em **Run workflow**. Para coletar uma única fonte, preencha o campo com o identificador dela (por exemplo, `cnpq`).

## Como rodar no computador (para desenvolvimento)

Requer Node.js 22 ou mais recente.

```
npm install
npx playwright install chromium
npm run testar
npm run coletar
npm run coletar:fonte -- cnpq
```
