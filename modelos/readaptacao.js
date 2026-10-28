/*
 * Modelo: Readaptação por motivo de saúde (concessão e prorrogação).
 *
 * Como editar os textos: veja a seção "Editando os modelos" do README.
 *   {campo}                      valor digitado no formulário (ou derivado, ver `derivar`)
 *   {do servidor|da servidora}   masculino|feminino, conforme o gênero escolhido
 *   se: d => ...                 o parágrafo só entra quando a condição é verdadeira
 *   tipo: 'citacao' | 'alinea' | 'vocativo' | 'vazio'   (padrão: parágrafo comum)
 */
(function () {
  'use strict';

  const UNIDADES = [['meses', 'meses'], ['anos', 'ano(s)'], ['dias', 'dias']];

  // ---------- Trechos compartilhados entre despacho e decisão ----------

  const INTRODUCAO = 'Trata-se da {pedido} de readaptação, por problemas de saúde, {do servidor|da servidora} {nome}, '
    + 'cadastro {cadastro}, {cargo}, {lotado|lotada} {lotacao_em}.';

  const LAUDO_NUPEMED = 'Após avaliação de seu quadro de saúde, o Nupemed emitiu laudo ({doc_nupemed}) favorável {favoravel_a}, '
    + 'pelo prazo de {prazo}, {modalidade}, no período de {inicio} a {fim}. Os laudos e/ou exames médicos, que subsidiaram '
    + 'essa análise, por se tratarem de dados pessoais sensíveis, encontram-se arquivados no Nupemed, em observância aos '
    + 'preceitos da Lei n. 13.709/2018 (LGPD).';

  // Avaliação do posto de trabalho (Sebio/SST) e conclusão do GTPO, conforme a combinação marcada.
  const PARECERES = [
    { se: (d) => d.temPosto && !d.gtpo,
      texto: '{posto_frase}, mantendo sua lotação atual.' },
    { se: (d) => d.temPosto && d.gtpo && d.concessao && d.manter,
      texto: '{posto_frase}. Ademais, o GTPO concluiu pela permanência {do servidor|da servidora} em sua atual unidade '
        + 'de lotação ({doc_gtpo}).' },
    { se: (d) => d.temPosto && d.gtpo && !(d.concessao && d.manter),
      texto: '{posto_frase}.' },
    { se: (d) => !d.temPosto && d.gtpo && d.concessao && d.manter,
      texto: 'O GTPO concluiu pela permanência {do servidor|da servidora} em sua atual unidade de lotação ({doc_gtpo}).' },
    { se: (d) => d.gtpo && d.concessao && d.relotar,
      texto: 'O GTPO concluiu pela necessidade de concessão da readaptação {do servidor|da servidora}, devido a sua '
        + 'condição de saúde, com relotação {nova_lotacao_em}, a partir de {data_relotacao} ({doc_gtpo}).' },
    { se: (d) => d.gtpo && d.prorrogacao && d.manter,
      texto: 'O GTPO concluiu pela necessidade de prorrogação da readaptação {do servidor|da servidora} ({doc_gtpo}), '
        + '{manutencao_tele}devido a sua condição de saúde, mantendo sua lotação {lotacao_em}.' },
    { se: (d) => d.gtpo && d.prorrogacao && d.relotar,
      texto: 'O GTPO concluiu pela necessidade de prorrogação da readaptação {do servidor|da servidora}, '
        + '{manutencao_tele}devido a sua condição de saúde, com relotação {nova_lotacao_em}, a partir de '
        + '{data_relotacao} ({doc_gtpo}).' },
  ];

  const LC_68 = [
    { texto: 'O instituto legal da readaptação encontra-se previsto nos seguintes dispositivos da LC 68/92, que dispõe '
      + 'sobre o Regime Jurídico dos Servidores Civis do Estado:' },
    { tipo: 'citacao', texto: 'Art. 11. São formas de provimento de cargo público:' },
    { tipo: 'citacao', texto: '[...]' },
    { tipo: 'citacao', texto: 'III - readaptação;' },
    { tipo: 'citacao', texto: '[...]' },
    { tipo: 'citacao', texto: 'Art. 31. Readaptação é a investidura do servidor em cargo de atribuições e '
      + 'responsabilidades compatíveis com a limitação que tenha sofrido em sua capacidade física ou mental verificada '
      + 'em inspeção médica.' },
    { tipo: 'citacao', texto: '§ 1º Se julgado incapaz para o serviço público, o readaptado será aposentado.' },
    { tipo: 'citacao', texto: '§ 2º A readaptação será efetivada em cargo de atribuições afins, respeitada a '
      + 'habilitação exigida.' },
  ];

  const INSTRUCAO_108 = [
    { texto: 'No âmbito deste Poder, a readaptação encontra-se regulamentada pela Instrução Nº 108, de 19/04/2023. '
      + 'Vejamos:' },
    { tipo: 'citacao', texto: 'Art. 1º Os procedimentos e rotinas quanto à readaptação de função dos(as) '
      + 'servidores(as) do Poder Judiciário do Estado de Rondônia, prevista na Lei complementar n. 68, de 9/12/1992, '
      + 'serão disciplinados por esta Instrução.' },
    { tipo: 'citacao', texto: 'CAPÍTULO I' },
    { tipo: 'citacao', texto: 'DA CONCESSÃO DA READAPTAÇÃO' },
    { tipo: 'citacao', texto: 'Art. 2º A readaptação funcional é a investidura do(a) servidor(a) em outras '
      + 'atribuições e responsabilidades compatíveis com a sua condição de saúde, sem que haja mudança de cargo, '
      + 'quando há modificações do seu estado físico ou psíquico que acarretem limitações da sua capacidade funcional, '
      + 'conforme avaliação pericial.' },
    { tipo: 'citacao', texto: '§ 1º A readaptação de função obedecerá às seguintes condições:' },
    { tipo: 'citacao', texto: 'I - as atribuições e responsabilidades deverão ser compatíveis com a limitação que '
      + 'tenha sofrido em sua capacidade física ou mental, verificada em inspeção pelo Núcleo de Perícias Médicas '
      + '(Nupemed) deste Poder;' },
    { tipo: 'citacao', texto: 'II - a readaptação será efetivada em cargo de atribuições afins, respeitada a '
      + 'habilitação exigida, com a mesma carga horária;' },
    { tipo: 'citacao', texto: '§ 2º A readaptação poderá ser solicitada pelo(a) próprio(a) servidor(a) à Divisão de '
      + 'Saúde (Disau) ou ser concedida por iniciativa do Nupemed.' },
    { tipo: 'citacao', texto: '§ 3º Prioritariamente, o período de readaptação indicado pelo Nupemed deverá ocorrer '
      + 'na própria unidade de lotação do(a) servidor(a).' },
    { tipo: 'citacao', texto: '§ 4º A data de início do período de readaptação será indicada pela Seção '
      + 'Biopsicossocial (Sebio), Divisão de Acompanhamento, Desenvolvimento de Carreiras (Diadec) ou pelo Nupemed.' },
    { tipo: 'citacao', texto: 'Art. 3º Cabem às unidades envolvidas no processo de readaptação as seguintes '
      + 'responsabilidades:' },
    { tipo: 'citacao', texto: 'I - à Disau, iniciar o processo e encaminhar para avaliação do Nupemed que, após '
      + 'emissão do parecer, encaminhará para ciência da chefia imediata e/ou Sebio e Diadec;' },
    { tipo: 'citacao', texto: 'II - ao Nupemed, efetuar a avaliação pericial, por meio da qual certificará a redução '
      + 'da capacidade funcional parcial e/ou definitiva do(a) servidor(a) considerando seu desempenho e suas condições '
      + 'de trabalho;' },
    { tipo: 'citacao', texto: 'III - à Sebio, orientar quanto às atividades que não deverão ser executadas, '
      + 'registrando as limitações da capacidade laborativa de saúde física em laudo consubstanciado e realizar o '
      + 'acompanhamento do(a) servidor(a) até findar o prazo da readaptação;' },
    { tipo: 'citacao', texto: 'IV - à Diadec, realizar avaliação psicológica organizacional com vistas a subsidiar a '
      + 'permanência do(a) servidor(a) na unidade de lotação atual ou se haverá necessidade de relotação, bem como '
      + 'orientar servidor(a) e gestor(a) quanto às limitações de saúde mental no desempenho funcional do(a) '
      + 'servidor(a) readaptado(a) e realizar o acompanhamento do(a) servidor(a) até findar o prazo da readaptação;' },
    { tipo: 'citacao', texto: '[...]' },
  ];

  const TELETRABALHO = [
    { texto: '{O servidor|A servidora}, enquanto estiver em teletrabalho, nos termos do {ato_teletrabalho}, deverá:' },
    { tipo: 'alinea', texto: 'a) manter acesso remoto, contínuo e funcional aos sistemas necessários à execução de '
      + 'suas atribuições, com acompanhamento das atividades da unidade de lotação;' },
    { tipo: 'alinea', texto: 'b) pactuar previamente com a chefia imediata a rotina de trabalho, bem como as metas a '
      + 'serem alcançadas, cuja aferição de produtividade caberá à própria chefia;' },
    { tipo: 'alinea', texto: 'c) comparecer presencialmente à unidade de lotação sempre que {convocado|convocada}, '
      + 'sendo as despesas de deslocamento de sua inteira responsabilidade;' },
    { tipo: 'alinea', texto: 'd) preservar o sigilo dos dados acessados de forma remota, mediante observância das '
      + 'normas internas de segurança da informação e da comunicação, bem como manter atualizados os sistemas '
      + 'institucionais instalados nos equipamentos de trabalho;' },
    { tipo: 'alinea', texto: 'e) submeter-se à realização de exame periódico anual, preferencialmente no mês de seu '
      + 'aniversário.' },
  ];

  // ---------- Modelo ----------

  Motor.registrar({
    id: 'readaptacao',
    nome: 'Readaptação por motivo de saúde',

    // Valores fixos que mudam de tempos em tempos; editáveis em "Configurações" na tela.
    configuracoes: [
      { id: 'vocativo', rotulo: 'Vocativo do despacho', padrao: 'Excelentíssima Juíza Secretária Geral,' },
      { id: 'ato_delegacao', rotulo: 'Delegação (decisão)', padrao: 'art. 2º do Ato 57/2026' },
      { id: 'decisao_produtividade', rotulo: 'Decisão da média da produtividade', padrao: 'Decisão 2063 (5546695)' },
      { id: 'ato_teletrabalho', rotulo: 'Norma do teletrabalho', padrao: 'art. 6º do Ato nº 1313/2025' },
    ],

    secoes: [
      {
        titulo: 'Pedido',
        campos: [
          { id: 'pedido', tipo: 'opcoes', rotulo: 'Tipo de pedido', padrao: 'concessao',
            opcoes: [['concessao', 'Concessão'], ['prorrogacao', 'Prorrogação']] },
        ],
      },
      {
        titulo: 'Servidor(a)',
        campos: [
          { id: 'genero', tipo: 'opcoes', rotulo: 'Gênero', opcoes: [['f', 'Servidora'], ['m', 'Servidor']] },
          { id: 'nome', tipo: 'texto', rotulo: 'Nome completo', largura: 4 },
          { id: 'cadastro', tipo: 'texto', rotulo: 'Cadastro', largura: 1, modoTeclado: 'numeric' },
          { id: 'cargo', tipo: 'texto', rotulo: 'Cargo', largura: 3,
            sugestoes: ['Técnico Judiciário', 'Técnica Judiciária', 'Analista Judiciário', 'Analista Judiciária',
              'Oficial de Justiça', 'Agente Judiciário', 'Agente Judiciária', 'Auxiliar Operacional'] },
          { id: 'oficial', tipo: 'checkbox', largura: 4,
            rotulo: 'Oficial de Justiça: incluir parágrafo da média da produtividade (decisão)',
            auto: (d) => /oficial\s+de\s+justi/i.test(d.cargo || '') },
          { id: 'lotacao', tipo: 'lotacao', rotulo: 'Lotação atual', largura: 4 },
        ],
      },
      {
        titulo: 'Readaptação anterior',
        se: (d) => d.prorrogacao,
        campos: [
          { id: 'ant_prazo_n', tipo: 'numero', rotulo: 'Prazo', largura: 1 },
          { id: 'ant_prazo_unidade', tipo: 'opcoes', estilo: 'lista', rotulo: 'Unidade', opcoes: UNIDADES, largura: 1 },
          { id: 'ant_inicio', tipo: 'data', rotulo: 'Início', largura: 1 },
          { id: 'ant_fim', tipo: 'data', rotulo: 'Fim', largura: 1,
            auto: (d, U) => U.somarPrazo(d.ant_inicio, d.ant_prazo_n, d.ant_prazo_unidade) },
          { id: 'portaria', tipo: 'texto', rotulo: 'Portaria Presidência (nº/ano)', placeholder: 'ex.: 1234/2025', largura: 2 },
          { id: 'doc_portaria', tipo: 'sei', rotulo: 'Nº SEI da Portaria', largura: 2 },
        ],
      },
      {
        titulo: 'Laudo do Nupemed',
        campos: [
          { id: 'doc_nupemed', tipo: 'sei', rotulo: 'Nº SEI do laudo', largura: 2 },
          { id: 'modalidade', tipo: 'opcoes', rotulo: 'Condição', largura: 4,
            opcoes: [['atuais', 'Nas atuais condições'], ['teletrabalho', 'Em teletrabalho']] },
          { id: 'prazo_n', tipo: 'numero', rotulo: 'Prazo', largura: 1 },
          { id: 'prazo_unidade', tipo: 'opcoes', estilo: 'lista', rotulo: 'Unidade', opcoes: UNIDADES, largura: 1 },
          { id: 'inicio', tipo: 'data', rotulo: 'Início', largura: 1,
            auto: (d, U) => (d.prorrogacao ? U.somarDias(d.ant_fim, 1) : undefined) },
          { id: 'fim', tipo: 'data', rotulo: 'Fim', largura: 1,
            auto: (d, U) => U.somarPrazo(d.inicio, d.prazo_n, d.prazo_unidade) },
        ],
      },
      {
        titulo: 'Avaliações e lotação',
        campos: [
          { id: 'sebio', tipo: 'parecer', rotulo: 'Sebio', descricao: 'laudo de avaliação do posto de trabalho' },
          { id: 'sst', tipo: 'parecer', rotulo: 'SST', descricao: 'laudo de avaliação do posto de trabalho' },
          { id: 'gtpo', tipo: 'parecer', rotulo: 'GTPO', descricao: 'conclusão/relatório',
            auto: (d) => (d.relotar ? true : undefined) },
          { id: 'destino', tipo: 'opcoes', rotulo: 'Lotação', padrao: 'manter', largura: 4,
            opcoes: [['manter', 'Mantém a lotação atual'], ['relotar', 'Relotação']] },
          { id: 'nova_lotacao', tipo: 'lotacao', rotulo: 'Nova lotação', largura: 3, se: (d) => d.relotar },
          { id: 'data_relotacao', tipo: 'data', rotulo: 'A partir de', largura: 1, se: (d) => d.relotar },
        ],
      },
      {
        titulo: 'Encaminhamento',
        campos: [
          { id: 'doc_sgp', tipo: 'sei', rotulo: 'Nº SEI do despacho da SGP', dica: 'só na decisão', largura: 3 },
        ],
      },
    ],

    // Atalhos usados nas condições `se:` e em `derivar`.
    indicadores: (d) => ({
      concessao: d.pedido !== 'prorrogacao',
      prorrogacao: d.pedido === 'prorrogacao',
      teletrabalho: d.modalidade === 'teletrabalho',
      relotar: d.destino === 'relotar',
      manter: d.destino !== 'relotar',
      temPosto: !!(d.sebio || d.sst),
    }),

    // Trechos calculados. null = informação faltando (aparece como pendente); '' = trecho omitido.
    derivar(d, U) {
      const posto = [];
      if (d.sebio) posto.push('a Sebio ({doc_sebio})');
      if (d.sst) posto.push('a SST ({doc_sst})');
      return {
        pedido: d.prorrogacao ? 'prorrogação' : 'concessão',
        favoravel_a: d.prorrogacao ? 'à prorrogação de sua readaptação' : 'à sua readaptação',
        prazo: U.prazoPorExtenso(d.prazo_n, d.prazo_unidade) || null,
        prazo_anterior: U.prazoPorExtenso(d.ant_prazo_n, d.ant_prazo_unidade) || null,
        modalidade: d.teletrabalho ? 'em teletrabalho' : d.modalidade === 'atuais' ? 'nas atuais condições' : null,
        em_teletrabalho: d.teletrabalho ? 'em teletrabalho, ' : '',
        manutencao_tele: d.teletrabalho ? 'com a manutenção do teletrabalho, ' : '',
        mantendo_lotacao: d.manter ? ', mantendo sua lotação atual' : '',
        posto_frase: posto.length
          ? U.capitalizar(U.juntarLista(posto)) + (posto.length > 1 ? ' apresentaram' : ' apresentou')
            + ' laudo de avaliação do posto de trabalho'
          : '',
        portaria_ref: d.portaria ? U.semPrefixoNumero(d.portaria) : null,
        analise_docs: d.gtpo
          ? 'o devido parecer do Nupemed ({doc_nupemed}) e a recomendação do GTPO ({doc_gtpo}), os quais são favoráveis'
          : 'o devido parecer do Nupemed ({doc_nupemed}), o qual é favorável',
      };
    },

    rotulos: {
      prazo: 'Prazo do laudo',
      prazo_anterior: 'Prazo anterior',
      modalidade: 'Condição',
      portaria_ref: 'Nº da Portaria',
    },

    avisos(d, U) {
      const a = [];
      if (d.relotar && !d.gtpo) a.push('Relotação sem GTPO marcado: os parágrafos de relotação dependem do relatório do GTPO.');
      if (d.inicio && d.fim && d.fim <= d.inicio) a.push('A data final do período é anterior ou igual à inicial.');
      if (d.prorrogacao && d.ant_fim && d.inicio && U.somarDias(d.ant_fim, 1) !== d.inicio) {
        a.push('O novo período não começa no dia seguinte ao fim da readaptação anterior.');
      }
      if (d.relotar && d.data_relotacao && d.inicio && d.fim && (d.data_relotacao < d.inicio || d.data_relotacao > d.fim)) {
        a.push('A data da relotação está fora do período da readaptação.');
      }
      return a;
    },

    // Dados fictícios para o botão "Preencher exemplo".
    exemplo: {
      pedido: 'concessao', genero: 'f', nome: 'Fulana de Tal', cadastro: '000000', cargo: 'Técnica Judiciária',
      lotacao: 'Seção de Admissão e Movimentação de Pessoal/SGP', doc_nupemed: '0000001', modalidade: 'teletrabalho',
      prazo_n: '6', prazo_unidade: 'meses', inicio: '2026-10-07', fim: '2027-04-07', gtpo: true, doc_gtpo: '0000002',
      destino: 'relotar', nova_lotacao: 'Seção de Registro e Controle de Benefícios', data_relotacao: '2026-10-19',
      doc_sgp: '0000003',
    },

    documentos: [
      {
        id: 'despacho',
        nome: 'Despacho',
        blocos: [
          { tipo: 'vocativo', texto: '{vocativo}' },
          { tipo: 'vazio' },
          { texto: INTRODUCAO },
          { se: (d) => d.prorrogacao,
            texto: '{O servidor|A servidora} estava {readaptado|readaptada} por {prazo_anterior}, no período de '
              + '{ant_inicio} a {ant_fim}, conforme Portaria Presidência {portaria_ref} ({doc_portaria}).' },
          { texto: LAUDO_NUPEMED },
          { blocos: PARECERES },
          { texto: 'Diante do exposto, instruídos os autos, encaminhamos para deliberação de Vossa Excelência.' },
          { tipo: 'vazio' },
          { texto: 'Respeitosamente,' },
        ],
      },
      {
        id: 'decisao',
        nome: 'Decisão',
        blocos: [
          { texto: INTRODUCAO },
          { se: (d) => d.prorrogacao,
            texto: '{O servidor|A servidora} esteve {readaptado|readaptada} pelo prazo de {prazo_anterior}, no período de '
              + '{ant_inicio} a {ant_fim}, conforme Portaria Presidência {portaria_ref} ({doc_portaria}).' },
          { texto: LAUDO_NUPEMED },
          { blocos: PARECERES },
          { texto: 'A Secretaria de Gestão de Pessoas encaminhou os autos para deliberação ({doc_sgp}).' },
          { tipo: 'vazio' },
          { texto: 'Examinados, decido.' },
          { blocos: LC_68 },
          { blocos: INSTRUCAO_108 },
          { texto: 'Da análise dos autos, verifica-se que os requisitos estabelecidos foram atendidos, uma vez que consta '
            + '{analise_docs} à {pedido} da readaptação {do servidor|da servidora}. Ademais, periodicamente são '
            + 'realizadas avaliações com intuito de averiguar se a readaptação está condizente com as limitações '
            + '{do servidor|da servidora}, bem como o desempenho do labor na unidade.' },
          { texto: 'Ante o exposto, no uso das atribuições concedidas pelo {ato_delegacao}, com fulcro no art. 31 da Lei '
            + 'Complementar n. 68/92, bem como no art. 2º da Instrução Nº 108, de 19/04/2023, defiro a {pedido} da '
            + 'readaptação {do servidor|da servidora} {nome}, cadastro {cadastro}, {cargo}, {em_teletrabalho}pelo prazo de '
            + '{prazo}, no período de {inicio} a {fim}{mantendo_lotacao}.' },
          { se: (d) => d.relotar,
            texto: 'Ainda, determino que {o servidor|a servidora} seja {relotado|relotada} {lotacao_de} {nova_lotacao_para}, '
              + 'a partir de {data_relotacao}, nos termos do relatório do GTPO ({doc_gtpo}).' },
          { se: (d) => d.oficial,
            texto: 'Quanto ao pagamento da média da produtividade, nos termos da {decisao_produtividade}, '
              + '{o servidor|a servidora} faz jus ao pagamento da média da produtividade, durante o período de readaptação.' },
          { se: (d) => d.teletrabalho, blocos: TELETRABALHO },
          { texto: 'Findo o prazo, caso haja a necessidade de prorrogação, {o servidor|a servidora} deverá apresentar novo '
            + 'laudo e ser {submetido|submetida} a avaliação médica.' },
          { texto: 'À SGP para providenciar o necessário.' },
        ],
      },
    ],
  });
})();
