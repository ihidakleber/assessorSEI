/*
 * Testes do motor e do modelo de readaptação.
 * Rodar com:  node testes/gerar.test.js
 */
'use strict';

const assert = require('assert');
const path = require('path');

global.Util = require('../js/util.js');
global.Motor = require('../js/motor.js');
require('../modelos/readaptacao.js');

const U = global.Util;
const M = global.Motor;
const modelo = M.buscar('readaptacao');
const CONFIG = Object.fromEntries(modelo.configuracoes.map((c) => [c.id, c.padrao]));

let falhas = 0;
function teste(nome, fn) {
  try {
    fn();
    console.log('ok   ' + nome);
  } catch (e) {
    falhas++;
    console.log('FALHA ' + nome + '\n      ' + e.message.split('\n').join('\n      '));
  }
}

const gerarTexto = (doc, d) => M.textoSimples(M.gerar(modelo, doc, d, CONFIG));
const contem = (texto, trecho) => assert.ok(texto.includes(trecho), `esperava encontrar:\n  "${trecho}"\nem:\n${texto}`);
const naoContem = (texto, trecho) => assert.ok(!texto.includes(trecho), `não esperava encontrar:\n  "${trecho}"`);

// ---------- Utilitários ----------

teste('extenso', () => {
  assert.strictEqual(U.extenso(1), 'um');
  assert.strictEqual(U.extenso(6), 'seis');
  assert.strictEqual(U.extenso(14), 'quatorze');
  assert.strictEqual(U.extenso(24), 'vinte e quatro');
  assert.strictEqual(U.extenso(100), 'cem');
  assert.strictEqual(U.extenso(180), 'cento e oitenta');
});

teste('prazo por extenso', () => {
  assert.strictEqual(U.prazoPorExtenso(1, 'anos'), '1 (um) ano');
  assert.strictEqual(U.prazoPorExtenso(2, 'anos'), '2 (dois) anos');
  assert.strictEqual(U.prazoPorExtenso(1, 'meses'), '1 (um) mês');
  assert.strictEqual(U.prazoPorExtenso(6, 'meses'), '6 (seis) meses');
  assert.strictEqual(U.prazoPorExtenso('', 'meses'), '');
  assert.strictEqual(U.prazoPorExtenso(6, ''), '');
});

teste('datas', () => {
  assert.strictEqual(U.formatarData('2026-10-07'), '07/10/2026');
  assert.strictEqual(U.somarPrazo('2026-10-07', 6, 'meses'), '2027-04-07');
  assert.strictEqual(U.somarPrazo('2026-04-01', 1, 'anos'), '2027-04-01');
  assert.strictEqual(U.somarPrazo('2026-01-31', 1, 'meses'), '2026-02-28');
  assert.strictEqual(U.somarDias('2026-10-10', 1), '2026-10-11');
  assert.strictEqual(U.somarDias('2026-12-31', 1), '2027-01-01');
});

teste('artigo da unidade', () => {
  assert.strictEqual(U.detectarArtigo('Seção de Registro e Controle de Benefícios'), 'a');
  assert.strictEqual(U.detectarArtigo('Núcleo de Perícias Médicas'), 'o');
  assert.strictEqual(U.detectarArtigo('Departamento de Saúde'), 'o');
  assert.strictEqual(U.detectarArtigo('1ª Vara Cível'), 'a');
  assert.strictEqual(U.detectarArtigo('2º Juizado Especial'), 'o');
  assert.strictEqual(U.detectarArtigo('Gabinete da Presidência'), 'o');
});

// ---------- Cenários do modelo ----------

const BASE = {
  genero: 'f', nome: 'Fulana de Tal', cadastro: '123456', cargo: 'Técnica Judiciária',
  lotacao: 'Seção de Admissão e Movimentação de Pessoal/SGP', doc_nupemed: '1111111', doc_sgp: '9999999',
};

