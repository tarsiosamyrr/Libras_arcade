# FASE 01 — Performance e verificação

**Data local da entrega:** 20/10/2026. **Branch:** `teste-ariel-versao-python`. **Base funcional:** `9063154f5661c50fc7312059aa769709615b3e70`. A documentação/comentários da FASE 00 já estava na árvore local e foi preservada. A entrega original ocorreu sem commit, push, PR, merge ou trabalho da FASE 02; o usuário autorizou consolidar as FASES 00/01 em commit local em 21/10/2026.

## Resultado e diff funcional

Em relação ao snapshot de início da FASE 01: `app.js` tem **+13/−6 linhas** e `vision.js` **+82/−11 linhas**. O diff cumulativo do Git também inclui a documentação/comentários anteriores da FASE 00; não confundir os dois recortes.

| Arquivo | Alteração e justificativa |
| --- | --- |
| [vision.js](../../js/vision.js) | FPS conta inferências na janela móvel de 1 s. Mede inferência, consumidor e ciclo; quatro buffers circulares de 120 posições substituem `push/shift`. Snapshot calcula média/p95/máximo sob consulta. Início cancela cadeia anterior; parada invalida reagendamento e reinício separa métricas. |
| [app.js](../../js/app.js) | Evita redefinir Canvas 640×480 se tamanho não mudou. Evita limpeza de imagem já vazia; limpa imediatamente quando a mão desaparece. Geometria, cores, reconhecimento e cursor permanecem iguais. |
| [performance.test.cjs](../../tests/performance.test.cjs), [runtime.cjs](../../tests/helpers/runtime.cjs) | Testes focados com relógio/DOM/fronteira remota controlados, usando os módulos reais e comparação com Git. |
| [benchmark-performance.cjs](../../scripts/benchmark-performance.cjs), [benchmark-worker.cjs](../../scripts/benchmark-worker.cjs) | Servidor HTTP local e Edge/Playwright para medir o modelo real e avaliar alternativas sem modificar o runtime distribuído. |
| README, AGENTS, roadmap, estado e specs | Atualização de uso, contratos, evidências e limites; registro histórico da FASE 00 preservado. |

CSS, `data.js`, `libras.js`, `game.js`, `forca.js` e `ui.js` mantêm os mesmos hashes do início da FASE 01. A conferência original detectou uma edição adicional em `index.html`, não realizada por esta implementação: `src="js/app.js"` passou a `src="./js/app.js"`. Os caminhos resolvem para o mesmo módulo. Na conferência para o commit, o arquivo já havia retornado a `src="js/app.js"`; o estado encontrado foi preservado. Não foram alterados MediaPipe 0.10.14, modelo, delegate GPU, uma mão, thresholds 0,5, captura solicitada, intervalo de 50 ms ou timestamps enviados ao detector. A pasta preexistente `Libras_arcade/` ficou fora do trabalho.

## Protocolo de medição

- Windows, Ryzen 7 5825U, Radeon Graphics via ANGLE/D3D11; Edge headless `155.0.4283.62`, viewport 1280×800. O navegador informa 16 processadores lógicos e `deviceMemory: 16` (valor aproximado da API, não RAM medida).
- `HandLandmarker` real, GPU, modo VIDEO e configurações do app. Entrada: Canvas 320×240 com fundo cinza e marcador móvel, `captureStream(30)`. Nenhuma mão/pessoa/webcam ou gravação de imagens.
- Cinco cenários: menu, Treino, Soletrar, Forca, Treino com diagnóstico aberto. Três repetições por variante; 2 s de aquecimento por cenário e 4 s de amostragem por repetição. Baseline inicial, versão atual e rVFC têm aproximadamente 60 s medidos cada.
- Baseline lê as fontes do commit-base; a FASE 00 havia comprovado equivalência executável com essa base. Variante atual lê a árvore local. Instrumentação é inserida somente nas respostas do servidor de teste: relógio em torno de inferência e callback, contadores de loop/limpeza e observador de long tasks. Não adiciona chamadas de rede de telemetria à aplicação.
- FPS da tabela = total de inferências / tempo decorrido das amostras, independente do indicador do app. Tempos médios são ponderados pela quantidade de amostras. p95 é calculado por repetição; a tabela apresenta a faixa desses p95, não um percentil global aproximado.
- Os lotes foram sequenciais, sem isolamento de carga externa ou ordem aleatória. A baseline foi repetida após a versão atual (uma repetição/cenário) devido à variação de inferência. Não há intervalo de confiança ou alegação de ganho estatístico.

