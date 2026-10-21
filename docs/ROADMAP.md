# FASE 00 — Auditoria e roteiro técnico

**Atualização da FASE 01:** FPS corrigido, loop/Canvas otimizados e comparação controlada executada. [Relatório, métricas, testes e riscos](performance/FASE01.md). As tabelas abaixo preservam o diagnóstico da FASE 00; o estado posterior de A01, A03 e M03 está indicado. Nenhuma FASE 02 foi iniciada.

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
| A02 | `detectForVideo()` e `onResults()` rodam antes do próximo agendamento de rAF, sem `try/catch`. Exceção simulada deixa zero callbacks pendentes. O `catch` de `boot()` em [app.js](../js/app.js) não cobre os frames posteriores. | O reconhecimento pode parar sem mensagem de recuperação. FASE 02: estado de erro e recuperação, incluindo falha de callback. |
| A03 | `startCamera()` associa o stream ao vídeo; não há `track.stop()` ou `handLandmarker.close()` na aplicação. `stopDetectionLoop()` não é usado pelo app ao sair. Falta política de visibilidade. | FASE 01 impede duplicação/reagendamento de cadeias de inferência; o ciclo completo continua pendente. Câmera permanece no menu; não houve medição de vazamento crescente. FASE 02: política de menu/pausa e proprietário de cada recurso. |
| A04 | [game.js](../js/game.js) agenda avanços com timeouts sem guardar handles; `end()` cancela apenas o intervalo. Os callbacks comparam o modo, não a identidade da sessão. Reprodução: acertar no Treino, sair, reiniciar Treino e executar o callback antigo avança a nova rodada. [forca.js](../js/forca.js) também guarda apenas o status no callback, com risco análogo condicionado ao estado. | Uma sessão pode receber efeitos de outra. FASE 02: cancelamento e identidade de sessão; reproduzir também vitória/derrota da Forca e timeout de Soletrar. |
| A05 | Em [libras.js](../js/libras.js), `_trackHold()` roda antes de `_trackMotionSigns()` e pode confirmar a pose-base enquanto J/Z acumulam trajetória. `classify()` escolhe o primeiro maior escore sem margem entre candidatos. Com features sintéticas de mindinho/polegar abertos, I e Y pontuam 1 e a escolha é I. | Cobertura nominal não garante distinção entre letras. Empate reproduzido; frequência real de confusão e conflito com J/Z não medida. Preservar comportamento agora; planejar evidências na FASE 05 e avaliação pedagógica/experimental nas FASES 06/07. |

## Achados médios