teste('concessão em teletrabalho com relotação (exemplo 1)', () => {
  const d = Object.assign({}, BASE, {
    pedido: 'concessao', modalidade: 'teletrabalho', prazo_n: '6', prazo_unidade: 'meses',
    inicio: '2026-10-07', fim: '2027-04-07', gtpo: true, doc_gtpo: '2222222', destino: 'relotar',
    nova_lotacao: 'Seção de Registro e Controle de Benefícios', data_relotacao: '2026-10-19',
  });
  const desp = gerarTexto('despacho', d);
  contem(desp, 'Excelentíssima Juíza Secretária Geral,');
  contem(desp, 'Trata-se da concessão de readaptação, por problemas de saúde, da servidora Fulana de Tal, cadastro 123456, Técnica Judiciária, lotada na Seção de Admissão e Movimentação de Pessoal/SGP.');
  contem(desp, 'o Nupemed emitiu laudo (1111111) favorável à sua readaptação, pelo prazo de 6 (seis) meses, em teletrabalho, no período de 07/10/2026 a 07/04/2027.');
  contem(desp, 'O GTPO concluiu pela necessidade de concessão da readaptação da servidora, devido a sua condição de saúde, com relotação na Seção de Registro e Controle de Benefícios, a partir de 19/10/2026 (2222222).');
  contem(desp, 'Respeitosamente,');

  const dec = gerarTexto('decisao', d);
  contem(dec, 'A Secretaria de Gestão de Pessoas encaminhou os autos para deliberação (9999999).');
  contem(dec, 'consta o devido parecer do Nupemed (1111111) e a recomendação do GTPO (2222222), os quais são favoráveis à concessão da readaptação da servidora.');
  contem(dec, 'defiro a concessão da readaptação da servidora Fulana de Tal, cadastro 123456, Técnica Judiciária, em teletrabalho, pelo prazo de 6 (seis) meses, no período de 07/10/2026 a 07/04/2027.');
  contem(dec, 'Ainda, determino que a servidora seja relotada da Seção de Admissão e Movimentação de Pessoal/SGP para a Seção de Registro e Controle de Benefícios, a partir de 19/10/2026, nos termos do relatório do GTPO (2222222).');
  contem(dec, 'A servidora, enquanto estiver em teletrabalho, nos termos do art. 6º do Ato nº 1313/2025, deverá:');
  contem(dec, 'c) comparecer presencialmente à unidade de lotação sempre que convocada,');
  contem(dec, 'deverá apresentar novo laudo e ser submetida a avaliação médica.');
  naoContem(dec, 'média da produtividade');
  naoContem(dec, 'mantendo sua lotação atual');
  assert.deepStrictEqual(M.gerar(modelo, 'decisao', d, CONFIG).pendentes, []);
});

teste('concessão nas atuais condições, Sebio + SST + GTPO mantendo lotação (exemplo 2)', () => {
  const d = Object.assign({}, BASE, {
    pedido: 'concessao', modalidade: 'atuais', prazo_n: '1', prazo_unidade: 'anos',
    inicio: '2026-04-01', fim: '2027-04-01', sebio: true, doc_sebio: '3333333', sst: true, doc_sst: '4444444',
    gtpo: true, doc_gtpo: '2222222', destino: 'manter',
  });
  const desp = gerarTexto('despacho', d);
  contem(desp, 'pelo prazo de 1 (um) ano, nas atuais condições, no período de 01/04/2026 a 01/04/2027.');
  contem(desp, 'A Sebio (3333333) e a SST (4444444) apresentaram laudo de avaliação do posto de trabalho. Ademais, o GTPO concluiu pela permanência da servidora em sua atual unidade de lotação (2222222).');
  const dec = gerarTexto('decisao', d);
  contem(dec, 'Técnica Judiciária, pelo prazo de 1 (um) ano, no período de 01/04/2026 a 01/04/2027, mantendo sua lotação atual.');
  naoContem(dec, 'em teletrabalho');
  naoContem(dec, 'determino que');
});

teste('prorrogação só com SST (exemplo 3)', () => {
  const d = Object.assign({}, BASE, {
    pedido: 'prorrogacao', ant_prazo_n: '1', ant_prazo_unidade: 'anos', ant_inicio: '2025-10-10', ant_fim: '2026-10-10',
    portaria: 'nº 1234/2025', doc_portaria: '5555555', modalidade: 'atuais', prazo_n: '1', prazo_unidade: 'anos',
    inicio: '2026-10-11', fim: '2027-10-11', sst: true, doc_sst: '4444444', destino: 'manter',
  });
  const desp = gerarTexto('despacho', d);
  contem(desp, 'Trata-se da prorrogação de readaptação');
  contem(desp, 'A servidora estava readaptada por 1 (um) ano, no período de 10/10/2025 a 10/10/2026, conforme Portaria Presidência 1234/2025 (5555555).');
  contem(desp, 'favorável à prorrogação de sua readaptação, pelo prazo de 1 (um) ano, nas atuais condições, no período de 11/10/2026 a 11/10/2027.');
  contem(desp, 'A SST (4444444) apresentou laudo de avaliação do posto de trabalho, mantendo sua lotação atual.');
  naoContem(desp, 'GTPO');
  const dec = gerarTexto('decisao', d);
  contem(dec, 'consta o devido parecer do Nupemed (1111111), o qual é favorável à prorrogação da readaptação da servidora.');
});