## Medições comparáveis

| Variante | Inferências | Inferências/s | Callbacks/s | Inferência média (ms) | Faixa de p95 (ms) | Consumidor médio (ms) | Limpezas do overlay |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Baseline inicial, 3 repetições | 1.057 | 17,56 | 59,92 | 20,00 | 20,6–26,7 | 0,117 | 1.057 |
| Versão atual, 3 repetições | 1.063 | 17,66 | 59,91 | 10,39 | 9,8–27,4 | 0,057 | 0 |
| Baseline repetida, 1 repetição | 354 | 17,65 | 60,07 | 9,54 | 10,1–12,9 | 0,066 | 354 |
| Experimento rVFC, 3 repetições | 909 | 15,10 | 29,93 | 10,34 | 9,7–25,9 | 0,064 | 909 |

A queda de 20,00 para 10,39 ms **não é um ganho demonstrado da alteração**: a baseline repetida chegou a 9,54 ms com o mesmo detector. As taxas de rAF atual e baseline permaneceram próximas. O ganho determinístico é eliminar todas as 1.063 limpezas redundantes nos frames sem mão da versão atual e os resets redundantes em resize (estes cobertos por teste controlado). Não extrapolar para aumento de FPS, economia percentual de CPU ou desempenho com mãos.

| Cenário | FPS baseline inicial | FPS atual | Inferência média atual (ms) | Consumidor médio atual (ms) |
| --- | ---: | ---: | ---: | ---: |
| Menu | 17,37 | 17,55 | 11,20 | 0,045 |
| Treino | 17,37 | 17,54 | 11,01 | 0,049 |
| Soletrar | 17,71 | 17,46 | 9,60 | 0,055 |
| Forca | 17,71 | 18,19 | 10,18 | 0,054 |
| Treino + diagnóstico | 17,62 | 17,58 | 9,97 | 0,082 |

Não houve long tasks observadas nas janelas amostradas nem exceções não tratadas de página. Isso não exclui bloqueios inferiores a 50 ms ou problemas fora das janelas. O heap JS observado variou aproximadamente de 13,4 a 21,6 MB em ambos os lotes principais; GC e precisão dessa API impedem inferir economia ou vazamento. CPU, RAM do processo e memória GPU não foram medidas.

## requestVideoFrameCallback

