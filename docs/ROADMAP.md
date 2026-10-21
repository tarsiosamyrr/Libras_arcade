# FASE 00 — Auditoria e roteiro técnico

**Atualização das FASES 01 e 02:** FPS corrigido, loop/Canvas otimizados e comparação controlada da FASE 01 executada ([relatório](performance/FASE01.md)). O ciclo de câmera, modelo e sessões da FASE 02 foi integrado no diretório de trabalho, com testes sintéticos; o cherry-pick ainda não foi concluído. As tabelas abaixo preservam o diagnóstico histórico da FASE 00.

**Data:** 20/10/2026. **Branch:** `teste-ariel-versao-python`.
**Base auditada:** `9063154f5661c50fc7312059aa769709615b3e70`.
**Escopo:** sete módulos JavaScript, HTML, CSS e README da raiz. A pasta não rastreada `Libras_arcade/` foi preservada e não integra este diagnóstico.

Esta fase documenta o estado existente e corrige comentários. Não muda regras, valores, eventos, estilos, telas ou dependências. A arquitetura está em [specs/system.md](../specs/system.md), as evidências em [specs/testing.md](../specs/testing.md) e as regras de trabalho em [AGENTS.md](../AGENTS.md).

## Execução sequencial da FASE 00

- [x] Confirmar diretório, branch, remoto, status e instruções locais; ler o prompt mestre e README.
- [x] Auditar visão, reconhecimento, jogos, UI, dados, HTML, CSS e dependências.
- [x] Classificar achados, distinguindo evidência estática, reprodução sintética e hipótese de impacto.
- [x] Criar AGENTS, roadmap e memória técnica; atualizar README e comentários em PT-BR.
- [x] Finalizar verificação estrutural, documental e revisão do diff.

Orca não estava disponível como ferramenta/comando na sessão. Foi usado um subagente nativo de leitura para visão/reconhecimento; ele retornou achados parciais e foi interrompido pelo limite de uso. A auditoria e a integração foram concluídas pelo agente principal, sem edições delegadas ou trabalho simultâneo nas fases seguintes.

## Critério de gravidade

**Crítico:** perda grave de dados, exposição comprovada de dados sensíveis ou impedimento generalizado sem alternativa. **Alto:** interrupção relevante, corrupção de estado ou medição essencial inválida. **Médio:** limitação de uso, manutenção, consistência ou risco condicionado. **Baixo:** lacuna documental ou dívida pequena. Gravidade é prioridade técnica, não frequência medida.

**Críticos:** nenhum confirmado no escopo auditado. Isso não representa certificação de segurança ou validação integral do produto.

Inventário: **5 altos, 11 médios e 2 baixos**. Achados agrupam causas relacionadas; hipóteses de impacto permanecem identificadas como não medidas/não reproduzidas.

## Achados altos

| ID | Diagnóstico e evidência | Impacto e encaminhamento |
| --- | --- | --- |
| A01 | Na base auditada, `startDetectionLoop()` contava até 20 amostras, sem janela temporal; uma inferência por segundo chegava a exibir 20 FPS. | **Corrigido na FASE 01:** janela de 1 s, durações e snapshot; regressão automatizada e baseline real controlada. HUD só atualiza com resultados; consulta de métricas expira FPS parado. |
| A02 | Na base auditada, `detectForVideo()` e `onResults()` não tinham tratamento de exceção; uma falha interrompia o loop sem mensagem. | **Tratado na FASE 02:** o ciclo interrompe o rAF e envia a falha para a tela de erro; teste sintético cobre falha do consumidor. Webcam real ainda precisa de validação. |
| A03 | Na base auditada, câmera, modelo e loop não tinham descarte integrado nem política de visibilidade. | **Tratado na FASE 02:** aba oculta para as trilhas e pausa a sessão; `pagehide` fecha o modelo; menu mantém a câmera para gestos. Testes cobrem cancelamentos e reabertura, sem medição de vazamento em hardware. |
| A04 | Na base auditada, timeouts de avanço podiam afetar sessões reiniciadas em Treino/Soletrar e Forca. | **Tratado na FASE 02:** avanços pendentes são cancelados em `end()`/reinício e conservam o atraso restante na pausa. Testes sintéticos cobrem reinício e Forca; cenários reais de navegação continuam manuais. |
| A05 | Em [libras.js](../js/libras.js), `_trackHold()` roda antes de `_trackMotionSigns()` e pode confirmar a pose-base enquanto J/Z acumulam trajetória. `classify()` escolhe o primeiro maior escore sem margem entre candidatos. Com features sintéticas de mindinho/polegar abertos, I e Y pontuam 1 e a escolha é I. | Cobertura nominal não garante distinção entre letras. Empate reproduzido; frequência real de confusão e conflito com J/Z não medida. Preservar comportamento agora; planejar evidências na FASE 05 e avaliação pedagógica/experimental nas FASES 06/07. |

## Achados médios

