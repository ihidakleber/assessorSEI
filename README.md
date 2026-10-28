# Assessor SEI

Gerador de despachos e decisões padronizados, prontos para colar no editor do SEI.

Você preenche um formulário (gênero, nome, cadastro, cargo, lotação, números SEI, prazos...) e a página
monta o texto na hora, com as flexões de gênero, os parágrafos condicionais (teletrabalho, Oficial de
Justiça, relotação, GTPO, Sebio/SST) e as datas calculadas.

- **Sem servidor:** é uma página estática (HTML + JavaScript). O texto é montado no próprio navegador e
  **nenhum dado é enviado ou gravado**. Isso importa porque readaptação envolve dado de saúde (LGPD).
  Só as configurações (vocativo, número dos atos) ficam salvas no navegador.
- **Saída para o SEI:** o botão **Copiar para o SEI** copia o texto já com os estilos de parágrafo do SEI
  (`Texto_Justificado_Recuo_Primeira_Linha`, `Citacao` etc.). Basta colar com Ctrl+V no editor do
  documento. **Copiar texto simples** copia sem formatação.
- **Pendências destacadas:** campo não preenchido aparece em amarelo na prévia (ex.: `[Nº SEI do laudo]`),
  e a página avisa antes de copiar.

## Como usar

1. Escolha o assunto e o tipo de pedido (concessão ou prorrogação).
2. Preencha os campos. Alguns são automáticos (aparecem com fundo azul e a etiqueta "automático"):
   - data final = data inicial + prazo (mesmo dia do mês: 07/10/2026 + 6 meses = 07/04/2027);
   - na prorrogação, início do novo período = dia seguinte ao fim do anterior;
   - cargo "Oficial de Justiça" marca o parágrafo da média da produtividade;
   - "Relotação" marca o GTPO.

   Se você editar um campo automático, ele passa a valer o que você digitou. Para voltar ao cálculo,
   clique em **↺ recalcular**.
3. Alterne entre as abas **Despacho** e **Decisão** e clique em **Copiar para o SEI**.

O artigo da lotação ("na Seção", "no Núcleo") é detectado pela primeira palavra. Se errar, troque o
seletor ao lado do campo para "na / da" ou "no / do".

## Publicar no GitHub Pages

1. No GitHub, abra o repositório e vá em **Settings → Pages**.
2. Em **Build and deployment**, escolha **Deploy from a branch**, selecione o branch (ex.: `main`)
   e a pasta `/ (root)`. Salve.
3. Em um ou dois minutos a página fica disponível em `https://<seu-usuario>.github.io/assessorSEI/`.

Observações:
- No plano gratuito do GitHub, o Pages só funciona com repositório **público**. O código e os modelos de
  texto ficam visíveis, mas nenhum dado de servidor é publicado, porque os dados nunca saem do navegador.
- Também dá para usar sem publicar: baixe a pasta e abra o `index.html` no navegador. Nesse modo, alguns
  navegadores restringem a cópia formatada; se isso acontecer, selecione o texto da prévia e use Ctrl+C.

## Editando os modelos

Cada assunto é um arquivo em `modelos/` (hoje: `modelos/readaptacao.js`). Os textos ficam em blocos,
um por parágrafo:

```js
{ texto: 'Trata-se da {pedido} de readaptação, por problemas de saúde, {do servidor|da servidora} {nome}, ...' },
{ se: (d) => d.teletrabalho, texto: '{O servidor|A servidora}, enquanto estiver em teletrabalho, ...' },
{ tipo: 'citacao', texto: 'Art. 31. Readaptação é a investidura do servidor ...' },
```

| Sintaxe | O que faz |
|---|---|
| `{nome}` | valor do campo `nome` (ou de um trecho calculado em `derivar`) |
| `{do servidor\|da servidora}` | masculino\|feminino, conforme o gênero escolhido |
| `{lotacao_em}`, `{lotacao_de}`, `{lotacao_para}`, `{lotacao_a}` | "na Seção X", "da Seção X", "para a Seção X", "à Seção X" (vale para qualquer campo de lotação) |
| `se: (d) => ...` | o parágrafo só entra quando a condição é verdadeira |
| `tipo: 'citacao'` | parágrafo com estilo `Citacao` do SEI (também: `vocativo`, `alinea`, `vazio`) |
| `{ blocos: [...] }` | agrupa parágrafos (útil com `se`) |

Atalhos disponíveis nas condições do modelo de readaptação: `d.concessao`, `d.prorrogacao`,
`d.teletrabalho`, `d.relotar`, `d.manter`, `d.temPosto` (Sebio ou SST marcados), `d.gtpo`, `d.sebio`,
`d.sst`, `d.oficial`.

Valores fixos que mudam de tempos em tempos (vocativo, ato de delegação, decisão da produtividade, ato do
teletrabalho) ficam em **Configurações**, na própria tela, e não exigem editar código.

### Novo assunto

1. Copie `modelos/readaptacao.js` para, por exemplo, `modelos/licenca.js`, troque o `id`, o `nome`, os
   campos e os textos.
2. Inclua o arquivo no `index.html`, junto dos outros modelos:
   `<script src="modelos/licenca.js"></script>`.
3. O novo assunto aparece no seletor **Assunto**.

## Testes

Os testes geram os documentos para os cenários de exemplo e conferem os trechos principais:

```bash
node testes/gerar.test.js
```

Para ver o texto completo gerado com os dados de exemplo:

```bash
node testes/gerar.test.js --mostrar
```

## Estrutura

```
index.html              página
css/estilo.css          aparência
js/util.js              números por extenso, datas, artigos (na/no, da/do)
js/motor.js             monta o texto a partir do modelo e dos dados
js/config.js            estilos de parágrafo do SEI usados na cópia
js/app.js               formulário, prévia e cópia
modelos/readaptacao.js  campos e textos do assunto Readaptação
testes/gerar.test.js    testes
```
