/*
 * Funções utilitárias: números por extenso, datas, artigos/contrações e escape de HTML.
 * Funciona no navegador (window.Util) e no Node (module.exports), para permitir testes.
 */
(function (raiz, fabrica) {
  if (typeof module === 'object' && module.exports) module.exports = fabrica();
  else raiz.Util = fabrica();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // ---------- Números por extenso (masculino, 0 a 999) ----------

  const UNIDADES = ['zero', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove',
    'dez', 'onze', 'doze', 'treze', 'quatorze', 'quinze', 'dezesseis', 'dezessete', 'dezoito', 'dezenove'];
  const DEZENAS = ['', '', 'vinte', 'trinta', 'quarenta', 'cinquenta', 'sessenta', 'setenta', 'oitenta', 'noventa'];
  const CENTENAS = ['', 'cento', 'duzentos', 'trezentos', 'quatrocentos', 'quinhentos', 'seiscentos',
    'setecentos', 'oitocentos', 'novecentos'];

  function extenso(n) {
    n = Number(n);
    if (!Number.isInteger(n) || n < 0 || n > 999) return String(n);
    if (n < 20) return UNIDADES[n];
    if (n < 100) {
      const d = Math.floor(n / 10), u = n % 10;
      return DEZENAS[d] + (u ? ' e ' + UNIDADES[u] : '');
    }
    if (n === 100) return 'cem';
    const c = Math.floor(n / 100), r = n % 100;
    return CENTENAS[c] + (r ? ' e ' + extenso(r) : '');
  }

  const UNIDADES_PRAZO = {
    dias: ['dia', 'dias'],
    meses: ['mês', 'meses'],
    anos: ['ano', 'anos'],
  };

  /** "6 (seis) meses", "1 (um) ano". Retorna '' se faltar número ou unidade. */
  function prazoPorExtenso(n, unidade) {
    n = parseInt(n, 10);
    if (!n || n < 1 || !UNIDADES_PRAZO[unidade]) return '';
    const [singular, plural] = UNIDADES_PRAZO[unidade];
    return `${n} (${extenso(n)}) ${n === 1 ? singular : plural}`;
  }

  // ---------- Datas (formato ISO AAAA-MM-DD, sem fuso horário) ----------

  function lerISO(s) {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s || '');
    return m ? new Date(Date.UTC(+m[1], +m[2] - 1, +m[3])) : null;
  }

  function paraISO(dt) {
    return dt.toISOString().slice(0, 10);
  }

  const doisDigitos = (n) => String(n).padStart(2, '0');

  /** "2026-10-07" -> "07/10/2026" */
  function formatarData(iso) {
    const dt = lerISO(iso);
    if (!dt) return '';
    return `${doisDigitos(dt.getUTCDate())}/${doisDigitos(dt.getUTCMonth() + 1)}/${dt.getUTCFullYear()}`;
  }

  function somarDias(iso, n) {
    const dt = lerISO(iso);
    if (!dt) return '';
    dt.setUTCDate(dt.getUTCDate() + n);
    return paraISO(dt);
  }

  /**
   * Data final de um prazo contado a partir de `iso`, caindo no mesmo dia do mês
   * (07/10/2026 + 6 meses = 07/04/2027). Se o dia não existir no mês final, usa o último dia.
   */
  function somarPrazo(iso, n, unidade) {
    const dt = lerISO(iso);
    n = parseInt(n, 10);
    if (!dt || !n || !UNIDADES_PRAZO[unidade]) return '';
    if (unidade === 'dias') return somarDias(iso, n);
    const meses = unidade === 'anos' ? n * 12 : n;
    const ano = dt.getUTCFullYear(), mes = dt.getUTCMonth() + meses, dia = dt.getUTCDate();
    const ultimoDia = new Date(Date.UTC(ano, mes + 1, 0)).getUTCDate();
    return paraISO(new Date(Date.UTC(ano, mes, Math.min(dia, ultimoDia))));
  }

  // ---------- Artigos e contrações para nomes de unidades ----------

  // Palavras iniciais que pedem artigo masculino ("no Núcleo", "do Departamento").
  // Qualquer outra palavra é tratada como feminina ("na Seção", "da Divisão").
  const MASCULINOS = new Set([
    'nucleo', 'departamento', 'gabinete', 'juizado', 'cartorio', 'setor', 'centro', 'servico', 'forum',
    'grupo', 'conselho', 'tribunal', 'cejusc', 'nupemed', 'posto', 'almoxarifado', 'arquivo', 'protocolo',
    'plenario', 'comite', 'escritorio', 'oficio', 'gtpo', 'deposito', 'laboratorio', 'programa',
  ]);

  const semAcento = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '');

  /** Detecta o artigo ('a' ou 'o') pela primeira palavra do nome da unidade. */
  function detectarArtigo(texto) {
    const t = (texto || '').trim();
    if (!t) return '';
    const palavras = t.split(/[\s/]+/);
    let primeira = palavras[0];
    // Ordinais: "1ª Vara", "2º Juizado"
    if (/ª/.test(primeira)) return 'a';
    if (/[º°]/.test(primeira)) return 'o';
    if (/^\d+$/.test(primeira) && palavras[1]) primeira = palavras[1];
    return MASCULINOS.has(semAcento(primeira.toLowerCase()).replace(/[^a-z]/g, '')) ? 'o' : 'a';
  }

  const CONTRACOES = {
    em: { a: 'na', o: 'no' },
    de: { a: 'da', o: 'do' },
    a: { a: 'à', o: 'ao' },
    para: { a: 'para a', o: 'para o' },
    por: { a: 'pela', o: 'pelo' },
  };

  /** contracao('em', 'o') -> 'no' */
  function contracao(preposicao, artigo) {
    return CONTRACOES[preposicao][artigo === 'o' ? 'o' : 'a'];
  }

  // ---------- Texto ----------

  function capitalizar(s) {
    return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
  }

  /** ['a', 'b', 'c'] -> 'a, b e c' */
  function juntarLista(itens) {
    if (itens.length <= 1) return itens.join('');
    return itens.slice(0, -1).join(', ') + ' e ' + itens[itens.length - 1];
  }

  /** Remove prefixos como "nº", "n.", "No" digitados antes de um número. */
  function semPrefixoNumero(s) {
    return (s || '').trim().replace(/^n\s*[º°o.]*\s*/i, '');
  }

  function escaparHTML(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  return {
    extenso, prazoPorExtenso, UNIDADES_PRAZO,
    lerISO, formatarData, somarDias, somarPrazo,
    detectarArtigo, contracao,
    capitalizar, juntarLista, semPrefixoNumero, escaparHTML,
  };
});