| ID | Diagnóstico e evidência | Impacto e encaminhamento |
| --- | --- | --- |
| M01 | `vision.js` configura `numHands: 1` e `splitHandsByRole()` retorna sempre `left: null`, ignorando handedness. `CONFIG.REQUIRE_LEFT_HAND` é falso, mas `index.html`/`UI._renderHandsStatus()` exibem papéis de duas mãos. | Painel pode induzir erro; ativar somente a flag bloqueia confirmação. Decidir contrato de uma/duas mãos antes de mudar configuração. |
| M02 | [style.css](../css/style.css) usa `object-fit: cover` no vídeo; Canvas e cursor projetam coordenadas diretamente para largura/altura, sem compensar recorte. | Há divergência geométrica quando a proporção da tela difere da câmera. Desalinhamento visual precisa de teste real em diferentes proporções; resolver em fase autorizada. |
| M03 | Inferência, desenho, reconhecimento e DOM estão na thread principal; há objetos, eventos, arrays e JSON, consultas de geometria e reflow em feedback. | FASE 01 mede cenários com/sem diagnóstico, remove limpeza/reset redundantes e o `shift` da telemetria. Worker clássico foi viável no protótipo, mas não integrado; rVFC reduziu amostragem. CPU/RAM total e desempenho com mãos permanecem sem homologação. |
| M04 | `Game._startTimer()` subtrai 100 ms por callback em vez de usar tempo decorrido. `bestStreak` é zerado apenas no construtor, não em `startPractice()`/`startWord()`. Persistência de sequência entre sessões reproduzida. | Cronômetro pode atrasar sob bloqueio/suspensão; estatística de sessão pode herdar a anterior. FASES 02/05: testes de relógio e reinício. |
| M05 | Na base auditada, `startCamera()` não aguardava `video.play()` nem limitava a espera por `loadeddata`. O import remoto é estático e há apenas delegate GPU. | **Parcialmente tratado na FASE 02:** espera por dados com limite de 10 s, aguarda `play()` e permite tentar novamente. Import remoto, ausência de fallback GPU/CPU e compatibilidade entre navegadores continuam pendentes. |
| M06 | [index.html](../index.html) contém jogador/ranking; `ui.js` altera nome no HUD e alterna classes, mas não preenche ranking, datas, abas ou jogador/jogo dos resultados. `style.css` não define estilos para `.rankings` e `.player-modal`. | Fluxo parcial; botões não comprovam ranking funcional. `Game`/`ForcaGame` mantêm rodadas indefinidas e só emitem `sessionend` via `end()`; a saída da UI suprime resultados. Rever contrato antes de implementar fluxo de término ou ranking. |
| M07 | Cartões são `div[tabindex]` com handlers de clique, sem Enter/Espaço. Níveis são `span`; fechar guia/ranking são `div`. Não há semântica de diálogo, contenção/retorno de foco, `aria-live` ou redução de movimento. | Navegação só por teclado/leitor de tela está incompleta. FASE 07: avaliar fluxo completo e contraste real; não declarar conformidade. |
| M08 | `html/body` e `.stage` ocultam overflow, cartões empilham em telas pequenas, palavra de Soletrar não quebra linha e parte das medidas é fixa. | Risco de conteúdo cortado com telas pequenas/zoom/palavras longas; precisa de verificação visual. FASE 07: testar larguras, alturas e zoom, preservando o tema. |
| M09 | Os motores acessam `localStorage` sem tratamento; `Game` e `ForcaGame` dependem de `data.js`, que importa `libras.js`, que importa `vision.js` e seu CDN. `app.js` chama método interno de UI e UI consulta `_snapshot()` dos motores. | Indisponibilidade de armazenamento pode impedir boot/finalização; testes isolados precisam substituir fronteiras. FASES 02/04: tratar erro e revisar contratos antes de separar módulos. |
| M10 | As palavras não são filtradas por `LETTERS[letra].difficulty`: 11 de 13 palavras do nível 1 têm letras de dificuldade maior que 1; 6 de 21 do nível 2 têm letras acima de 2. Todas as 90 palavras têm caracteres nominais válidos e dica. | Inconsistência com a antiga explicação de níveis homogêneos; não é ausência de letras no classificador. Confirmar intenção pedagógica antes de alterar bancos/dificuldades. |
| M11 | Na base auditada, `resetHold()` não limpava histórico de movimento/navegação entre telas. Guia e overlays ainda têm interações próprias. | **Parcialmente tratado na FASE 02:** `resetTracking()` limpa gestos na troca de tela e na pausa. Guia, overlays e transições com J/Z exigem validação adicional nas FASES 05/07. |

## Achados baixos e documentação corrigida

