/*
 * Configurações gerais.
 *
 * estilosSEI: estilo de parágrafo do editor do SEI aplicado a cada tipo de bloco dos modelos.
 * Os nomes de classe são os padrões do SEI; o "inline" reproduz a mesma formatação, para o caso
 * de o editor descartar as classes ao colar.
 */
(function (raiz, fabrica) {
  if (typeof module === 'object' && module.exports) module.exports = fabrica();
  else raiz.AssessorConfig = fabrica();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const PARAGRAFO = {
    classe: 'Texto_Justificado_Recuo_Primeira_Linha',
    inline: 'font-size:12pt;font-family:Calibri;text-indent:25mm;text-align:justify;word-wrap:normal;margin:6pt;',
  };

  return {
    estilosSEI: {
      p: PARAGRAFO,
      alinea: PARAGRAFO,
      vazio: PARAGRAFO,
      vocativo: {
        classe: 'Texto_Alinhado_Esquerda',
        inline: 'font-size:12pt;font-family:Calibri;text-align:left;word-wrap:normal;margin:6pt;',
      },
      citacao: {
        classe: 'Citacao',
        inline: 'font-size:10pt;font-family:Calibri;word-wrap:normal;margin:4pt 0 4pt 160px;text-align:justify;',
      },
    },
  };
});
