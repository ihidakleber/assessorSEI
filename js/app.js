/*
 * Interface: monta o formulário a partir do modelo escolhido, atualiza a prévia a cada
 * alteração e copia o resultado. Os dados digitados não são gravados em lugar nenhum;
 * só as configurações (vocativo, atos etc.) ficam salvas no navegador.
 */
(function () {
  'use strict';

  const U = window.Util, M = window.Motor, CFG = window.AssessorConfig;
  const CHAVE_PREFERENCIAS = 'assessorSEI.preferencias.v1';

  const $ = (sel, raiz) => (raiz || document).querySelector(sel);

  function el(tag, attrs, ...filhos) {
    const e = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs || {})) {
      if (v === undefined || v === null || v === false) continue;
      if (k === 'class') e.className = v;
      else if (k === 'dataset') Object.assign(e.dataset, v);
      else if (k in e && typeof v !== 'string') e[k] = v;
      else e.setAttribute(k, v === true ? '' : v);
    }
    for (const f of filhos) if (f !== null && f !== undefined) e.append(f);
    return e;
  }

  const form = $('#formulario');

  const estado = {
    modelo: null,
    docId: null,
    manuais: new Set(), // campos automáticos que o usuário editou à mão
    calculados: new Set(), // campos cujo valor atual veio do cálculo automático
    resultado: null,
  };

  // ---------- Preferências (só configurações, nunca dados do processo) ----------

  function lerPreferencias() {
    try {
      return Object.assign({ inline: true, valores: {} }, JSON.parse(localStorage.getItem(CHAVE_PREFERENCIAS)) || {});
    } catch (e) {
      return { inline: true, valores: {} };
    }
  }

  const preferencias = lerPreferencias();

  function salvarPreferencias() {
    try {
      localStorage.setItem(CHAVE_PREFERENCIAS, JSON.stringify(preferencias));
    } catch (e) { /* navegador sem armazenamento: segue só nesta sessão */ }
  }

  function valoresConfiguracao() {
    const salvos = preferencias.valores[estado.modelo.id] || {};
    const v = {};
    for (const c of estado.modelo.configuracoes || []) v[c.id] = c.id in salvos ? salvos[c.id] : c.padrao;
    return v;
  }

  // ---------- Formulário ----------

  const LARGURA_PADRAO = { opcoes: 4, checkbox: 4, parecer: 4, lotacao: 4, texto: 2, sei: 2, numero: 1, data: 1 };

  const campoPorId = (id) => M.campos(estado.modelo).find((c) => c.id === id);

  function linhaRotulo(c, paraId) {
    return el('div', { class: 'rotulo' },
      paraId ? el('label', { for: paraId }, c.rotulo) : el('span', {}, c.rotulo),
      el('span', { class: 'dica', id: 'dica-' + c.id }, c.dica || ''));
  }

  function criarCampo(c) {
    const id = 'f-' + c.id;
    const wrap = el('div', { class: 'campo l' + (c.largura || LARGURA_PADRAO[c.tipo] || 2), dataset: { campo: c.id } });

    switch (c.tipo) {
      case 'opcoes':
        if (c.estilo === 'lista') {
          const sel = el('select', { id }, el('option', { value: '' }, '—'));
          for (const [valor, rotulo] of c.opcoes) sel.append(el('option', { value: valor }, rotulo));
          wrap.append(linhaRotulo(c, id), sel);
        } else {
          const grupo = el('div', { class: 'segmentado', role: 'radiogroup', 'aria-label': c.rotulo });
          for (const [valor, rotulo] of c.opcoes) {
            grupo.append(el('label', {}, el('input', { type: 'radio', name: id, value: valor }), el('span', {}, rotulo)));
          }
          wrap.append(linhaRotulo(c), grupo);
        }
        break;

      case 'checkbox':
        wrap.append(el('label', { class: 'campo-check' }, el('input', { type: 'checkbox', id }), el('span', {}, c.rotulo)),
          el('span', { class: 'dica', id: 'dica-' + c.id }));
        break;

      case 'parecer':
        wrap.append(el('div', { class: 'parecer' },
          el('label', { class: 'campo-check' },
            el('input', { type: 'checkbox', id }),
            el('span', {}, el('strong', {}, c.rotulo), el('span', { class: 'descricao' }, ' — ' + (c.descricao || '')),
              ' ', el('span', { class: 'dica', id: 'dica-' + c.id }))),
          el('input', { type: 'text', id: 'f-doc_' + c.id, inputmode: 'numeric', placeholder: 'nº SEI',
            'aria-label': `Nº SEI (${c.rotulo})` })));
        break;

      case 'lotacao': {
        const art = el('select', { id: id + '_artigo', 'aria-label': 'Artigo da unidade', title: 'Artigo usado antes do nome da unidade' },
          el('option', { value: '' }, 'auto'), el('option', { value: 'a' }, 'na / da'), el('option', { value: 'o' }, 'no / do'));
        wrap.append(linhaRotulo(c, id),
          el('div', { class: 'linha-composta' }, el('input', { type: 'text', id, placeholder: c.dica || '' }), art));
        break;
      }

      default: {
        const attrs = { id, type: 'text' };
        if (c.tipo === 'data') attrs.type = 'date';
        if (c.tipo === 'numero') Object.assign(attrs, { type: 'number', min: '1', step: '1', inputmode: 'numeric' });
        if (c.tipo === 'sei') Object.assign(attrs, { inputmode: 'numeric', placeholder: 'nº SEI' });
        if (c.modoTeclado) attrs.inputmode = c.modoTeclado;
        if (c.placeholder) attrs.placeholder = c.placeholder;
        const input = el('input', attrs);
        wrap.append(linhaRotulo(c, id), input);
        if (c.sugestoes) {
          input.setAttribute('list', 'lista-' + c.id);
          wrap.append(el('datalist', { id: 'lista-' + c.id }, ...c.sugestoes.map((s) => el('option', { value: s }))));
        }
      }
    }
    return wrap;
  }

  function renderizarFormulario() {
    form.innerHTML = '';
    estado.modelo.secoes.forEach((secao, i) => {
      const grade = el('div', { class: 'grade' }, ...secao.campos.map(criarCampo));
      form.append(el('fieldset', { class: 'secao', dataset: { secao: String(i) } }, el('legend', {}, secao.titulo), grade));
    });
    aplicarPadroes();
  }

  function aplicarPadroes() {
    for (const c of M.campos(estado.modelo)) definirValor(c, c.padrao !== undefined ? c.padrao : '');
    for (const c of M.campos(estado.modelo)) {
      if (c.tipo === 'parecer') $('#f-doc_' + c.id).value = '';
      if (c.tipo === 'lotacao') $('#f-' + c.id + '_artigo').value = '';
    }
  }

  function coletar() {
    const d = {};
    for (const c of M.campos(estado.modelo)) {
      const id = 'f-' + c.id;
      switch (c.tipo) {
        case 'opcoes':
          if (c.estilo === 'lista') d[c.id] = $('#' + id).value;
          else {
            const r = form.querySelector(`input[name="${id}"]:checked`);
            d[c.id] = r ? r.value : '';
          }
          break;
        case 'checkbox':
          d[c.id] = $('#' + id).checked;
          break;
        case 'parecer':
          d[c.id] = $('#' + id).checked;
          d['doc_' + c.id] = $('#f-doc_' + c.id).value;
          break;
        case 'lotacao':
          d[c.id] = $('#' + id).value;
          d[c.id + '_artigo'] = $('#' + id + '_artigo').value;
          break;
        default:
          d[c.id] = $('#' + id).value;
      }
    }
    return d;
  }

  function definirValor(c, v) {
    const id = 'f-' + c.id;
    if (c.tipo === 'opcoes' && c.estilo !== 'lista') {
      for (const r of form.querySelectorAll(`input[name="${id}"]`)) r.checked = r.value === v;
    } else if (c.tipo === 'checkbox' || c.tipo === 'parecer') {
      $('#' + id).checked = !!v;
    } else {
      $('#' + id).value = v == null ? '' : v;
    }
  }

  /** Preenche os campos automáticos (datas finais, Oficial de Justiça...) que não foram editados à mão. */
  function aplicarAutomaticos(d) {
    estado.calculados.clear();
    for (const c of M.campos(estado.modelo)) {
      if (!c.auto || estado.manuais.has(c.id)) continue;
      let v;
      try {
        v = c.auto(M.prepararDados(estado.modelo, d), U);
      } catch (e) {
        v = undefined;
      }
      if (v === undefined) continue;
      estado.calculados.add(c.id);
      if (v === d[c.id]) continue;
      definirValor(c, v);
      d[c.id] = v;
    }
  }

  function atualizarIndicadores(d, dd) {
    for (const c of M.campos(estado.modelo)) {
      if (c.tipo === 'parecer') $('#f-doc_' + c.id).disabled = !d[c.id];

      if (c.tipo === 'lotacao') {
        const art = U.detectarArtigo(d[c.id]);
        $('#f-' + c.id + '_artigo').options[0].text = art ? `auto (${U.contracao('em', art)})` : 'auto';
      }

      if (!c.auto) continue;
      const dica = $('#dica-' + c.id);
      const input = $('#f-' + c.id);
      const manual = estado.manuais.has(c.id);
      const calculado = estado.calculados.has(c.id) && !!d[c.id];
      const situacao = manual ? 'manual' : (calculado && M.visivel(c, dd) ? 'auto' : 'dica');
      // Só recria o conteúdo quando a situação muda: recriar o botão entre o mousedown e o
      // click (o "change" do campo anterior dispara nesse intervalo) faria o clique se perder.
      if (dica.dataset.situacao !== situacao) {
        dica.dataset.situacao = situacao;
        dica.textContent = '';
        if (situacao === 'manual') {
          dica.append(el('button', { type: 'button', class: 'reset-auto', dataset: { campo: c.id },
            title: 'Voltar a calcular este campo automaticamente' }, '↺ recalcular'));
        } else if (situacao === 'auto') {
          dica.append(el('span', { class: 'tag-auto' }, 'automático'));
        } else if (c.dica) {
          dica.textContent = c.dica;
        }
      }
      if (input && input.type !== 'checkbox') input.classList.toggle('automatico', !manual && calculado);
    }
  }

  function atualizarVisibilidade(dd) {
    estado.modelo.secoes.forEach((s, i) => {
      $(`[data-secao="${i}"]`, form).hidden = !M.visivel(s, dd);
      for (const c of s.campos) $(`[data-campo="${c.id}"]`, form).hidden = !M.visivel(c, dd);
    });
  }

  // ---------- Prévia ----------

  function renderizarAbas() {
    const abas = $('#abas');
    abas.innerHTML = '';
    for (const doc of estado.modelo.documentos) {
      abas.append(el('button', { type: 'button', class: 'aba', role: 'tab', dataset: { doc: doc.id },
        'aria-selected': String(doc.id === estado.docId) },
      doc.nome, el('span', { class: 'contador', id: 'contador-' + doc.id, hidden: true })));
    }
  }

  function renderizarPrevia(d) {
    const config = valoresConfiguracao();
    for (const doc of estado.modelo.documentos) {
      const r = M.gerar(estado.modelo, doc.id, d, config);
      const contador = $('#contador-' + doc.id);
      contador.textContent = r.pendentes.length;
      contador.hidden = !r.pendentes.length;
      contador.title = `${r.pendentes.length} campo(s) pendente(s)`;
      if (doc.id === estado.docId) estado.resultado = r;
    }

    const r = estado.resultado;
    $('#previa').innerHTML = M.htmlPrevia(r);

    const caixa = $('#pendentes');
    caixa.classList.toggle('ok', !r.pendentes.length);
    caixa.innerHTML = r.pendentes.length
      ? `<strong>${r.pendentes.length} pendente(s):</strong> ${r.pendentes.map(U.escaparHTML).join(', ')}`
      : 'Nenhum campo pendente neste documento.';

    const avisos = M.avisos(estado.modelo, d);
    $('#avisos').innerHTML = avisos.length ? `<ul>${avisos.map((a) => `<li>${U.escaparHTML(a)}</li>`).join('')}</ul>` : '';
  }

  function atualizar() {
    const d = coletar();
    aplicarAutomaticos(d);
    const dd = M.prepararDados(estado.modelo, d);
    atualizarVisibilidade(dd);
    atualizarIndicadores(d, dd);
    renderizarPrevia(d);
  }

  // ---------- Configurações ----------

  function renderizarConfiguracoes() {
    const caixa = $('#configuracoes');
    caixa.innerHTML = '';
    const valores = valoresConfiguracao();
    for (const c of estado.modelo.configuracoes || []) {
      const input = el('input', { type: 'text', id: 'cfg-' + c.id, value: valores[c.id] });
      input.addEventListener('input', () => {
        (preferencias.valores[estado.modelo.id] = preferencias.valores[estado.modelo.id] || {})[c.id] = input.value;
        salvarPreferencias();
        atualizar();
      });
      caixa.append(el('div', { class: 'campo' }, el('div', { class: 'rotulo' }, el('label', { for: input.id }, c.rotulo)), input));
    }
    $('#cfg-inline').checked = !!preferencias.inline;
  }

  // ---------- Cópia ----------

  async function copiarRico(html, texto) {
    try {
      if (navigator.clipboard && window.ClipboardItem) {
        await navigator.clipboard.write([new ClipboardItem({
          'text/html': new Blob([html], { type: 'text/html' }),
          'text/plain': new Blob([texto], { type: 'text/plain' }),
        })]);
        return true;
      }
    } catch (e) { /* tenta o método antigo abaixo */ }
    const div = el('div', { contenteditable: 'true', style: 'position:fixed;left:-9999px;top:0' });
    div.innerHTML = html;
    document.body.append(div);
    const sel = window.getSelection();
    const faixa = document.createRange();
    faixa.selectNodeContents(div);
    sel.removeAllRanges();
    sel.addRange(faixa);
    let ok = false;
    try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
    sel.removeAllRanges();
    div.remove();
    return ok;
  }

  async function copiarTexto(texto) {
    try {
      await navigator.clipboard.writeText(texto);
      return true;
    } catch (e) {
      const ta = el('textarea', { style: 'position:fixed;left:-9999px;top:0' });
      ta.value = texto;
      document.body.append(ta);
      ta.select();
      let ok = false;
      try { ok = document.execCommand('copy'); } catch (e2) { ok = false; }
      ta.remove();
      return ok;
    }
  }

  function confirmarPendentes() {
    const n = estado.resultado.pendentes.length;
    return !n || window.confirm(`Há ${n} campo(s) pendente(s), destacados em amarelo:\n\n${estado.resultado.pendentes.join(', ')}\n\nCopiar mesmo assim?`);
  }

  let temporizadorToast;
  function avisar(msg) {
    const t = $('#toast');
    t.textContent = msg;
    t.classList.add('visivel');
    clearTimeout(temporizadorToast);
    temporizadorToast = setTimeout(() => t.classList.remove('visivel'), 3500);
  }

  // ---------- Eventos ----------

  function aoEditar(e) {
    const alvo = e.target;
    const wrap = alvo.closest('[data-campo]');
    if (wrap) {
      const c = campoPorId(wrap.dataset.campo);
      // Edição direta de um campo automático: a partir daqui ele não é mais recalculado.
      if (c && c.auto && (alvo.id === 'f-' + c.id || alvo.name === 'f-' + c.id)) estado.manuais.add(c.id);
    }
    atualizar();
  }

  function trocarModelo(id) {
    estado.modelo = M.buscar(id);
    estado.docId = estado.modelo.documentos[0].id;
    estado.manuais.clear();
    renderizarFormulario();
    renderizarAbas();
    renderizarConfiguracoes();
    atualizar();
  }

  function iniciar() {
    const seletor = $('#seletor-modelo');
    for (const m of M.modelos) seletor.append(el('option', { value: m.id }, m.nome));
    seletor.addEventListener('change', () => trocarModelo(seletor.value));

    form.addEventListener('input', aoEditar);
    form.addEventListener('change', aoEditar);
    form.addEventListener('submit', (e) => e.preventDefault());
    form.addEventListener('click', (e) => {
      const botao = e.target.closest('.reset-auto');
      if (!botao) return;
      e.preventDefault();
      estado.manuais.delete(botao.dataset.campo);
      atualizar();
    });

    $('#abas').addEventListener('click', (e) => {
      const aba = e.target.closest('.aba');
      if (!aba) return;
      estado.docId = aba.dataset.doc;
      for (const a of document.querySelectorAll('.aba')) a.setAttribute('aria-selected', String(a === aba));
      atualizar();
    });

    $('#btn-copiar').addEventListener('click', async () => {
      if (!confirmarPendentes()) return;
      const r = estado.resultado;
      const ok = await copiarRico(M.htmlSEI(r, CFG.estilosSEI, preferencias.inline), M.textoSimples(r));
      avisar(ok ? 'Copiado! No editor do SEI, cole com Ctrl+V.' : 'Não foi possível copiar. Selecione o texto da prévia e use Ctrl+C.');
    });

    $('#btn-copiar-texto').addEventListener('click', async () => {
      if (!confirmarPendentes()) return;
      const ok = await copiarTexto(M.textoSimples(estado.resultado));
      avisar(ok ? 'Texto simples copiado.' : 'Não foi possível copiar. Selecione o texto da prévia e use Ctrl+C.');
    });

    $('#btn-exemplo').addEventListener('click', () => {
      estado.manuais.clear();
      aplicarPadroes();
      const ex = estado.modelo.exemplo || {};
      for (const c of M.campos(estado.modelo)) {
        if (c.id in ex) definirValor(c, ex[c.id]);
        if (c.tipo === 'parecer' && ('doc_' + c.id) in ex) $('#f-doc_' + c.id).value = ex['doc_' + c.id];
      }
      atualizar();
    });

    $('#btn-limpar').addEventListener('click', () => {
      if (!window.confirm('Limpar todos os campos do formulário?')) return;
      estado.manuais.clear();
      aplicarPadroes();
      atualizar();
    });

    $('#cfg-inline').addEventListener('change', (e) => {
      preferencias.inline = e.target.checked;
      salvarPreferencias();
    });

    $('#btn-restaurar').addEventListener('click', () => {
      delete preferencias.valores[estado.modelo.id];
      preferencias.inline = true;
      salvarPreferencias();
      renderizarConfiguracoes();
      atualizar();
    });

    trocarModelo(M.modelos[0].id);
  }

  iniciar();
})();
