// Casos reais copiados das páginas das fontes em 10/11/2026.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { extrairDatas } from './datas.ts';

const casos: [string, string, { inicio?: string; fim?: string; fluxoContinuo?: boolean }][] = [
  ['CNPq', 'Inscrições: 26/10/2026 a 08/12/2026 FAQ', { inicio: '2026-10-26', fim: '2026-12-08' }],
  ['FAPESP', 'Data-limite para submissão de pré-propostas: 12/11/2026 Área: inovação', { fim: '2026-11-12' }],
  ['FAPESC', 'na presente Chamada. Prazo para submissão: 23/09/2026 a 06/11/2026 Contato para dúvidas', { inicio: '2026-09-23', fim: '2026-11-06' }],
  ['FAPESC fluxo', 'Prazo para submissão: Fluxo contínuo até 30/06/2028 Contato', { fim: '2028-06-30', fluxoContinuo: true }],
  [
    'EMBRAPII',
    'Live de apresentação dos desafios 04 de novembro 2026 Workshop 17 de novembro 2026 Submissão das pré-propostas pelas Unidades Embrapii De 18 de novembro 2026 a 08 de janeiro 2027 Seleção preliminar',
    { inicio: '2026-11-18', fim: '2027-01-08' },
  ],
  ['dias com mesmo mês', 'Período de inscrições 08 a 25 de março de 2027', { inicio: '2027-03-08', fim: '2027-03-25' }],
  ['virada de ano', 'Inscrições de 22 de dezembro a 05 de janeiro de 2027', { inicio: '2026-12-22', fim: '2027-01-05' }],
  ['data sem ano no início', 'Inscrições 01/04 a 30/05/2026', { inicio: '2026-04-01', fim: '2026-05-30' }],
  ['ignora prazo de recurso', 'Prazo para recurso 02 de abril 2027. Inscrições até 10/03/2027', { fim: '2027-03-10' }],
  ['CAPES horário no meio', 'A submissão deverá ser feita no período de 24 de agosto de 2026 até as 18h do dia 18 de dezembro de 2026.', { inicio: '2026-08-24', fim: '2026-12-18' }],
  ['CAPES cronograma', 'Publicação do Edital 25/09/2026 Inscrições De 28/09/2026 até às 23:59 do dia 04/10/2026 Apresentação', { inicio: '2026-09-28', fim: '2026-10-04' }],
  ['ignora data de portaria', 'Inscrição: http://inscricao.capes.gov.br · Portaria MEC nº 421, de 15 de maio de 2026', {}],
  ['número de edital não é data', 'Edital nº 08/2026 Inscrições até 15/05/2026', { fim: '2026-05-15' }],
];

for (const [nome, texto, esperado] of casos) {
  test(nome, () => {
    const r = extrairDatas(texto, 2026);
    assert.equal(r.inicio, esperado.inicio, 'início');
    assert.equal(r.fim, esperado.fim, 'fim');
    assert.equal(!!r.fluxoContinuo, !!esperado.fluxoContinuo, 'fluxo contínuo');
    if (esperado.inicio || esperado.fim || esperado.fluxoContinuo) assert.ok(r.trecho, 'trecho de evidência');
  });
}

test('sem datas', () => {
  assert.deepEqual(extrairDatas('Programa de cooperação internacional.', 2026), {});
});