| ID | Evidência | Tratamento nesta fase |
| --- | --- | --- |
| B01 | README descrevia dois modos, 11 letras, hold aproximado de 0,7 s, seleção de nível por gesto e saída somente explícita; prometia compatibilidade/cache e comparava precisão sem evidência. Comentários anunciavam ausência de alocação/ganhos garantidos. | README reescrito a partir do código; comentários técnicos corrigidos sem mudar lógica. As garantias não verificadas foram removidas. |
| B02 | README declarava MIT, mas `git ls-files` não contém `LICENSE`; `UI._bindGestureNav()` escuta evento legado sem emissor no app atual. | Registrar licença para decisão do mantenedor e listener como dívida de manutenção. Não adicionar licença nem remover código nesta fase. |

## Recursos e desempenho: registro histórico da FASE 00

O stream fica em `video.srcObject`; o modelo e identificador de rAF ficam no módulo de visão. Um histórico guarda no máximo 20 timestamps. Trajetórias são podadas por janela de tempo (J/Z: 1.300 ms; navegação: 700 ms), sem limite fixo de quantidade independente da frequência. Não há evidência de crescimento ilimitado desses buffers no fluxo normal. Os listeners vivem durante a página, sem método de descarte; timeouts de avanço não são cancelados. O toast cancela o timeout anterior; os motores cancelam o intervalo do cronômetro.

Canvas interno 640×480, restrições de captura reduzidas, detecção apenas com `currentTime` novo, intervalo de 50 ms, desenho agrupado de conexões e caches parciais de UI já existem. Nada foi otimizado na FASE 00. CPU/RAM, latência média/p95, tarefas longas e impacto de resolução continuam sem baseline. As simulações de FPS não são benchmark de hardware.

## Plano técnico — FASE 01 executada; demais não iniciadas

Cada fase depende da conclusão/revisão da anterior e de autorização explícita. As ações abaixo delimitam investigação e aceite; detalhes de implementação e testes devem ser definidos a partir da baseline, sem decisões antecipadas de framework, Worker ou modelo.

| Fase | Arquivos/camadas prováveis | Trabalho e critério de aceite |
| --- | --- | --- |
| 01 — CPU, RAM e inferência | `vision.js`, `app.js` e testes/documentação | Implementada e verificada automaticamente: FPS/latências, buffers limitados, cadeia única, Canvas, baseline por modo/menu/diagnóstico e avaliação rVFC/Worker. Resolução preservada. Ver relatório para números e limites: sem CPU/RAM total ou homologação de precisão por webcam. |
| 02 — Ciclo de vida | `vision.js`, `app.js`, `game.js`, `forca.js`, `ui.js` | Implementação integrada no diretório de trabalho e testes sintéticos executados; Política em [Fase 02 — câmera e recursos](fase-02-camera-recursos.md). Falha de import remoto e validação com webcam real continuam pendentes. |
| 03 — TypeScript gradual | Módulos `js/` e configuração a propor | Avaliar TypeScript/Vite, mapear tipos de landmarks, eventos, dados e estados. Migrar em passos pequenos, preservando execução e distribuição estática. Aceite: checks rigorosos reais documentados, sem substituição desnecessária da interface. |
| 04 — Arquitetura | Fronteiras visão/reconhecimento/dados/jogos/UI | Reduzir dependência transitiva de dados para CDN, chamadas de métodos internos e responsabilidades misturadas, conforme benefício demonstrado. Aceite: contratos explícitos e componentes testáveis, sem complexidade gratuita. |
| 05 — Qualidade | Regras, estados, relógios, eventos e UI | Instituir suíte proporcional com dados, classificação sintética, empate/ambiguidade, hold/J/Z, pontuação, progressão, reinício, timeout, erros e integração dos três modos. Aceite: comandos reproduzíveis e separação clara entre testes automáticos e webcam real. |
| 06 — Pesquisa Python | Experimentos separados, documentação e futuro contrato de exportação | Definir coleta consentida, rótulos, normalização, divisão por participante/sessão, matriz de confusão e comparação estático/temporal. Avaliar formato viável no navegador. Aceite: protocolo e resultados rastreáveis; nenhum backend ou coleta automática presumidos. |
| 07 — Acessibilidade e experiência | `index.html`, `style.css`, `ui.js`, conteúdo pedagógico | Validar teclado, foco, leitor de tela, touch, câmera, erros, contraste, zoom e redução de movimento; resolver inconsistências de painéis conforme contrato. Aceite: matriz manual documentada e validação especializada para alterações pedagógicas. |
| 08 — Validação final | Aplicação e documentação | Reexecutar cenários e métricas comparáveis à baseline; revisar dependências, testes, docs e limites. Aceite: diferenças demonstradas, limitações honestas e três modos preservados. |

## Riscos e encerramento

A FASE 00 não corrigiu achados funcionais; a FASE 01 tratou desempenho e a FASE 02 tratou ciclo de recursos e atrasos de rodada nos cenários sintéticos. Os testes e métricas controladas não substituem homologação de webcam/compatibilidade. Permanecem riscos de import remoto, interface, reconhecimento e comportamento em hardware real.

Próximo passo: revisar a integração da FASE 02 e validar os cenários com webcam.
