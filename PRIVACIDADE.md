# Privacidade: por que os dados digitados não saem do computador

Este documento traz três coisas: uma explicação técnica, uma explicação para quem não é da área de
tecnologia e um roteiro para **qualquer pessoa conferir sozinha**, no próprio navegador, que nada é enviado.

A ideia não é pedir confiança, e sim permitir a verificação. A garantia vem de três camadas
independentes:

1. **O código** não contém nenhuma instrução de envio de dados (e pode ser auditado: são cerca de
   1.200 linhas, sem bibliotecas de terceiros).
2. **O navegador** é instruído a bloquear qualquer conexão que a página tente abrir, mesmo que o
   código seja alterado por engano.
3. **A conferência na aba Rede** mostra, na prática, que nenhuma requisição acontece enquanto a
   ferramenta é usada.

---

## 1. Explicação técnica

**Arquitetura.** O Assessor SEI é um site 100% estático (HTML, CSS e JavaScript) hospedado no GitHub
Pages. Não existe backend, banco de dados, API, formulário com `action` nem serviço de terceiros
(analytics, fontes externas, CDN). O servidor só entrega 7 arquivos fixos:

```
index.html, css/estilo.css, js/util.js, js/motor.js, js/config.js, modelos/readaptacao.js, js/app.js
```

Depois disso, todo o processamento acontece **no navegador**. O texto é montado por funções puras em
memória (`js/motor.js`) e exibido no DOM. A cópia usa a API de área de transferência local
(`navigator.clipboard`), que não envolve rede.

**Ausência de código de rede.** O código não usa `fetch`, `XMLHttpRequest`, `WebSocket`,
`EventSource`, `navigator.sendBeacon`, `import()` dinâmico nem URLs externas. A busca abaixo, feita na
raiz do repositório, não retorna nada:

```bash
grep -rnE "fetch\(|XMLHttpRequest|WebSocket|sendBeacon|EventSource|import\(|https?://" js modelos index.html css
```

**Trava imposta pelo navegador (Content-Security-Policy).** O `index.html` declara:

```
default-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src data:;
connect-src 'none'; form-action 'none'; base-uri 'none'
```

| Diretiva | Efeito |
|---|---|
| `connect-src 'none'` | o navegador recusa **qualquer** conexão iniciada pela página: `fetch`, XHR, WebSocket, `sendBeacon` |
| `form-action 'none'` | proíbe enviar formulários para qualquer endereço |
| `default-src 'none'` | proíbe carregar qualquer recurso não liberado explicitamente (fontes, iframes, mídia, workers) |
| `script-src 'self'` | só executa scripts do próprio site; não há script embutido nem de terceiros |
| `img-src data:` | imagens só embutidas; impede o truque de "vazar" dados na URL de uma imagem externa |
| `style-src 'self' 'unsafe-inline'` | estilos do próprio site; o inline é necessário para a cópia formatada e não permite carregar nada de fora, porque fontes e imagens seguem bloqueadas pelas regras acima |
| `base-uri 'none'` | impede redirecionar os caminhos relativos para outro servidor |

Se algum código tentar enviar dados, o próprio navegador bloqueia e registra no Console
`violates the following Content Security Policy directive`. Na aba Rede, a tentativa aparece com o
status `(blocked:csp)`.

**Armazenamento.** Os dados do formulário ficam só na memória da aba e somem ao fechá-la. A única
coisa gravada (`localStorage`, chave `assessorSEI.preferencias.v1`) são as **configurações**:
vocativo, número dos atos e a opção de formatação. Nenhum dado de servidor é gravado.

**Teste realizado.** Com o navegador Chromium automatizado, a ferramenta foi usada de ponta a ponta:
preenchimento, troca de abas, prorrogação e as duas cópias. Resultado: **0 requisições após o
carregamento**. Em seguida, foram feitas tentativas propositais de envio a um servidor "espião" local,
que registrava tudo o que recebia, por `fetch`, `sendBeacon`, imagem e XHR:

| Origem das tentativas | O que o servidor espião recebeu |
|---|---|
| Assessor SEI (com a trava) | **nada** |
| Página sem a trava (controle) | as 4 tentativas, com o dado de teste |

O controle mostra que o teste é capaz de detectar envios; logo, o "nada" do Assessor SEI é real.

---

## 2. Explicação para quem não é da área de tecnologia

Pense na página como uma **calculadora**, e não como um formulário de site. Quando você abre o
endereço, o navegador baixa a "calculadora" (os arquivos da página) uma única vez. A partir daí, tudo
o que você digita é processado **dentro do seu próprio computador**, como numa calculadora de mesa. O
texto do despacho é montado ali mesmo e copiado para a sua área de transferência.

Não existe um "outro lado" para onde os dados possam ir: a página não tem servidor próprio, banco de
dados ou cadastro. O GitHub, onde a página está hospedada, apenas entrega os arquivos, como uma banca
entrega um jornal. Ele não recebe o que você escreve nas margens.

