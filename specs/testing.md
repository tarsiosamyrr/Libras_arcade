# Verificações e evidências

**Data:** 20/10/2026. **Ambiente da auditoria:** PowerShell, Node.js `v24.18.0`, Python `3.11.9`. **Base:** `9063154f5661c50fc7312059aa769709615b3e70`.

## Verificação atual — FASE 02.1 sobre `fb22e89`

Em 21/10/2026, `npm.cmd test` passou com 34/34 testes: os 25 da integração anterior e 9 novos da FASE 02.1. Os novos testes foram executados antes das correções: 7 falharam pelos defeitos reproduzidos; 2 verificam comportamentos preservados. O comando `npm.cmd run test:camera` passou com 21/21 testes. `npm.ps1` está bloqueado pela política de execução local do PowerShell; `npm.cmd` executa os mesmos scripts. O aviso `ExperimentalWarning` do Node permanece esperado.

A integração anterior foi verificada com Node `v24.18.0` e PowerShell; esta é a versão mais antiga efetivamente testada, sem ensaio em versões anteriores. Naquela integração, a suíte conjunta passou com 25/25 testes com `--experimental-vm-modules`. Sem a flag, `require('node:vm').SyntheticModule` retorna `undefined` no Node 24.18.0.

O `package.json` padroniza os comandos sem dependências instaláveis nem mudança no runtime web. A flag aparece apenas na suíte completa e na FASE 01, que usa `vm.SyntheticModule`/`vm.SourceTextModule` em `tests/helpers/runtime.cjs`; a FASE 02 não precisa dela. Edge `155.0.4283.62` e Playwright pertencem à medição histórica da FASE 01; a integração não foi medida com navegador/webcam real. A suíte focada não substitui a futura FASE 05.

Os testes diferenciais da FASE 01 chamam `git show 9063154:...`; esse commit precisa estar disponível no histórico local, inclusive em uma futura execução de CI. Os testes sintéticos não medem CPU/RAM total nem validam reconhecimento com webcam.

```powershell
npm test
npm run test:performance
npm run test:camera
# Equivalente direto da suíte conjunta:
node --experimental-vm-modules --test tests/performance.test.cjs tests/phase02.test.mjs
Get-ChildItem -LiteralPath js -Filter *.js | ForEach-Object {
    node --check $_.FullName
    if ($LASTEXITCODE -ne 0) { throw "Falha de sintaxe: $($_.Name)" }
}
git diff --check
git diff --cached --check
```

- FASE 01: 13 testes de FPS e limites de 50/1.000 ms; durações separadas; buffer de 120 amostras; vídeo repetido; início/parada/reinício; desenho e limpeza; três motores; comparação com a base para estados, cursor, confirmações, hold, J/Z e navegação sintéticos. A fixture de DOM e três vídeos sintéticos foram adaptados para o controle de visibilidade e `readyState` da FASE 02.
- FASE 02: 12 testes de inicialização compartilhada, cancelamento de modelo/câmera, falha de reprodução, loop único, reinício de métricas após reabrir a câmera, erros do detector/consumidor, limpeza de gestos e pausa/cancelamento de avanços nos jogos. Usam substitutos locais e não validam hardware real.
- FASE 02.1: 9 testes novos em `tests/phase02.test.mjs` cobrem exceções de `getItem()`/`setItem()`, `QuotaExceededError`, avisos de armazenamento, recorde em memória, reconciliação com valor persistido, nova tentativa após falha temporária, saída manual para o menu, `sessionend`, reinício de `bestStreak`, resultados de Treino/Soletrar/Forca e persistência normal. Usam os motores e métodos reais da UI com DOM/armazenamento substitutos; não executam o boot com webcam nem validam mensagens da tela de erro da câmera diretamente.
- Histórico da FASE 01: implementação anterior apresentou 7 falhas em 9 testes; a implementação passou. A revisão identificou duração zerada quando o consumidor parava o loop; teste ampliado falhou e passou após correção. A fixture inicial de navegação não atingia o deslocamento mínimo; foi ajustada sem mudar a regra do jogo.
- Mocks substituem relógio, DOM mínimo, timers, storage e import remoto na VM; os módulos da aplicação são reais. Desenho compara a sequência de operações, não apenas quantidade de chamadas. Testes diferenciais leem o commit-base pelo Git.
- Benchmark separado usa MediaPipe real, GPU e UI no navegador com vídeo gerado sem pessoas. Scripts, parâmetros, resultados brutos, regressões de eventos/DOM e limitações estão no [relatório da FASE 01](../docs/performance/FASE01.md).
- Na FASE 01, `app.js` e `vision.js` mudaram funcionalmente; CSS, dados, regras, jogos e UI preservaram os hashes do snapshot de início daquela fase. Em HTML, a conferência original identificou uma edição adicional de `js/app.js` para `./js/app.js`, com destinos equivalentes. Na consolidação para commit em 21/10, o arquivo já havia retornado a `js/app.js`; o estado encontrado foi preservado. A equivalência de todos os ASTs abaixo vale somente para a FASE 00.

