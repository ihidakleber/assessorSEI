"""
Gera planilha/AssessorSEI-Readaptacao.xlsx: versão em Excel (sem macros) do gerador
de despacho e decisão de readaptação.

Rodar:  python3 planilha/gerar_planilha.py

Estrutura da planilha:
  Dados     formulário (células amarelas são de preenchimento)
  Despacho  texto pronto, um parágrafo por linha, com linha em branco entre eles
  Decisão   idem
  Calc      (oculta) cálculos e textos dos parágrafos
  Listas    (oculta) números por extenso e palavras masculinas das lotações

As fórmulas usam só funções disponíveis desde o Excel 2010 (SE, SEERRO, DATAM, ÍNDICE,
CORRESP, CONT.SE), e datas são formatadas sem TEXTO() para não depender do idioma.
"""
import re
from pathlib import Path

from openpyxl import Workbook
from openpyxl.formatting.rule import FormulaRule
from openpyxl.styles import Alignment, Font, PatternFill, Border, Side
from openpyxl.workbook.defined_name import DefinedName
from openpyxl.worksheet.datavalidation import DataValidation

SAIDA = Path(__file__).with_name('AssessorSEI-Readaptacao.xlsx')

AMARELO = PatternFill('solid', fgColor='FFF7CC')
CINZA = PatternFill('solid', fgColor='EEF1F5')
AZUL = PatternFill('solid', fgColor='1F5F8B')
BORDA = Border(*(Side(style='thin', color='C9CED6'),) * 4)

wb = Workbook()
dados = wb.active
dados.title = 'Dados'
desp = wb.create_sheet('Despacho')
dec = wb.create_sheet('Decisão')
calc = wb.create_sheet('Calc')
listas = wb.create_sheet('Listas')
calc.sheet_state = 'hidden'
listas.sheet_state = 'hidden'


def nomear(nome, ref):
    wb.defined_names[nome] = DefinedName(nome, attr_text=ref)


# ---------------------------------------------------------------- Listas

EXT = ['zero', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove', 'dez', 'onze', 'doze',
       'treze', 'quatorze', 'quinze', 'dezesseis', 'dezessete', 'dezoito', 'dezenove']
DEZ = ['', '', 'vinte', 'trinta', 'quarenta', 'cinquenta', 'sessenta', 'setenta', 'oitenta', 'noventa']
CEN = ['', 'cento', 'duzentos', 'trezentos']