| ID | Diagnóstico e evidência | Impacto e encaminhamento |
| --- | --- | --- |
| M01 | `vision.js` configura `numHands: 1` e `splitHandsByRole()` retorna sempre `left: null`, ignorando handedness. `CONFIG.REQUIRE_LEFT_HAND` é falso, mas `index.html`/`UI._renderHandsStatus()` exibem papéis de duas mãos. | Painel pode induzir erro; ativar somente a flag bloqueia confirmação. Decidir contrato de uma/duas mãos antes de mudar configuração. |
| M02 | [style.css](../css/style.css) usa `object-fit: cover` no vídeo; Canvas e cursor projetam coordenadas diretamente para largura/altura, sem compensar recorte. | Há divergência geométrica quando a proporção da tela difere da câmera. Desalinhamento visual precisa de teste real em diferentes proporções; resolver em fase autorizada. |
| M03 | Inferência, desenho, reconhecimento e DOM estão na thread principal; há objetos, eventos, arrays e JSON, consultas de geometria e reflow em feedback. | FASE 01 mede cenários com/sem diagnóstico, remove limpeza/reset redundantes e o `shift` da telemetria. Worker clássico foi viável no protótipo, mas não integrado; rVFC reduziu amostragem. CPU/RAM total e desempenho com mãos permanecem sem homologação. |
| M04 | `Game._startTimer()` subtrai 100 ms por callback em vez de usar tempo decorrido. `bestStreak` é zerado apenas no construtor, não em `startPractice()`/`startWord()`. Persistência de sequência entre sessões reproduzida. | Cronômetro pode atrasar sob bloqueio/suspensão; estatística de sessão pode herdar a anterior. FASES 02/05: testes de relógio e reinício. |
| M05 | `startCamera()` não aguarda/rejeita `video.play()` nem limita a espera por `loadeddata`. Só há delegate GPU, sem fallback explícito. O import remoto é estático e ocorre antes de `boot()`. | Algumas falhas podem deixar carregamento parado ou ocorrer antes da tela de erro. FASE 02: testar câmera negada/ausente/ocupada, falha do modelo, rede e reprodução. Compatibilidade ainda não validada. |
| M06 | [index.html](../index.html) contém jogador/ranking; `ui.js` altera nome no HUD e alterna classes, mas não preenche ranking, datas, abas ou jogador/jogo dos resultados. `style.css` não define estilos para `.rankings` e `.player-modal`. | Fluxo parcial; botões não comprovam ranking funcional. `Game`/`ForcaGame` mantêm rodadas indefinidas e só emitem `sessionend` via `end()`; a saída da UI suprime resultados. Rever contrato antes de implementar fluxo de término ou ranking. |
| M07 | Cartões são `div[tabindex]` com handlers de clique, sem Enter/Espaço. Níveis são `span`; fechar guia/ranking são `div`. Não há semântica de diálogo, contenção/retorno de foco, `aria-live` ou redução de movimento. | Navegação só por teclado/leitor de tela está incompleta. FASE 07: avaliar fluxo completo e contraste real; não declarar conformidade. |
| M08 | `html/body` e `.stage` ocultam overflow, cartões empilham em telas pequenas, palavra de Soletrar não quebra linha e parte das medidas é fixa. | Risco de conteúdo cortado com telas pequenas/zoom/palavras longas; precisa de verificação visual. FASE 07: testar larguras, alturas e zoom, preservando o tema. |
| M09 | Os motores acessam `localStorage` sem tratamento; `Game` e `ForcaGame` dependem de `data.js`, que importa `libras.js`, que importa `vision.js` e seu CDN. `app.js` chama método interno de UI e UI consulta `_snapshot()` dos motores. | Indisponibilidade de armazenamento pode impedir boot/finalização; testes isolados precisam substituir fronteiras. FASES 02/04: tratar erro e revisar contratos antes de separar módulos. |
| M10 | As palavras não são filtradas por `LETTERS[letra].difficulty`: 11 de 13 palavras do nível 1 têm letras de dificuldade maior que 1; 6 de 21 do nível 2 têm letras acima de 2. Todas as 90 palavras têm caracteres nominais válidos e dica. | Inconsistência com a antiga explicação de níveis homogêneos; não é ausência de letras no classificador. Confirmar intenção pedagógica antes de alterar bancos/dificuldades. |
| M11 | `resetHold()` não limpa histórico de movimento/navegação. UI o chama em novas rodadas; abrir guia não interrompe timer nem encaminhamento de sinais, e navegação por gesto não verifica overlays antes de ativar cartão. | Possível influência de uma rodada/overlay em outra interação. Precisa de testes de transição, sobretudo durante J/Z; FASES 02/05/07 conforme autorização. |

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
| 02 — Ciclo de vida | `vision.js`, `app.js`, `game.js`, `forca.js`, `ui.js` | Definir política de câmera no menu/aba oculta; tratar início/erro/pausa/retomada/descarte, timeouts e sessão. Cobrir câmera negada/ausente, falha de import/modelo/GPU, play rejeitado, início repetido e callbacks antigos. Aceite: propriedade clara de cada recurso e ausência de efeitos após encerramento nos cenários verificados. |
| 03 — TypeScript gradual | Módulos `js/` e configuração a propor | Avaliar TypeScript/Vite, mapear tipos de landmarks, eventos, dados e estados. Migrar em passos pequenos, preservando execução e distribuição estática. Aceite: checks rigorosos reais documentados, sem substituição desnecessária da interface. |
| 04 — Arquitetura | Fronteiras visão/reconhecimento/dados/jogos/UI | Reduzir dependência transitiva de dados para CDN, chamadas de métodos internos e responsabilidades misturadas, conforme benefício demonstrado. Aceite: contratos explícitos e componentes testáveis, sem complexidade gratuita. |
| 05 — Qualidade | Regras, estados, relógios, eventos e UI | Instituir suíte proporcional com dados, classificação sintética, empate/ambiguidade, hold/J/Z, pontuação, progressão, reinício, timeout, erros e integração dos três modos. Aceite: comandos reproduzíveis e separação clara entre testes automáticos e webcam real. |
| 06 — Pesquisa Python | Experimentos separados, documentação e futuro contrato de exportação | Definir coleta consentida, rótulos, normalização, divisão por participante/sessão, matriz de confusão e comparação estático/temporal. Avaliar formato viável no navegador. Aceite: protocolo e resultados rastreáveis; nenhum backend ou coleta automática presumidos. |
| 07 — Acessibilidade e experiência | `index.html`, `style.css`, `ui.js`, conteúdo pedagógico | Validar teclado, foco, leitor de tela, touch, câmera, erros, contraste, zoom e redução de movimento; resolver inconsistências de painéis conforme contrato. Aceite: matriz manual documentada e validação especializada para alterações pedagógicas. |
| 08 — Validação final | Aplicação e documentação | Reexecutar cenários e métricas comparáveis à baseline; revisar dependências, testes, docs e limites. Aceite: diferenças demonstradas, limitações honestas e três modos preservados. |

## Riscos e encerramento

A FASE 00 não corrigiu achados funcionais; a FASE 01 tratou somente os itens indicados acima. Os testes e métricas controladas não substituem homologação de webcam/compatibilidade. Permanecem os riscos de recursos/sessões, interface e reconhecimento identificados na auditoria.

Próximo passo: **aguardar autorização para FASE 02**. Não executar commit, push, PR ou merge como parte deste encerramento.