## Histórico da FASE 00 — ferramentas e resultados naquele momento

O repositório não possui suíte de testes, CI, `package.json`, lint, typecheck ou build. Não foram instaladas dependências nem criada infraestrutura de testes da FASE 05. As verificações abaixo foram executadas pontualmente no terminal, sem persistir scripts executáveis no projeto.

| Verificação | Comando/método | Evidência e limite |
| --- | --- | --- |
| Sintaxe | `node --check` em cada `js/*.js` | Sete módulos válidos; não executa imports, DOM ou MediaPipe. |
| Ausência de mudança funcional | Acorn interno do Node, `node --expose-internals -`, comparação de AST com a base | Sete ASTs iguais, ignorando posições. HTML/CSS comparados sem comentários e com CRLF normalizado. |
| Dados | `node --experimental-vm-modules -`, módulos reais e substituição apenas do import remoto | 24 regras estáticas + J/Z, 26 letras únicas, 90 palavras sem caracteres fora do pool e sem dicas ausentes. |
| Motores | Mesmo ambiente VM, storage em memória e timers controlados | Treino: acerto dá 10 pontos; Soletrar: palavra soma bônus; Forca: repetição não duplica pontos, vitória e derrota com 6 erros. Não valida interface ou reconhecimento real. |
| Diagnóstico | Relógio/callbacks e features sintéticas | Reproduzidos FPS falso, loop interrompido por exceção, avanço por callback antigo, `bestStreak` herdado e empate I/Y. Esta linha preserva o diagnóstico da FASE 00; o estado atual está acima e no roadmap. |
| HTTP local | Python `ThreadingHTTPServer`, porta efêmera em `127.0.0.1`, GET via `urllib.request` | HTML, CSS e sete JS retornaram 200 com corpo. Servidor encerrado no fim; não houve chamada a CDN/webcam. |
| Documentação | Validador `validate_specs.py` da skill `maintaining-project-specs`, mais conferência de links locais | Aprovado; links locais e UTF-8 dos 10 documentos conferidos. Não valida conteúdo pedagógico. |
| Diff | `git diff --check`, revisão de arquivos novos e diff | Sem erros de whitespace; revisão confirma documentação e comentários. O status local está em `docs/state.md`. |

## Histórico da FASE 00 — comandos de sintaxe e preservação

Executar na raiz em PowerShell:

```powershell
Get-ChildItem -LiteralPath js -Filter *.js | ForEach-Object {
    node --check $_.FullName
    if ($LASTEXITCODE -ne 0) { throw "Falha de sintaxe: $($_.Name)" }
}
git diff --check
```

A comparação abaixo foi usada apenas na auditoria da FASE 00. Após a FASE 01, ela detectará as mudanças intencionais de `app.js` e `vision.js`; não é um critério de aprovação da versão atual. O Acorn interno existe no Node instalado; é uma API interna, não uma dependência adicionada à aplicação ou um comando de CI portátil.

```powershell
@'
const fs = require('node:fs');
const cp = require('node:child_process');
const acorn = require('internal/deps/acorn/acorn/dist/acorn');
const base = '9063154f5661c50fc7312059aa769709615b3e70';
const files = cp.execFileSync('git', ['ls-files'], {encoding: 'utf8'}).trim().split('\n');
const original = file => cp.execFileSync('git', ['show', `${base}:${file}`], {encoding: 'utf8'});
const normalize = code => JSON.stringify(
  acorn.parse(code, {ecmaVersion: 'latest', sourceType: 'module'}),
  (key, value) => key === 'start' || key === 'end' ? undefined : value
);
for (const file of files.filter(f => f.endsWith('.js'))) {
  if (normalize(fs.readFileSync(file, 'utf8')) !== normalize(original(file))) {
    throw new Error(`AST alterada: ${file}`);
  }
  console.log('AST idêntica:', file);
}
for (const file of ['index.html', 'css/style.css']) {
  const pattern = file.endsWith('.html') ? /<!--[\s\S]*?-->/g : /\/\*[\s\S]*?\*\//g;
  const strip = text => text.replace(pattern, '').replace(/\r\n/g, '\n');
  if (strip(fs.readFileSync(file, 'utf8')) !== strip(original(file))) {
    throw new Error(`Conteúdo alterado fora de comentários: ${file}`);
  }
  console.log('Conteúdo sem comentários idêntico:', file);
}
'@ | node --expose-internals -
if ($LASTEXITCODE -ne 0) { throw 'Comparação estrutural falhou' }
```

A primeira execução detectou uma quebra de linha acrescentada no fim de HTML/CSS pela edição; o formato original foi restaurado. A comparação não foi relaxada para aceitar essa diferença.

## Reprodução da consistência dos dados

Este comando avalia os módulos reais com uma fronteira remota inerte; não chama a implementação do MediaPipe. A VM experimental pode emitir aviso do próprio Node.

