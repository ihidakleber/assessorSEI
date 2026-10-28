/*
 * Motor de geração: transforma (modelo + dados do formulário) em parágrafos prontos.
 * Não depende do navegador, para poder ser testado no Node.
 *
 * Sintaxe usada nos textos dos modelos:
 *   {nome}                       valor de um campo ou de um valor derivado
 *   {do servidor|da servidora}   flexão de gênero: masculino|feminino
 * Campo vazio vira um marcador pendente, ex.: [Nome completo], destacado na prévia.
 */
(function (raiz, fabrica) {
  if (typeof module === 'object' && module.exports) module.exports = fabrica(require('./util.js'));
  else raiz.Motor = fabrica(raiz.Util);
})(typeof self !== 'undefined' ? self : this, function (U) {
  'use strict';

  const modelos = [];

  function registrar(modelo) {
    modelos.push(modelo);
    return modelo;
  }

  function buscar(id) {
    return modelos.find((m) => m.id === id);
  }

  /** Lista plana de todos os campos do modelo, na ordem em que aparecem. */
  function campos(modelo) {
    return modelo.secoes.flatMap((s) => s.campos);
  }

  function visivel(item, d) {
    if (!item.se) return true;
    try {
      return !!item.se(d);
    } catch (e) {
      return false;
    }
  }

  /** Dados do formulário + indicadores calculados pelo modelo (ex.: d.prorrogacao). */
  function prepararDados(modelo, brutos) {
    const d = Object.assign({}, brutos);
    if (modelo.indicadores) Object.assign(d, modelo.indicadores(d));
    return d;
  }

  function rotuloDoCampo(campo) {
    return campo.rotuloPendente || campo.rotulo || campo.id;
  }

  /**
   * Monta o contexto de substituição:
   *  - valores: texto literal digitado pelo usuário (campos e configurações)
   *  - derivados: textos montados pelo modelo, que podem conter outros {marcadores}
   *  - rotulos: nome amigável de cada marcador, usado quando está pendente
   */
  function montarContexto(modelo, d, config) {
    const valores = {}, derivados = {}, rotulos = {};

    for (const c of modelo.configuracoes || []) rotulos[c.id] = c.rotulo;
    Object.assign(valores, config || {});

    for (const campo of campos(modelo)) {
      const v = d[campo.id];
      rotulos[campo.id] = rotuloDoCampo(campo);
      switch (campo.tipo) {
        case 'data':
          valores[campo.id] = U.formatarData(v);
          break;
        case 'parecer':
          rotulos['doc_' + campo.id] = `Nº SEI (${campo.rotulo})`;
          valores['doc_' + campo.id] = (d['doc_' + campo.id] || '').trim();
          break;
        case 'lotacao': {
          valores[campo.id] = (v || '').trim();
          const art = d[campo.id + '_artigo'] === 'a' || d[campo.id + '_artigo'] === 'o'
            ? d[campo.id + '_artigo'] : (U.detectarArtigo(v) || 'a');
          for (const prep of ['em', 'de', 'a', 'para']) {
            derivados[`${campo.id}_${prep}`] = `${U.contracao(prep, art)} {${campo.id}}`;
          }
          break;
        }
        case 'checkbox':
          break;
        default:
          valores[campo.id] = typeof v === 'string' ? v.trim() : (v == null ? '' : String(v));
      }
    }

    Object.assign(rotulos, modelo.rotulos || {});
    if (modelo.derivar) Object.assign(derivados, modelo.derivar(d, U));

    return { valores, derivados, rotulos, genero: d.genero };
  }

  const tem = (obj, k) => Object.prototype.hasOwnProperty.call(obj, k);

  /** Substitui os marcadores e devolve uma lista de segmentos {texto} ou {pendente, exibir}. */
  function interpolar(modeloTexto, ctx, profundidade) {
    profundidade = profundidade || 0;
    const segs = [];
    const re = /\{([^{}]+)\}/g;
    let ultimo = 0, m;
    while ((m = re.exec(modeloTexto))) {
      if (m.index > ultimo) segs.push({ texto: modeloTexto.slice(ultimo, m.index) });
      ultimo = re.lastIndex;
      const chave = m[1];

      if (chave.includes('|')) {
        const [masc, fem] = chave.split('|');
        if (ctx.genero === 'm') segs.push({ texto: masc });
        else if (ctx.genero === 'f') segs.push({ texto: fem });
        else segs.push({ pendente: 'Gênero', exibir: `${masc}/${fem}` });
        continue;
      }

      const nome = chave.trim();
      const rotulo = ctx.rotulos[nome] || nome;
      if (tem(ctx.derivados, nome)) {
        const v = ctx.derivados[nome];
        if (v === null || v === undefined) segs.push({ pendente: rotulo });
        else if (profundidade < 5) segs.push(...interpolar(String(v), ctx, profundidade + 1));
      } else if (tem(ctx.valores, nome) && ctx.valores[nome] !== '') {
        segs.push({ texto: String(ctx.valores[nome]) });
      } else {
        segs.push({ pendente: rotulo });
      }
    }
    if (ultimo < modeloTexto.length) segs.push({ texto: modeloTexto.slice(ultimo) });
    return segs;
  }

  function percorrerBlocos(blocos, d, ctx, saida) {
    for (const bloco of blocos) {
      if (!visivel(bloco, d)) continue;
      if (bloco.blocos) {
        percorrerBlocos(bloco.blocos, d, ctx, saida);
        continue;
      }
      const tipo = bloco.tipo || 'p';
      const texto = typeof bloco.texto === 'function' ? bloco.texto(d) : (bloco.texto || '');
      saida.push({ tipo, segs: tipo === 'vazio' ? [] : interpolar(texto, ctx) });
    }
  }

  /**
   * Gera um documento do modelo.
   * @returns {{ blocos: Array<{tipo, segs}>, pendentes: string[] }}
   */
  function gerar(modelo, docId, brutos, config) {
    const doc = modelo.documentos.find((x) => x.id === docId);
    const d = prepararDados(modelo, brutos);
    const ctx = montarContexto(modelo, d, config);
    const blocos = [];
    percorrerBlocos(doc.blocos, d, ctx, blocos);
    const pendentes = [];
    for (const b of blocos) {
      for (const s of b.segs) {
        if (s.pendente && !pendentes.includes(s.pendente)) pendentes.push(s.pendente);
      }
    }
    return { blocos, pendentes };
  }

  function avisos(modelo, brutos) {
    if (!modelo.avisos) return [];
    return modelo.avisos(prepararDados(modelo, brutos), U) || [];
  }

  // ---------- Saídas ----------

  const textoDoPendente = (s) => `[${s.exibir || s.pendente}]`;

  function segsParaHTML(segs, marcar) {
    return segs.map((s) => (s.pendente ? marcar(s) : U.escaparHTML(s.texto))).join('');
  }

  /** HTML da prévia na tela (classes CSS locais). */
  function htmlPrevia(resultado) {
    return resultado.blocos.map((b) => {
      const conteudo = b.tipo === 'vazio' ? '&nbsp;' : segsParaHTML(b.segs, (s) =>
        `<mark class="pendente" title="Campo pendente: ${U.escaparHTML(s.pendente)}">${U.escaparHTML(textoDoPendente(s))}</mark>`);
      return `<p class="sei-${b.tipo}">${conteudo}</p>`;
    }).join('\n');
  }

  /**
   * HTML para colar no editor do SEI: cada parágrafo recebe a classe de estilo do SEI
   * (ex.: Texto_Justificado_Recuo_Primeira_Linha) e, opcionalmente, o estilo equivalente inline.
   */
  function htmlSEI(resultado, estilos, incluirInline) {
    return resultado.blocos.map((b) => {
      const est = estilos[b.tipo] || estilos.p;
      const attrs = `class="${est.classe}"` + (incluirInline && est.inline ? ` style="${est.inline}"` : '');
      const conteudo = b.tipo === 'vazio' ? '&nbsp;' : segsParaHTML(b.segs, (s) =>
        `<span style="background-color:#ffff00">${U.escaparHTML(textoDoPendente(s))}</span>`);
      return `<p ${attrs}>${conteudo}</p>`;
    }).join('\n');
  }

  /** Texto simples, um parágrafo por bloco, separados por linha em branco. */
  function textoSimples(resultado) {
    return resultado.blocos
      .filter((b) => b.tipo !== 'vazio')
      .map((b) => b.segs.map((s) => (s.pendente ? textoDoPendente(s) : s.texto)).join(''))
      .join('\n\n');
  }

  return {
    modelos, registrar, buscar, campos, visivel, prepararDados,
    gerar, avisos, interpolar, htmlPrevia, htmlSEI, textoSimples,
  };
});