A [especificação](https://wicg.github.io/video-rvfc/) agenda callbacks associados à apresentação de frames de vídeo, limitados também pela atualização da tela. O experimento substituiu apenas o agendador na cópia servida da baseline, mantendo 50 ms. O resultado foi 29,93 callbacks/s e 15,10 inferências/s, contra aproximadamente 60/17,7 no rAF.

Com vídeo de 30 Hz, o callback seguinte após 33 ms ainda não satisfaz 50 ms; muitas inferências esperam 66,7 ms. Menos callbacks é desejável, mas a mudança reduz a amostragem temporal usada por J/Z (janela 1.300 ms, mínimo de 6 amostras). **Não adotado.** Um algoritmo diferente de seleção de frames precisaria de comparação temporal e precisão consentida antes de substituir o atual. O protótipo de benchmark não é implementação de cancelamento rVFC para produção.

## Web Workers

A [documentação oficial do Hand Landmarker](https://developers.google.com/edge/mediapipe/solutions/vision/hand_landmarker/web_js) informa que a inferência é síncrona e recomenda considerar Workers para evitar bloqueio da UI. O [exemplo oficial](https://github.com/google-ai-edge/mediapipe-samples-web/blob/main/src/workers/hand-landmarker.worker.ts) demonstra processamento de bitmap; a compatibilidade precisa ser conferida com a versão fixada no projeto.

Dois protótipos isolados usaram exatamente 0.10.14 e GPU:

- **Worker de módulo:** falhou na inicialização porque o runtime tenta `importScripts()`, incompatível com Worker de módulo. Falha registrada, não resolvida por atualização silenciosa de dependência.
- **Worker clássico com import dinâmico:** inicializou em 3.835 ms. Após 5 aquecimentos, completou 60 inferências sem mãos, com um bitmap em trânsito e `close()` após uso. Média/p95 de inferência: **14,81/28,20 ms**; captura do bitmap: **0,12/0,20 ms**; ida e volta incluindo captura: **15,22/28,50 ms**. Worker encerrado ao terminar.

O Worker clássico demonstra viabilidade local. Não é A/B de throughput: utiliza Canvas diretamente, aguarda a resposta e espera 50 ms antes da próxima amostra; não integra vídeo, rastreamento com mão, desenho ou jogos. Esses custos não comprovam redução de latência ou precisão preservada na arquitetura assíncrona. **Não adotado nesta entrega.** Integrá-lo exige backpressure, propriedade/descarte de bitmaps, timestamps de captura e descarte de resultados antigos. A decisão pode ser reavaliada com dados representativos, sem afirmar que Workers são inviáveis.

## Testes e revisão

**13/13 testes automáticos** passaram: janela de FPS e limites exatos; métricas e buffer; deduplicação e skips; uma cadeia por vez; parada/reinício; desenho idêntico quando há mão e limpeza no desaparecimento; pontuação/erros dos três jogos; sequência diferencial de estados, cursor, confirmações e navegação; hold e trajetórias J/Z sintéticas.

**6/6 verificações de integração no Edge** passaram na versão atual: evento `signconfirmed` alimenta Treino e Soletrar e atualiza placar/tela; repetição da Forca não pontua novamente; vitória e derrota com seis erros; saída retorna ao menu. São eventos injetados pela fronteira existente, não sinais reconhecidos de uma pessoa. A UI real e seus handlers/DOM são executados.

A revisão delegada usou subagente nativo, pois Orca estava indisponível. Identificou uma amostra com consumidor/ciclo zerados ao parar dentro do callback; o teste foi ampliado, falhou e passou após separar a geração das métricas da geração do loop. O subagente trabalhou somente em leitura. Sintaxe dos sete módulos e quatro scripts de teste/benchmark, memória técnica, links locais e `git diff --check` foram aprovados. A verificação inicial de hashes detectou a diferença adicional de HTML descrita acima; os seis arquivos restantes conferiram byte a byte. Comandos estão em [specs/testing.md](../../specs/testing.md).

## Reprodução e evidências brutas

Requer Node e Playwright já acessível ao `require('playwright')`, além do canal Edge instalado. Se o pacote estiver em um runtime compartilhado, configure `NODE_PATH` para seu diretório `node_modules`. Não há instalação automática. Execute na raiz:

```powershell
node --experimental-vm-modules --test tests/performance.test.cjs
node scripts/benchmark-performance.cjs baseline
node scripts/benchmark-performance.cjs current
node scripts/benchmark-performance.cjs rvfc
node scripts/benchmark-worker.cjs docs/performance/worker.json module
node scripts/benchmark-worker.cjs docs/performance/worker-classic.json classic
# Somente regressões de navegador, sem outro lote de performance:
$env:BENCH_REPEATS = '0'
node scripts/benchmark-performance.cjs current docs/performance/browser-regressions.json
Remove-Item Env:BENCH_REPEATS
```

`BENCH_REPEATS` e `BENCH_SECONDS` controlam repetições e segundos medidos (padrões 3 e 4). Para uma comparação nova, mantenha-os iguais entre variantes. Cada comando sobrescreve seu arquivo de saída; use outro caminho para preservar evidência anterior. Dependências remotas precisam estar acessíveis; modelo e fontes não estão empacotados no projeto.

Dados: [baseline inicial](baseline.json), [versão atual](current.json), [baseline repetida](baseline-confirmacao.json), [rVFC](rvfc.json), [Worker de módulo](worker.json), [Worker clássico](worker-classic.json) e [integração do navegador](browser-regressions.json). Os lotes mais recentes incluem hashes das fontes lidas; a integração registra os hashes da versão final de produção. Os primeiros dois lotes foram gerados antes dessa adição de metadados ao harness; o runtime atual não mudou depois do lote atual. Datas JSON usam UTC; o ensaio continuou na noite de 20/10 em America/Sao_Paulo.

## Riscos e limites do aceite

O vídeo controlado é produzido por timer na thread principal; sua produção também sofre interferência da carga. Ele não equivale a câmera física de 30 Hz. Sem mãos, não exercita custo de tracking/landmarks nem a precisão do classificador. Os testes sintéticos preservam comportamento de software, mas não homologam sinais reais.

Continuam pendentes testes com participantes consentidos, iluminação/oclusão/posições, sinais semelhantes e J/Z em webcam, dispositivos móveis e outros navegadores. Não foi prometida taxa de acerto ou ganho de FPS. HUD mantém o último valor quando não chegam resultados; `getPerformanceMetrics()` expira FPS para zero. Exceções, liberação de câmera/modelo e timers antigos dos jogos permanecem no roadmap da FASE 02.

A implementação e a verificação automática da FASE 01 estão concluídas com esses limites explícitos. A homologação de reconhecimento real permanece pendente. A próxima fase requer nova autorização.