```powershell
@'
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const assert = require('node:assert/strict');
(async () => {
  const context = vm.createContext({EventTarget, CustomEvent});
  const cache = new Map();
  const remote = new vm.SyntheticModule(['HandLandmarker', 'FilesetResolver'], function () {
    this.setExport('HandLandmarker', {});
    this.setExport('FilesetResolver', {});
  }, {context});
  const load = file => {
    file = path.resolve(file);
    if (!cache.has(file)) cache.set(file, new vm.SourceTextModule(
      fs.readFileSync(file, 'utf8'), {context, identifier: file}
    ));
    return cache.get(file);
  };
  const data = load('js/data.js');
  await data.link((spec, ref) => spec.startsWith('https:') ? remote :
    load(path.resolve(path.dirname(ref.identifier), spec)));
  await data.evaluate();
  const d = data.namespace;
  const l = cache.get(path.resolve('js/libras.js')).namespace;
  const words = Object.values(d.WORDS).flat();
  assert.equal(l.STATIC_LETTERS.length, 24);
  assert.equal(l.MOTION_LETTERS.join(','), 'J,Z');
  assert.equal(new Set(l.SUPPORTED_LETTERS).size, 26);
  assert.equal(d.LETTER_POOL.length, 26);
  assert.equal(words.length, 90);
  assert.ok(words.every(w => [...w].every(c => d.LETTER_POOL.includes(c))));
  assert.ok(words.every(w => d.WORD_HINTS[w]));
  console.log('Dados OK: 26 letras, 90 palavras, todas com dica');
})().catch(error => { console.error(error); process.exitCode = 1; });
'@ | node --experimental-vm-modules -
if ($LASTEXITCODE -ne 0) { throw 'Validação dos dados falhou' }
```

## Histórico da FASE 00 — cenários diagnósticos executados

A auditoria avaliou as fontes reais em `vm.SourceTextModule`, com `localStorage` em memória, callbacks de rAF/intervalo/timeout guardados em mapas e um `HandLandmarker` substituto. A exposição temporária de `RULES`/`classify` ocorreu apenas na string da VM, sem editar os exports do arquivo.

| Cenário | Passos / resultado observado |
| --- | --- |
| FPS | Executar 20 callbacks com `currentTime` distinto e timestamps espaçados por 1.000 ms: o callback recebe FPS 20, apesar de uma inferência simulada por segundo. |
| Erro de inferência | Fazer o detector substituto lançar erro no callback seguinte: nenhum novo rAF é agendado. |
| Callback de outra sessão | `startPractice(1)` → `handleSign(target)` → capturar callback de avanço → `end()` → `startPractice(1)` → executar callback antigo: `round` aumenta indevidamente. |
| Sequência herdada | Após um acerto, executar `end()` e novo `startPractice(1)`: `bestStreak` continua 1. |
| I/Y | Features com extIndex/extMiddle/extRing=0, extPinky=1, thumbOut=1 e demais medidas afastando outras regras: I=1, Y=1; `classify()` retorna I por ordem. É um caso sintético, não estatística por usuário. |
| Níveis | Comparar cada caractere de WORDS com `LETTERS[c].difficulty`: 11/13 palavras do nível 1 e 6/21 do nível 2 contêm letras com dificuldade maior que a do banco. |

Essas reproduções confirmaram os comportamentos naquela auditoria. A FASE 01 corrigiu o FPS, a FASE 02 tratou parte dos recursos e callbacks antigos, e a FASE 02.1 corrigiu a sequência herdada; o estado atual está no código e no [roadmap](../docs/ROADMAP.md).

## Validação documental

Em ambiente com a skill global instalada, na raiz do projeto:

```powershell
py "$env:USERPROFILE\.codex\skills\maintaining-project-specs\scripts\validate_specs.py" .
```

O validador pertence ao ambiente do agente, não ao repositório. A inspeção adicional percorre apenas README, AGENTS, `docs/*.md` e `specs/**/*.md` e confere destinos de links locais, sem acessar a pasta aninhada preexistente. O diff de arquivos novos deve ser inspecionado também: `git diff` sozinho não os inclui.

## Limites da FASE 00 e verificações manuais pendentes

Na FASE 00 não foram medidos CPU/RAM, latência ou FPS reais nem testado MediaPipe real. A FASE 01 acrescenta as medições controladas e integração de navegador descritas acima. Reconhecimento por webcam, compatibilidade entre navegadores, leitor de tela, contraste ou navegação visual completa permanecem sem homologação. Servir os arquivos com HTTP 200 não comprova boot nem jogabilidade.

Quando autorizado, validar: câmera negada/ausente/ocupada, falhas de rede/modelo, play rejeitado, visibilidade da aba, sair/reiniciar durante avanços, guia aberto durante jogo, J/Z e letras similares, duas mãos no quadro, teclado/touch, proporções de tela e zoom. O planejamento está no [roadmap](../docs/ROADMAP.md).