def extenso(n):
    if n < 20:
        return EXT[n]
    if n < 100:
        return DEZ[n // 10] + (' e ' + EXT[n % 10] if n % 10 else '')
    if n == 100:
        return 'cem'
    return CEN[n // 100] + (' e ' + extenso(n % 100) if n % 100 else '')


listas['A1'], listas['B1'] = 'Número', 'Extenso'
for i in range(1, 366):
    listas.cell(i + 1, 1, i)
    listas.cell(i + 1, 2, extenso(i))
nomear('tab_extenso', 'Listas!$A$2:$B$366')

MASC = ['núcleo', 'nucleo', 'departamento', 'gabinete', 'juizado', 'cartório', 'cartorio', 'setor', 'centro',
        'serviço', 'servico', 'fórum', 'forum', 'grupo', 'conselho', 'tribunal', 'cejusc', 'nupemed', 'posto',
        'almoxarifado', 'arquivo', 'protocolo', 'plenário', 'comitê', 'escritório', 'ofício', 'gtpo', 'depósito',
        'laboratório', 'programa']
listas['D1'] = 'Lotações com artigo masculino (1ª palavra)'
for i, p in enumerate(MASC):
    listas.cell(i + 2, 4, p)
nomear('lista_masc', f'Listas!$D$2:$D${len(MASC) + 1}')

# ---------------------------------------------------------------- Dados (formulário)

dados.column_dimensions['A'].width = 34
dados.column_dimensions['B'].width = 52
dados.column_dimensions['C'].width = 46
dados['A1'] = 'Assessor SEI · Readaptação'
dados['A1'].font = Font(size=16, bold=True, color='1F5F8B')
dados['A2'] = ('Preencha as células amarelas. O texto aparece nas abas Despacho e Decisão. '
               'Ao terminar, feche SEM SALVAR para não guardar dados pessoais no arquivo.')
dados['A2'].alignment = Alignment(wrap_text=True)
dados.merge_cells('A2:C2')
dados.row_dimensions[2].height = 32

LISTAS_VALIDACAO = {}


def validacao(opcoes):
    chave = ','.join(opcoes)
    if chave not in LISTAS_VALIDACAO:
        dv = DataValidation(type='list', formula1=f'"{chave}"', allow_blank=True)
        dados.add_data_validation(dv)
        LISTAS_VALIDACAO[chave] = dv
    return LISTAS_VALIDACAO[chave]


linha = 4
ROTULOS = {}  # nome -> rótulo usado como pendência


def secao(titulo):
    global linha
    linha += 1
    c = dados.cell(linha, 1, titulo)
    c.font = Font(bold=True, color='FFFFFF')
    for col in range(1, 4):
        dados.cell(linha, col).fill = AZUL
    linha += 1


def campo(nome, rotulo, opcoes=None, padrao=None, ajuda='', tipo=None, pendente=None):
    global linha
    dados.cell(linha, 1, rotulo)
    cel = dados.cell(linha, 2)
    cel.fill = AMARELO
    cel.border = BORDA
    if padrao is not None:
        cel.value = padrao
    if opcoes:
        validacao(opcoes).add(cel)
    if tipo == 'data':
        cel.number_format = 'DD/MM/YYYY'
    ajuda_cel = dados.cell(linha, 3, ajuda)
    ajuda_cel.font = Font(italic=True, color='5B6573')
    ajuda_cel.alignment = Alignment(wrap_text=True)
    nomear('d_' + nome, f'Dados!$B${linha}')
    ROTULOS[nome] = pendente or rotulo
    linha += 1
    return linha - 1


secao('Pedido e servidor(a)')
campo('pedido', 'Tipo de pedido', ['Concessão', 'Prorrogação'], 'Concessão')
campo('genero', 'Gênero', ['Servidora', 'Servidor'])
campo('nome', 'Nome completo')
campo('cadastro', 'Cadastro')
campo('cargo', 'Cargo')
campo('oficial', 'Parágrafo Oficial de Justiça (média da produtividade)', ['Automático', 'Sim', 'Não'],
      'Automático', 'Automático: entra se o cargo for Oficial de Justiça')
campo('lotacao', 'Lotação atual', pendente='Lotação atual')
campo('lotacao_art', 'Artigo da lotação', ['Automático', 'na', 'no'], 'Automático')
L_ART_ATUAL = linha - 1

secao('Readaptação anterior (só prorrogação)')
campo('ant_n', 'Prazo anterior (número)', pendente='Prazo anterior')
campo('ant_un', 'Unidade', ['meses', 'anos', 'dias'], pendente='Prazo anterior')
campo('ant_ini', 'Início', tipo='data', ajuda='dd/mm/aaaa', pendente='Início anterior')
L_ANT_FIM = campo('ant_fim', 'Fim', tipo='data', ajuda='', pendente='Fim anterior')
campo('portaria', 'Portaria Presidência (nº/ano)', ajuda='ex.: 1234/2025', pendente='Nº da Portaria')
campo('doc_portaria', 'Nº SEI da Portaria')

secao('Laudo do Nupemed')
campo('doc_nupemed', 'Nº SEI do laudo')
campo('modalidade', 'Condição', ['Nas atuais condições', 'Em teletrabalho'], pendente='Condição')
campo('prazo_n', 'Prazo (número)', pendente='Prazo do laudo')
campo('prazo_un', 'Unidade', ['meses', 'anos', 'dias'], pendente='Unidade do prazo')
L_INICIO = campo('inicio', 'Início', tipo='data', pendente='Início')
L_FIM = campo('fim', 'Fim', tipo='data', pendente='Fim')

secao('Avaliações e lotação')
campo('sebio', 'Sebio: laudo do posto de trabalho', ['Sim', 'Não'], 'Não')
campo('doc_sebio', 'Nº SEI (Sebio)')
campo('sst', 'SST: laudo do posto de trabalho', ['Sim', 'Não'], 'Não')
campo('doc_sst', 'Nº SEI (SST)')
campo('gtpo', 'GTPO: conclusão/relatório', ['Automático', 'Sim', 'Não'], 'Automático',
      'Automático: Sim quando houver relotação')
campo('doc_gtpo', 'Nº SEI (GTPO)')
campo('destino', 'Lotação', ['Mantém a lotação atual', 'Relotação'], 'Mantém a lotação atual')
campo('nova_lotacao', 'Nova lotação (se relotação)', pendente='Nova lotação')
campo('nova_art', 'Artigo da nova lotação', ['Automático', 'na', 'no'], 'Automático')
L_ART_NOVA = linha - 1
campo('data_relot', 'Relotação a partir de', tipo='data', pendente='Data da relotação')

secao('Encaminhamento (só decisão)')
campo('doc_sgp', 'Nº SEI do despacho da SGP')

secao('Configurações (valores fixos, mude quando necessário)')
campo('vocativo', 'Vocativo do despacho', padrao='Excelentíssima Juíza Secretária Geral,')
campo('ato_delegacao', 'Delegação (decisão)', padrao='art. 2º do Ato 57/2026')
campo('decisao_prod', 'Decisão da média da produtividade', padrao='Decisão 2063 (5546695)')
campo('ato_tele', 'Norma do teletrabalho', padrao='art. 6º do Ato nº 1313/2025')
for r in range(linha - 4, linha):
    dados.cell(r, 2).fill = CINZA

linha += 1
L_STATUS = linha
dados.cell(linha, 1, 'Pendências').font = Font(bold=True)
L_AVISOS = linha + 1
dados.cell(L_AVISOS, 1, 'Avisos').font = Font(bold=True)
for r in (L_STATUS, L_AVISOS):
    dados.cell(r, 2).alignment = Alignment(wrap_text=True, vertical='top')
    dados.merge_cells(start_row=r, start_column=2, end_row=r, end_column=3)
dados.row_dimensions[L_STATUS].height = 48
dados.row_dimensions[L_AVISOS].height = 48
dados.freeze_panes = 'A4'

# ---------------------------------------------------------------- Calc: valores derivados

calc.column_dimensions['A'].width = 22
calc.column_dimensions['B'].width = 90
crow = 1


def derivado(nome, formula):
    global crow
    calc.cell(crow, 1, nome)
    calc.cell(crow, 2, '=' + formula)
    nomear('c_' + nome, f'Calc!$B${crow}')
    crow += 1


def q(s):
    return '"' + s.replace('"', '""') + '"'


def fmt_data(x):
    return f'RIGHT("0"&DAY({x}),2)&"/"&RIGHT("0"&MONTH({x}),2)&"/"&YEAR({x})'


def somar_prazo(ini, n, un):
    return (f'IF(OR({ini}="",{n}="",{un}=""),"",IF({un}="dias",{ini}+{n},'
            f'EDATE({ini},{n}*IF({un}="anos",12,1))))')


def campo_ou_pendente(nome):
    return f'IF(d_{nome}="",{q("[" + ROTULOS[nome] + "]")},d_{nome})'


def prazo_txt(n, un, rotulo):
    return (f'IF(OR(d_{n}="",d_{un}=""),{q("[" + rotulo + "]")},'
            f'd_{n}&" ("&IFERROR(VLOOKUP(d_{n},tab_extenso,2,FALSE),d_{n})&") "&'
            f'IF(d_{n}=1,IF(d_{un}="meses","mês",IF(d_{un}="anos","ano","dia")),d_{un}))')


def artigo(lot, escolha):
    pw = f'LOWER(LEFT(TRIM({lot}),FIND(" ",TRIM({lot})&" ")-1))'
    return (f'IF({escolha}="no","o",IF({escolha}="na","a",'
            f'IF(ISNUMBER(FIND("ª",{pw})),"a",IF(OR(ISNUMBER(FIND("º",{pw})),ISNUMBER(FIND("°",{pw}))),"o",'
            f'IF(ISNUMBER(MATCH({pw},lista_masc,0)),"o","a")))))')


derivado('prorrog', 'd_pedido="Prorrogação"')
derivado('conc', 'NOT(c_prorrog)')
derivado('tele', 'd_modalidade="Em teletrabalho"')
derivado('relotar', 'd_destino="Relotação"')
derivado('manter', 'NOT(c_relotar)')
derivado('oficial', 'IF(d_oficial="Sim",TRUE,IF(d_oficial="Não",FALSE,ISNUMBER(SEARCH("oficial de justi",d_cargo))))')
derivado('gtpo', 'IF(d_gtpo="Sim",TRUE,IF(d_gtpo="Não",FALSE,c_relotar))')
derivado('sebio', 'd_sebio="Sim"')
derivado('sst', 'd_sst="Sim"')
derivado('posto', 'OR(c_sebio,c_sst)')

derivado('ant_fim_d', f'IF(d_ant_fim<>"",d_ant_fim,{somar_prazo("d_ant_ini", "d_ant_n", "d_ant_un")})')
derivado('inicio_d', 'IF(d_inicio<>"",d_inicio,IF(AND(c_prorrog,c_ant_fim_d<>""),c_ant_fim_d+1,""))')
derivado('fim_d', f'IF(d_fim<>"",d_fim,{somar_prazo("c_inicio_d", "d_prazo_n", "d_prazo_un")})')

derivado('ant_ini', f'IF(d_ant_ini="","[Início anterior]",{fmt_data("d_ant_ini")})')
derivado('ant_fim', f'IF(c_ant_fim_d="","[Fim anterior]",{fmt_data("c_ant_fim_d")})')
derivado('inicio', f'IF(c_inicio_d="","[Início]",{fmt_data("c_inicio_d")})')
derivado('fim', f'IF(c_fim_d="","[Fim]",{fmt_data("c_fim_d")})')
derivado('data_relot', f'IF(d_data_relot="","[Data da relotação]",{fmt_data("d_data_relot")})')

derivado('prazo', prazo_txt('prazo_n', 'prazo_un', 'Prazo do laudo'))
derivado('prazo_ant', prazo_txt('ant_n', 'ant_un', 'Prazo anterior'))
derivado('pedido', 'IF(c_prorrog,"prorrogação","concessão")')
derivado('favoravel_a', 'IF(c_prorrog,"à prorrogação de sua readaptação","à sua readaptação")')
derivado('modalidade', 'IF(c_tele,"em teletrabalho",IF(d_modalidade="","[Condição]","nas atuais condições"))')

for nome in ['nome', 'cadastro', 'cargo', 'portaria', 'doc_portaria', 'doc_nupemed', 'doc_sebio', 'doc_sst',
             'doc_gtpo', 'doc_sgp', 'vocativo', 'ato_delegacao', 'decisao_prod', 'ato_tele']:
    derivado(nome, campo_ou_pendente(nome))

derivado('lot', campo_ou_pendente('lotacao'))
derivado('lot_art', artigo('d_lotacao', 'd_lotacao_art'))
derivado('lotacao_em', 'IF(c_lot_art="o","no ","na ")&c_lot')
derivado('lotacao_de', 'IF(c_lot_art="o","do ","da ")&c_lot')
derivado('nova', campo_ou_pendente('nova_lotacao'))
derivado('nova_art', artigo('d_nova_lotacao', 'd_nova_art'))
derivado('nova_em', 'IF(c_nova_art="o","no ","na ")&c_nova')
derivado('nova_para', 'IF(c_nova_art="o","para o ","para a ")&c_nova')

derivado('posto_frase', 'IF(AND(c_sebio,c_sst),"A Sebio ("&c_doc_sebio&") e a SST ("&c_doc_sst&") apresentaram",'
                        'IF(c_sebio,"A Sebio ("&c_doc_sebio&") apresentou","A SST ("&c_doc_sst&") apresentou"))'
                        '&" laudo de avaliação do posto de trabalho"')
derivado('analise_docs', 'IF(c_gtpo,"o devido parecer do Nupemed ("&c_doc_nupemed&") e a recomendação do GTPO ("'
                         '&c_doc_gtpo&"), os quais são favoráveis","o devido parecer do Nupemed ("&c_doc_nupemed'
                         '&"), o qual é favorável")')
derivado('em_tele', 'IF(c_tele,"em teletrabalho, ","")')
derivado('manut_tele', 'IF(c_tele,"com a manutenção do teletrabalho, ","")')
derivado('mantendo', 'IF(c_manter,", mantendo sua lotação atual","")')

# Valores calculados mostrados ao lado dos campos de data, no formulário.
for lin, nome, txt in [(L_ANT_FIM, 'ant_fim_d', 'vazio = calcula'), (L_INICIO, 'inicio_d', 'vazio = calcula na prorrogação'),
                       (L_FIM, 'fim_d', 'vazio = calcula')]:
    dados.cell(lin, 3, f'=IF(c_{nome}="","{txt}","calculado: "&{fmt_data("c_" + nome)})')
for lin, nome in [(L_ART_ATUAL, 'lot_art'), (L_ART_NOVA, 'nova_art')]:
    dados.cell(lin, 3, f'="usando: "&IF(c_{nome}="o","no / do","na / da")')
    dados.cell(lin, 3).font = Font(italic=True, color='5B6573')
for lin in (L_ANT_FIM, L_INICIO, L_FIM):
    dados.cell(lin, 3).font = Font(italic=True, color='1F5F8B')

# ---------------------------------------------------------------- Textos

GENERO = 'IF(d_genero="Servidor",{m},IF(d_genero="Servidora",{f},{p}))'


def formula_texto(modelo):
    """Converte '{nome}' e '{masc|fem}' em fórmula. Trechos fixos ficam em pedaços < 255 caracteres."""
    partes = []
    for i, pedaco in enumerate(re.split(r'\{([^{}]+)\}', modelo)):
        if i % 2 == 0:
            for j in range(0, len(pedaco), 200):
                partes.append(q(pedaco[j:j + 200]))
        elif '|' in pedaco:
            m, f = pedaco.split('|')
            partes.append('(' + GENERO.format(m=q(m), f=q(f), p=q(f'[{m}/{f}]')) + ')')
        else:
            partes.append('c_' + pedaco)
    return '&'.join(p for p in partes if p != '""')


INTRO = ('Trata-se da {pedido} de readaptação, por problemas de saúde, {do servidor|da servidora} {nome}, '
         'cadastro {cadastro}, {cargo}, {lotado|lotada} {lotacao_em}.')
LAUDO = ('Após avaliação de seu quadro de saúde, o Nupemed emitiu laudo ({doc_nupemed}) favorável {favoravel_a}, '
         'pelo prazo de {prazo}, {modalidade}, no período de {inicio} a {fim}. Os laudos e/ou exames médicos, que '
         'subsidiaram essa análise, por se tratarem de dados pessoais sensíveis, encontram-se arquivados no Nupemed, '
         'em observância aos preceitos da Lei n. 13.709/2018 (LGPD).')
PARECERES = [
    ('AND(c_posto,NOT(c_gtpo))', '{posto_frase}, mantendo sua lotação atual.'),
    ('AND(c_posto,c_gtpo,c_conc,c_manter)', '{posto_frase}. Ademais, o GTPO concluiu pela permanência '
     '{do servidor|da servidora} em sua atual unidade de lotação ({doc_gtpo}).'),
    ('AND(c_posto,c_gtpo,NOT(AND(c_conc,c_manter)))', '{posto_frase}.'),
    ('AND(NOT(c_posto),c_gtpo,c_conc,c_manter)', 'O GTPO concluiu pela permanência {do servidor|da servidora} em '
     'sua atual unidade de lotação ({doc_gtpo}).'),
    ('AND(c_gtpo,c_conc,c_relotar)', 'O GTPO concluiu pela necessidade de concessão da readaptação '
     '{do servidor|da servidora}, devido a sua condição de saúde, com relotação {nova_em}, a partir de '
     '{data_relot} ({doc_gtpo}).'),
    ('AND(c_gtpo,c_prorrog,c_manter)', 'O GTPO concluiu pela necessidade de prorrogação da readaptação '
     '{do servidor|da servidora} ({doc_gtpo}), {manut_tele}devido a sua condição de saúde, mantendo sua lotação '
     '{lotacao_em}.'),
    ('AND(c_gtpo,c_prorrog,c_relotar)', 'O GTPO concluiu pela necessidade de prorrogação da readaptação '
     '{do servidor|da servidora}, {manut_tele}devido a sua condição de saúde, com relotação {nova_em}, a partir de '
     '{data_relot} ({doc_gtpo}).'),
]
ANTERIOR_DESP = ('{O servidor|A servidora} estava {readaptado|readaptada} por {prazo_ant}, no período de {ant_ini} '
                 'a {ant_fim}, conforme Portaria Presidência {portaria} ({doc_portaria}).')
ANTERIOR_DEC = ('{O servidor|A servidora} esteve {readaptado|readaptada} pelo prazo de {prazo_ant}, no período de '
                '{ant_ini} a {ant_fim}, conforme Portaria Presidência {portaria} ({doc_portaria}).')

CITACOES = [
    'O instituto legal da readaptação encontra-se previsto nos seguintes dispositivos da LC 68/92, que dispõe sobre '
    'o Regime Jurídico dos Servidores Civis do Estado:',
    'Art. 11. São formas de provimento de cargo público:', '[...]', 'III - readaptação;', '[...]',
    'Art. 31. Readaptação é a investidura do servidor em cargo de atribuições e responsabilidades compatíveis com a '
    'limitação que tenha sofrido em sua capacidade física ou mental verificada em inspeção médica.',
    '§ 1º Se julgado incapaz para o serviço público, o readaptado será aposentado.',
    '§ 2º A readaptação será efetivada em cargo de atribuições afins, respeitada a habilitação exigida.',
    'No âmbito deste Poder, a readaptação encontra-se regulamentada pela Instrução Nº 108, de 19/04/2023. Vejamos:',
    'Art. 1º Os procedimentos e rotinas quanto à readaptação de função dos(as) servidores(as) do Poder Judiciário do '
    'Estado de Rondônia, prevista na Lei complementar n. 68, de 9/12/1992, serão disciplinados por esta Instrução.',
    'CAPÍTULO I', 'DA CONCESSÃO DA READAPTAÇÃO',
    'Art. 2º A readaptação funcional é a investidura do(a) servidor(a) em outras atribuições e responsabilidades '
    'compatíveis com a sua condição de saúde, sem que haja mudança de cargo, quando há modificações do seu estado '
    'físico ou psíquico que acarretem limitações da sua capacidade funcional, conforme avaliação pericial.',
    '§ 1º A readaptação de função obedecerá às seguintes condições:',
    'I - as atribuições e responsabilidades deverão ser compatíveis com a limitação que tenha sofrido em sua '
    'capacidade física ou mental, verificada em inspeção pelo Núcleo de Perícias Médicas (Nupemed) deste Poder;',
    'II - a readaptação será efetivada em cargo de atribuições afins, respeitada a habilitação exigida, com a mesma '
    'carga horária;',
    '§ 2º A readaptação poderá ser solicitada pelo(a) próprio(a) servidor(a) à Divisão de Saúde (Disau) ou ser '
    'concedida por iniciativa do Nupemed.',
    '§ 3º Prioritariamente, o período de readaptação indicado pelo Nupemed deverá ocorrer na própria unidade de '
    'lotação do(a) servidor(a).',
    '§ 4º A data de início do período de readaptação será indicada pela Seção Biopsicossocial (Sebio), Divisão de '
    'Acompanhamento, Desenvolvimento de Carreiras (Diadec) ou pelo Nupemed.',
    'Art. 3º Cabem às unidades envolvidas no processo de readaptação as seguintes responsabilidades:',
    'I - à Disau, iniciar o processo e encaminhar para avaliação do Nupemed que, após emissão do parecer, '
    'encaminhará para ciência da chefia imediata e/ou Sebio e Diadec;',
    'II - ao Nupemed, efetuar a avaliação pericial, por meio da qual certificará a redução da capacidade funcional '
    'parcial e/ou definitiva do(a) servidor(a) considerando seu desempenho e suas condições de trabalho;',
    'III - à Sebio, orientar quanto às atividades que não deverão ser executadas, registrando as limitações da '
    'capacidade laborativa de saúde física em laudo consubstanciado e realizar o acompanhamento do(a) servidor(a) '
    'até findar o prazo da readaptação;',
    'IV - à Diadec, realizar avaliação psicológica organizacional com vistas a subsidiar a permanência do(a) '
    'servidor(a) na unidade de lotação atual ou se haverá necessidade de relotação, bem como orientar servidor(a) e '
    'gestor(a) quanto às limitações de saúde mental no desempenho funcional do(a) servidor(a) readaptado(a) e '
    'realizar o acompanhamento do(a) servidor(a) até findar o prazo da readaptação;',
    '[...]',
]
TELE = [
    '{O servidor|A servidora}, enquanto estiver em teletrabalho, nos termos do {ato_tele}, deverá:',
    'a) manter acesso remoto, contínuo e funcional aos sistemas necessários à execução de suas atribuições, com '
    'acompanhamento das atividades da unidade de lotação;',
    'b) pactuar previamente com a chefia imediata a rotina de trabalho, bem como as metas a serem alcançadas, cuja '
    'aferição de produtividade caberá à própria chefia;',
    'c) comparecer presencialmente à unidade de lotação sempre que {convocado|convocada}, sendo as despesas de '
    'deslocamento de sua inteira responsabilidade;',
    'd) preservar o sigilo dos dados acessados de forma remota, mediante observância das normas internas de '
    'segurança da informação e da comunicação, bem como manter atualizados os sistemas institucionais instalados '
    'nos equipamentos de trabalho;',
    'e) submeter-se à realização de exame periódico anual, preferencialmente no mês de seu aniversário.',
]

DESPACHO = ([(None, '{vocativo}'), (None, INTRO), ('c_prorrog', ANTERIOR_DESP), (None, LAUDO)] + PARECERES +
            [(None, 'Diante do exposto, instruídos os autos, encaminhamos para deliberação de Vossa Excelência.'),
             (None, 'Respeitosamente,')])

DECISAO = ([(None, INTRO), ('c_prorrog', ANTERIOR_DEC), (None, LAUDO)] + PARECERES +
           [(None, 'A Secretaria de Gestão de Pessoas encaminhou os autos para deliberação ({doc_sgp}).'),
            (None, 'Examinados, decido.')] +
           [(None, t) for t in CITACOES] +
           [(None, 'Da análise dos autos, verifica-se que os requisitos estabelecidos foram atendidos, uma vez que '
                   'consta {analise_docs} à {pedido} da readaptação {do servidor|da servidora}. Ademais, '
                   'periodicamente são realizadas avaliações com intuito de averiguar se a readaptação está '
                   'condizente com as limitações {do servidor|da servidora}, bem como o desempenho do labor na '
                   'unidade.'),
            (None, 'Ante o exposto, no uso das atribuições concedidas pelo {ato_delegacao}, com fulcro no art. 31 da '
                   'Lei Complementar n. 68/92, bem como no art. 2º da Instrução Nº 108, de 19/04/2023, defiro a '
                   '{pedido} da readaptação {do servidor|da servidora} {nome}, cadastro {cadastro}, {cargo}, '
                   '{em_tele}pelo prazo de {prazo}, no período de {inicio} a {fim}{mantendo}.'),
            ('c_relotar', 'Ainda, determino que {o servidor|a servidora} seja {relotado|relotada} {lotacao_de} '
                          '{nova_para}, a partir de {data_relot}, nos termos do relatório do GTPO ({doc_gtpo}).'),
            ('c_oficial', 'Quanto ao pagamento da média da produtividade, nos termos da {decisao_prod}, '
                          '{o servidor|a servidora} faz jus ao pagamento da média da produtividade, durante o '
                          'período de readaptação.')] +
           [('c_tele', t) for t in TELE] +
           [(None, 'Findo o prazo, caso haja a necessidade de prorrogação, {o servidor|a servidora} deverá '
                   'apresentar novo laudo e ser {submetido|submetida} a avaliação médica.'),
            (None, 'À SGP para providenciar o necessário.')])


def montar(blocos, aba, titulo):
    """Parágrafos na Calc (coluna D: texto, E: posição) e saída compacta na aba, com linha em branco entre eles."""
    global crow
    crow += 1
    calc.cell(crow, 1, titulo).font = Font(bold=True)
    crow += 1
    ini = crow
    for cond, texto in blocos:
        f = formula_texto(texto)
        calc.cell(crow, 1, cond or '(sempre)')
        calc.cell(crow, 2, f'=IF({cond},{f},"")' if cond else '=' + f)
        calc.cell(crow, 3, f'=IF(B{crow}="","",COUNTIF(B${ini}:B{crow},"?*"))')
        crow += 1
    fim = crow - 1
    total = f'MAX(Calc!$C${ini}:$C${fim})'

    aba.column_dimensions['A'].width = 110
    aba.column_dimensions['B'].width = 3
    aba.column_dimensions['C'].width = 48
    for k in range(1, len(blocos) + 1):
        c = aba.cell(2 * k - 1, 1, f'=IFERROR(INDEX(Calc!$B${ini}:$B${fim},MATCH({k},Calc!$C${ini}:$C${fim},0)),"")')
        c.alignment = Alignment(wrap_text=True, vertical='top')
        c.font = Font(name='Calibri', size=12)
    aba['C1'] = f'="Para copiar: selecione A1:A"&(2*{total}-1)&", Ctrl+C. No SEI, cole com Ctrl+Shift+V."'
    aba['C3'] = (f'=IF(SUMPRODUCT(--ISNUMBER(SEARCH("[",SUBSTITUTE(A1:A{2 * len(blocos)},"[...]","")))),'
                 '"⚠ Há campos pendentes (entre colchetes).","✓ Nenhum campo pendente.")')
    aba['C5'] = ('Os parágrafos de citação (artigos de lei) chegam no SEI como texto comum; '
                 'aplique o estilo "Citação" do SEI neles, se desejar.') if aba is dec else ''
    for ref in ('C1', 'C3', 'C5'):
        aba[ref].alignment = Alignment(wrap_text=True, vertical='top')
        aba[ref].font = Font(bold=ref != 'C5', color='1F5F8B' if ref == 'C1' else '5B6573')
    aba.conditional_formatting.add(
        f'A1:A{2 * len(blocos)}',
        FormulaRule(formula=['ISNUMBER(SEARCH("[",SUBSTITUTE(A1,"[...]","")))'], fill=AMARELO))
    aba.freeze_panes = None
    return ini, fim


montar(DESPACHO, desp, 'DESPACHO')
montar(DECISAO, dec, 'DECISÃO')

# ---------------------------------------------------------------- Pendências e avisos no formulário

obrig = ['genero', 'nome', 'cadastro', 'cargo', 'lotacao', 'doc_nupemed', 'modalidade', 'prazo_n', 'prazo_un']
pend = '&'.join(f'IF(d_{n}="","{ROTULOS[n]}; ","")' for n in obrig)
pend += ('&IF(c_inicio_d="","Início; ","")&IF(c_fim_d="","Fim; ","")'
         '&IF(AND(c_prorrog,OR(d_ant_n="",d_ant_un="",d_ant_ini="",d_portaria="",d_doc_portaria="")),'
         '"dados da readaptação anterior; ","")'
         '&IF(AND(c_sebio,d_doc_sebio=""),"Nº SEI (Sebio); ","")&IF(AND(c_sst,d_doc_sst=""),"Nº SEI (SST); ","")'
         '&IF(AND(c_gtpo,d_doc_gtpo=""),"Nº SEI (GTPO); ","")'
         '&IF(AND(c_relotar,OR(d_nova_lotacao="",d_data_relot="")),"nova lotação e data; ","")'
         '&IF(d_doc_sgp="","Nº SEI do despacho da SGP (decisão); ","")')
dados.cell(L_STATUS, 2, f'=IF(({pend})="","Nenhuma.",{pend})')
avisos = ('IF(AND(c_relotar,NOT(c_gtpo)),"Relotação sem GTPO: os parágrafos de relotação citam o relatório do GTPO. ","")'
          '&IF(AND(c_inicio_d<>"",c_fim_d<>""),IF(c_fim_d<=c_inicio_d,"Data final anterior ou igual à inicial. ",""),"")'
          '&IF(AND(c_prorrog,c_ant_fim_d<>"",c_inicio_d<>""),IF(c_inicio_d<>c_ant_fim_d+1,'
          '"O novo período não começa no dia seguinte ao fim da readaptação anterior. ",""),"")'
          '&IF(AND(c_relotar,d_data_relot<>"",c_inicio_d<>"",c_fim_d<>""),'
          'IF(OR(d_data_relot<c_inicio_d,d_data_relot>c_fim_d),"A data da relotação está fora do período. ",""),"")')
dados.cell(L_AVISOS, 2, f'=IF(({avisos})="","Nenhum.",{avisos})')

wb.active = 0
wb.save(SAIDA)
print('gerado:', SAIDA)