teste('prorrogação em teletrabalho, GTPO, Oficial de Justiça, servidor (exemplo 4)', () => {
  const d = Object.assign({}, BASE, {
    genero: 'm', nome: 'Fulano de Tal', cargo: 'Oficial de Justiça', oficial: true,
    pedido: 'prorrogacao', ant_prazo_n: '1', ant_prazo_unidade: 'anos', ant_inicio: '2025-08-05', ant_fim: '2026-08-04',
    portaria: '987/2025', doc_portaria: '5555555', modalidade: 'teletrabalho', prazo_n: '1', prazo_unidade: 'anos',
    inicio: '2026-08-05', fim: '2027-08-05', gtpo: true, doc_gtpo: '5606658', destino: 'manter',
  });
  const desp = gerarTexto('despacho', d);
  contem(desp, 'do servidor Fulano de Tal, cadastro 123456, Oficial de Justiça, lotado na Seção');
  contem(desp, 'O servidor estava readaptado por 1 (um) ano');
  contem(desp, 'O GTPO concluiu pela necessidade de prorrogação da readaptação do servidor (5606658), com a manutenção do teletrabalho, devido a sua condição de saúde, mantendo sua lotação na Seção de Admissão e Movimentação de Pessoal/SGP.');
  const dec = gerarTexto('decisao', d);
  contem(dec, 'O servidor esteve readaptado pelo prazo de 1 (um) ano');
  contem(dec, 'nos termos da Decisão 2063 (5546695), o servidor faz jus ao pagamento da média da produtividade, durante o período de readaptação.');
  contem(dec, 'sempre que convocado,');
  contem(dec, 'ser submetido a avaliação médica.');
  contem(dec, 'O servidor, enquanto estiver em teletrabalho');
});

teste('campos vazios viram pendências', () => {
  const r = M.gerar(modelo, 'despacho', { pedido: 'concessao', destino: 'manter' }, CONFIG);
  const texto = M.textoSimples(r);
  contem(texto, '[do servidor/da servidora]');
  contem(texto, '[Nome completo]');
  contem(texto, 'na [Lotação atual]');
  contem(texto, '[Prazo do laudo]');
  assert.ok(r.pendentes.includes('Gênero'));
  assert.ok(r.pendentes.includes('Nº SEI do laudo'));
});

teste('HTML para o SEI usa as classes de estilo e escapa o conteúdo', () => {
  const CFG = require('../js/config.js');
  const d = Object.assign({}, BASE, { nome: 'Ana <b>&</b>', pedido: 'concessao', modalidade: 'teletrabalho' });
  const html = M.htmlSEI(M.gerar(modelo, 'decisao', d, CONFIG), CFG.estilosSEI, false);
  contem(html, '<p class="Texto_Justificado_Recuo_Primeira_Linha">Trata-se');
  contem(html, '<p class="Citacao">Art. 11.');
  contem(html, 'Ana &lt;b&gt;&amp;&lt;/b&gt;');
  naoContem(html, 'style="font-size');
});

teste('avisos de consistência', () => {
  const a = M.avisos(modelo, { pedido: 'prorrogacao', ant_fim: '2026-10-10', inicio: '2026-10-15', fim: '2026-10-01', destino: 'relotar' });
  assert.strictEqual(a.length, 3);
});

if (process.argv.includes('--mostrar')) {
  const d = Object.assign({}, BASE, modelo.exemplo);
  console.log('\n===== DESPACHO (exemplo) =====\n' + gerarTexto('despacho', d));
  console.log('\n===== DECISÃO (exemplo) =====\n' + gerarTexto('decisao', d));
}

console.log(falhas ? `\n${falhas} teste(s) falharam (${path.basename(__filename)})` : '\nTodos os testes passaram.');
process.exit(falhas ? 1 : 0);