Além disso, a página traz uma regra que o **próprio navegador** (Chrome, Edge, Firefox) obedece:
"esta página está proibida de se conectar a qualquer lugar". É como um telefone com as chamadas de
saída bloqueadas pela operadora: mesmo que alguém tentasse discar, a ligação não completaria.

E tudo isso pode ser conferido, sem precisar acreditar em ninguém, como mostra o roteiro abaixo. Ao
fechar a aba, os dados digitados desaparecem.

---

## 3. Como conferir na aba Rede (Chrome ou Edge)

Tempo: cerca de 3 minutos. Use **dados fictícios** na conferência.

1. Abra uma **janela anônima** (`Ctrl+Shift+N` no Chrome e no Edge; `Ctrl+Shift+P` no Firefox).
   Nela, as extensões do navegador ficam desligadas e não "poluem" o resultado.
2. Abra o endereço do Assessor SEI.
3. Pressione **F12** (ou `Ctrl+Shift+I`) para abrir as Ferramentas do desenvolvedor e clique na aba
   **Rede** (*Network*). Se não aparecer, procure no menu `»`.
4. Na barra da aba Rede:
   - marque **Preservar registro** (*Preserve log*);
   - marque **Desativar cache** (*Disable cache*);
   - deixe o filtro em **Todos** (*All*).
5. Pressione **F5** para recarregar. Devem aparecer **7 linhas**, todas do mesmo endereço do site:
   `index.html`, `estilo.css`, `util.js`, `motor.js`, `config.js`, `readaptacao.js` e `app.js`.
   É o download da página. Todas usam o método `GET`, e nenhuma leva dados digitados, porque nada foi
   digitado ainda. Pode aparecer também uma linha `data:,`, que é o ícone embutido na própria página
   e não sai do computador.
6. Clique no ícone **Limpar** (🚫, círculo cortado) para esvaziar a lista.
7. Agora **use a ferramenta normalmente**: preencha nome, cadastro e números SEI, troque entre
   Concessão e Prorrogação, alterne Despacho e Decisão e clique em **Copiar para o SEI** e
   **Copiar texto simples**.
8. Olhe a aba Rede: **a lista continua vazia.** Nenhuma informação saiu do computador.

### Conferências complementares (opcionais)

- **A trava está ativa:** pressione `Ctrl+U` (código-fonte) e procure `Content-Security-Policy`.
  Deve aparecer a linha com `connect-src 'none'`.
- **Funciona sem internet:** depois do passo 5, na aba Rede, troque **Sem limitação** (*No
  throttling*) por **Off-line** e use a ferramenta. Tudo continua funcionando, o que mostra que ela não
  depende da internet para montar os textos.
- **O que fica gravado:** aba **Aplicativo** (*Application*) → **Armazenamento local** → endereço do
  site. Só aparece `assessorSEI.preferencias.v1`, com as configurações (vocativo, atos), nunca nome,
  cadastro ou números de documento.
- **Console limpo:** na aba **Console** não deve haver erros. Uma mensagem com
  `Content Security Policy` só apareceria se algo tentasse enviar dados, e nesse caso o navegador já
  teria bloqueado.

### Como interpretar o que aparecer

| O que você vê na aba Rede durante o uso | Significado |
|---|---|
| Lista vazia | Nada foi enviado (resultado esperado). |
| Linha com status `(blocked:csp)` em vermelho | Algo **tentou** se conectar e o navegador **bloqueou**: nada saiu. Vale investigar a origem, mas não houve vazamento. |
| Linha de outro endereço, com status 200 | Não deve acontecer na janela anônima. Fora dela, costuma ser uma extensão do navegador; repita o teste na janela anônima. |

**No Firefox:** F12 → aba **Rede**. Marque **Persistir logs** e **Desativar cache** (ícone de
engrenagem) e siga os mesmos passos.

---

## Limites (o que a página não controla)

Para uma avaliação honesta, estes pontos ficam **fora** do alcance de qualquer página web:

- **Extensões do navegador** com permissão para "ler todos os sites" conseguem ver o conteúdo de
  qualquer página, inclusive desta e do próprio SEI. Por isso, a conferência é feita em janela anônima.
- **O computador em si** (antivírus, programas de monitoramento) e o **destino da cópia** (o SEI)
  seguem as regras do órgão.
- **O GitHub registra o acesso** (endereço IP, horário, navegador), como qualquer site, mas não o
  conteúdo digitado, que nunca chega a ele.
- **Alterações futuras no código:** a trava e o código estão no repositório, com todo o histórico de
  alterações visível. Quem tem permissão de escrita no repositório pode mudá-los, então a conferência
  acima deve ser repetida após atualizações relevantes.
- **Navegação para fora da página:** a política de segurança bloqueia conexões em segundo plano, mas
  não impede a página de abrir outro endereço. O código não faz isso, e, se fizesse, seria visível: a
  página mudaria de endereço e a navegação apareceria na aba Rede.

Para o nível máximo de controle, a mesma pasta pode ser hospedada na **intranet** do órgão ou aberta
direto do computador (`index.html`), sem depender do GitHub.
