"""
Gera AssessorSEI.html: a página inteira (HTML, CSS e scripts) num arquivo único,
para abrir direto no navegador, enviar por e-mail ou guardar na rede interna.

Rodar:  python3 gerar_html_unico.py

A trava de privacidade (Content-Security-Policy) é mantida. Como os scripts passam a
ficar embutidos, eles são autorizados pelo hash SHA-256 do próprio conteúdo: qualquer
script diferente, embutido ou externo, é recusado pelo navegador.
"""
import base64
import hashlib
import re
from pathlib import Path

RAIZ = Path(__file__).parent
SAIDA = RAIZ / 'AssessorSEI.html'


def sha256(texto):
    return "'sha256-" + base64.b64encode(hashlib.sha256(texto.encode('utf-8')).digest()).decode() + "'"


html = (RAIZ / 'index.html').read_text(encoding='utf-8')

css = (RAIZ / 'css/estilo.css').read_text(encoding='utf-8')
html = html.replace('<link rel="stylesheet" href="css/estilo.css">', '<style>\n' + css + '</style>')

scripts = []


def embutir(m):
    codigo = (RAIZ / m.group(1)).read_text(encoding='utf-8')
    assert '</script' not in codigo, m.group(1)
    conteudo = '\n' + codigo  # o hash precisa cobrir exatamente o que fica entre as tags
    scripts.append(conteudo)
    return '<script>' + conteudo + '</script>'


html = re.sub(r'<script src="([^"]+)"></script>', embutir, html)

csp_antiga = re.search(r'content="(default-src[^"]+)"', html).group(1)
csp_nova = csp_antiga.replace("script-src 'self'", 'script-src ' + ' '.join(sha256(s) for s in scripts))
csp_nova = csp_nova.replace("style-src 'self'", 'style-src')
html = html.replace(csp_antiga, csp_nova)
html = html.replace('<title>Assessor SEI</title>',
                    '<title>Assessor SEI</title>\n  <!-- Arquivo gerado por gerar_html_unico.py; edite os originais. -->')

assert 'src="' not in html and 'href="css' not in html
SAIDA.write_text(html, encoding='utf-8')
print(f'gerado: {SAIDA} ({len(html) // 1024} KB, {len(scripts)} scripts)')
