# FASE 00 — Auditoria e roteiro técnico

**Atualização até a FASE 02.1:** FPS corrigido, loop/Canvas otimizados e comparação controlada da FASE 01 executada ([relatório](performance/FASE01.md)). O ciclo de câmera, modelo e sessões da FASE 02 está no commit `fb22e89`. A FASE 02.1 trata falhas de armazenamento e a melhor sequência herdada, com testes sintéticos. As tabelas abaixo preservam o diagnóstico histórico da FASE 00.

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
| M04 | Na base auditada, `Game._startTimer()` subtrai 100 ms por callback em vez de usar tempo decorrido; `bestStreak` era zerado apenas no construtor. A sequência herdada foi reproduzida. | **Sequência corrigida na FASE 02.1:** `startPractice()` e `startWord()` zeram `bestStreak`; testes verificam snapshots e resultados. O cronômetro ainda pode atrasar sob bloqueio/suspensão e permanece para fase autorizada. |
| M05 | Na base auditada, `startCamera()` não aguardava `video.play()` nem limitava a espera por `loadeddata`. O import remoto é estático e há apenas delegate GPU. | **Parcialmente tratado na FASE 02:** espera por dados com limite de 10 s, aguarda `play()` e permite tentar novamente. Import remoto, ausência de fallback GPU/CPU e compatibilidade entre navegadores continuam pendentes. |
| M06 | [index.html](../index.html) contém jogador/ranking; `ui.js` altera nome no HUD e alterna classes, mas não preenche ranking, datas, abas ou jogador/jogo dos resultados. `style.css` não define estilos para `.rankings` e `.player-modal`. | Fluxo parcial; botões não comprovam ranking funcional. `Game`/`ForcaGame` mantêm rodadas indefinidas e só emitem `sessionend` via `end()`; a saída da UI suprime resultados. Rever contrato antes de implementar fluxo de término ou ranking. |
| M07 | Cartões são `div[tabindex]` com handlers de clique, sem Enter/Espaço. Na FASE 03.1.3, os níveis do Treino passaram a botões; os de Soletrar/Forca continuam `span`. Fechar guia/ranking continua em `div`. Não há semântica de diálogo, contenção/retorno de foco ou redução de movimento. | Navegação só por teclado/leitor de tela está incompleta. FASE 07: avaliar fluxo completo e contraste real; não declarar conformidade. |
| M08 | `html/body` e `.stage` ocultam overflow, cartões empilham em telas pequenas, palavra de Soletrar não quebra linha e parte das medidas é fixa. | Risco de conteúdo cortado com telas pequenas/zoom/palavras longas; precisa de verificação visual. FASE 07: testar larguras, alturas e zoom, preservando o tema. |
| M09 | Na base auditada, os motores acessavam `localStorage` sem tratamento. `Game` e `ForcaGame` ainda dependem de `data.js`, que importa `libras.js`, que importa `vision.js` e seu CDN. `app.js` chama método interno de UI e UI consulta `_snapshot()` dos motores. | **Armazenamento tratado na FASE 02.1:** falhas de leitura/escrita são registradas sem impedir `sessionend` ou retorno ao menu; recordes em memória são conciliados e a gravação é tentada novamente. Acoplamentos restantes seguem para a FASE 04; testes isolados ainda substituem a fronteira do CDN. |
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

## Plano técnico — FASES 01 a 03.2 implementadas em seus respectivos worktrees

Cada fase depende da conclusão/revisão da anterior e de autorização explícita. As ações abaixo delimitam investigação e aceite; detalhes de implementação e testes devem ser definidos a partir da baseline, sem decisões antecipadas de framework, Worker ou modelo.

| Fase | Arquivos/camadas prováveis | Trabalho e critério de aceite |
| --- | --- | --- |
| 01 — CPU, RAM e inferência | `vision.js`, `app.js` e testes/documentação | Implementada e verificada automaticamente: FPS/latências, buffers limitados, cadeia única, Canvas, baseline por modo/menu/diagnóstico e avaliação rVFC/Worker. Resolução preservada. Ver relatório para números e limites: sem CPU/RAM total ou homologação de precisão por webcam. |
| 02 — Ciclo de vida | `vision.js`, `app.js`, `game.js`, `forca.js`, `ui.js` | Implementação integrada no diretório de trabalho e testes sintéticos executados; Política em [Fase 02 — câmera e recursos](fase-02-camera-recursos.md). Falha de import remoto e validação com webcam real continuam pendentes. |
| 03 — Cooldown e fluidez | `libras.js`, `ui.js`, testes/documentação | Implementado e verificado automaticamente: estados de confirmação e rearmamento sem interromper inferência, renderização ou navegação; três modos testados com relógio controlado. Homologação com webcam pendente. |
| 03.1 — Arbitragem estática/dinâmica | `libras.js`, testes de integração e documentação | Correção implementada e testada em cenários sintéticos: D/I com pequenos ajustes, D→Z/I→J, pose residual J→I/Z→D, trajetórias consecutivas e perda breve de landmarks. Nenhuma regra geométrica de outras letras foi recalibrada. Precisão e custos com webcam seguem pendentes. |
| 03.1.2 — Falso Z, I e navegação do Treino | `libras.js`, `game.js`, `ui.js`, HTML/CSS, testes e documentação | O falso Z de oscilação horizontal e o falso J sobre I foram reproduzidos e corrigidos em `update()` com critérios de progressão geométrica. O complemento oferece Treino A–Z sequencial, Anterior e seleção direta, sem pontuar ou alterar os níveis tradicionais. O relato de I com webcam ainda exige avaliação por letra; I/Y não foi recalibrado. Ver [decisão técnica](../specs/changes/2026-10-23-fase-0312-z-i-treino.md). |
| 03.2 — Observabilidade e Soletrar | `diagnostics.js`, `libras.js`, `app.js`, `ui.js`, motores e testes/documentação | Captura local opt-in, amostrada e limitada a 120 eventos; trilha da inferência até a decisão do jogo. A última letra da palavra agora é desenhada como concluída durante o avanço de 450 ms. Nenhuma regra geométrica ou duração de cronômetro foi alterada. Avaliação com webcam real e custo comparável pendentes. |
| 04 — Cronômetro | `game.js`, UI e testes/documentação | Rever a duração e a contagem do cronômetro do Soletrar considerando a espera inevitável entre letras. Ainda não iniciada; requer autorização própria. |
| 05 — Qualidade | Regras, estados, relógios, eventos e UI | Instituir suíte proporcional com dados, classificação sintética, empate/ambiguidade, hold/J/Z, pontuação, progressão, reinício, timeout, erros e integração dos três modos. Aceite: comandos reproduzíveis e separação clara entre testes automáticos e webcam real. |
| 06 — Pesquisa Python | Experimentos separados, documentação e futuro contrato de exportação | Definir coleta consentida, rótulos, normalização, divisão por participante/sessão, matriz de confusão e comparação estático/temporal. Avaliar formato viável no navegador. Aceite: protocolo e resultados rastreáveis; nenhum backend ou coleta automática presumidos. |
| 07 — Acessibilidade e experiência | `index.html`, `style.css`, `ui.js`, conteúdo pedagógico | Validar teclado, foco, leitor de tela, touch, câmera, erros, contraste, zoom e redução de movimento; resolver inconsistências de painéis conforme contrato. Aceite: matriz manual documentada e validação especializada para alterações pedagógicas. |
| 08 — Validação final | Aplicação e documentação | Reexecutar cenários e métricas comparáveis à baseline; revisar dependências, testes, docs e limites. Aceite: diferenças demonstradas, limitações honestas e três modos preservados. |

## Riscos e encerramento

A FASE 00 não corrigiu achados funcionais; a FASE 01 tratou desempenho, a FASE 02 tratou ciclo de recursos e atrasos de rodada, a FASE 02.1 tratou A-1/M-1 nos cenários sintéticos, e a FASE 03 tratou LIB-03/04 no fluxo temporal simulado. Os testes e métricas controladas não substituem homologação de webcam/compatibilidade. Permanecem riscos de import remoto, interface, reconhecimento e comportamento em hardware real.

O plano antigo de TypeScript gradual e reorganização arquitetural foi deslocado para decisões futuras sem número de fase; esta reordenação não autoriza sua implementação.

## Relatos da validação manual e encaminhamento da FASE 03

Os itens LIB-01 a LIB-06 foram relatados após teste manual com webcam. O relato descreve a experiência observada; não equivale a diagnóstico reproduzido com amostras, dispositivo e protocolo registrados.

| ID | Relato manual | Estado técnico e encaminhamento |
| --- | --- | --- |
| LIB-01 | E, S e M foram reconhecidas incorretamente. | Pendente de avaliação por letra com webcam e especialista; regras geométricas não alteradas na FASE 03. |
| LIB-02 | X foi difícil de identificar. | Pendente da mesma avaliação; regra não alterada. |
| LIB-03 | Não houve descanso adequado entre letras. | Causa confirmada no código: `resetHold()` após confirmação permitia reiniciar o mesmo hold e emitir novamente após 600 ms. FASE 03 introduz cooldown/rearmamento; efeito real pendente de webcam. |
| LIB-04 | A pausa da confirmação pareceu travar o jogo. | O fluxo auditado não parava webcam/rAF ao confirmar; hold repetido, avanço de rodada de 450 ms e ausência de estado visível tornam a espera ambígua. FASE 03 mantém processamento e adiciona feedback temporal. A sensação em uso real ainda precisa de reavaliação. |
| LIB-05 | Algumas letras não tiveram suporte funcional adequado. | Cobertura nominal A–Z não comprova uso confiável. Identificar letras e condições específicas em avaliação futura. |
| LIB-06 | Ainda são desejadas melhorias de CPU, RAM e fluidez. | Sem nova medição de CPU/RAM real; investigar com entrada e hardware comparáveis antes de otimizar. |

Após a FASE 03, o teste manual relatou desaparecimento da sensação de travamento, além de dificuldades com Y/M/S/E/R, Q e D e percepção de ausência de J/Z. O painel de candidata mostra apenas a classificação estática; J/Z constam do motor, do guia e dos bancos. Os demais relatos exigem amostras e avaliação por letra antes de atribuir causa. A auditoria pré-review reproduziu no código três caminhos da FASE 03: movimento parcial bloqueando D/I, D→Z/I→J sem rearmamento e confirmação residual J→I/Z→D. A [FASE 03.1](../specs/changes/2026-10-23-arbitragem-estatico-dinamico.md) corrigiu esses caminhos em testes sintéticos, sem alegar precisão com webcam.

Na revisão da FASE 03.1, foi reproduzido em `update()` um falso Z aos 350 ms durante oscilação horizontal de D com período de 300 ms e amplitude normalizada de 0,15. A FASE 03.1.2 acrescentou critérios de três traços e progressão vertical; testes sintéticos também reproduziram um falso J durante oscilação do mindinho e verificaram I estático até a UI/Treino. O relato de webcam de I detectado sem confirmação não traz série de candidatos, escore e fase temporal para identificar sua causa naquele dispositivo. I/Y pode alternar por competição de escore e permanece para a FASE 03.2, sem recalibração nesta entrega.

O teste manual do botão Próxima letra mostrou apenas A, B, I, L e V. Causa confirmada no código: o Treino começava no nível 1 e filtrava `LETTER_POOL` por dificuldade. O complemento da FASE 03.1.2 criou uma entrada A–Z distinta, com 26 letras nominais em ordem e navegação independente do acerto; os níveis 1–3 permanecem filtrados como antes. A disponibilidade de uma letra no Treino não comprova reconhecimento confiável com webcam real.

### FASE 03.1.3 — interface e relatos de webcam

O relato de desaparecimento de **Próxima letra** não corresponde à remoção do botão: ele permanece no HTML, mas a versão anterior o apresentava como um chip pequeno dentro do cartão e os testes criavam elementos simulados mesmo se faltassem no HTML. A causa exata da ausência percebida no navegador ainda requer reprodução visual no ambiente do usuário. A FASE 03.1.3 reforça sua hierarquia, mantém o controle no cartão acima do diagrama e permite rolagem. A ocultação de **Anterior** e **Escolher letra** nos níveis 1–3 foi confirmada na condição `practiceSet === 'all'` da UI e na rejeição de `-1`/letra pelo jogo; agora ambos aparecem em Treino ativo. Anterior fica desabilitado até haver histórico de uma segunda letra. O botão **Todas as letras** recebeu estado `aria-pressed`, destaque e área de toque; os níveis do Treino receberam botões e ação de início explícita.

Relatos mais recentes do usuário com webcam real, ainda sem contagem de tentativas, condições padronizadas ou taxas medidas:

| Estado relatado | Letras e observações |
| --- | --- |
| Funcionam nos testes relatados | A confirma de modo consistente; K é reconhecida normalmente; P tem identificação satisfatória. |
| Parcial | I é detectada, mas demora ou não confirma, sobretudo no Soletrar; L demora a confirmar; V confunde com K conforme a separação dos dedos; Q é detectada sem confirmação; G alterna entre confirmação e falha e confunde com T; O confunde com A/S e depende da orientação; H exige configuração pouco intuitiva da mão; X confunde com C. |
| Não funcionam adequadamente | Y, S, E, M, N e R. |

Esses são relatos históricos de uso, não diagnósticos geométricos confirmados. A FASE 03.2 acrescentou observabilidade do fluxo; não houve recalibração de reconhecimento.

### FASE 03.2 — relatos atuais e diagnóstico por camada

Relatos atuais do usuário com webcam real, sem número de tentativas nem taxa medida: **A** identifica e confirma consistentemente; **I** passou a detectar bem, mas sua confirmação consistente nos três modos ainda requer validação; **O** é identificada de frente, porém falha de lado ou confunde com A; **Y**, **S**, **E**, **M**, **N** e **R** não são identificadas. Permanecem os relatos anteriores de Q detectada sem confirmar, G/T, L demorada, V/K, X/C, H pouco intuitiva e necessidade de testar J/Z. A mudança relatada para I não comprova correção do classificador.

| Grupo | Fato verificável no código | Hipótese a medir com webcam |
| --- | --- | --- |
| I/Y | Y compartilha quatro componentes de I e acrescenta `thumbOut`. Com os cinco componentes ideais em 1, ambas pontuam 1; I vence pelo desempate na ordem das regras. Não há margem mínima entre primeiro e segundo lugar. | Frequência de empate ou alternância I/Y por pose, luz e orientação; momento da perda do hold. |
| O/A/S | O verifica três extensões e pinça com polegar, sem orientação explícita; A e S verificam configurações de punho/polegar. A maior média vence por frame. | O lateral perder para A/S e instabilidade de pinça/oclusão; nenhuma taxa foi medida. |
| E/M/N/R | Regras existem e compartilham sinais de curvatura, extensão e posição fina do polegar; R usa distância de dedos cruzados. | Oclusão do polegar e pequena margem de escore fazendo outra candidata vencer ou ficar abaixo de 0,55. |
| V/K | Ambas exigem indicador/médio estendidos e separados; posição do polegar e orientação distinguem K. | Transições de separação e orientação gerando empate ou troca de candidata. |
| G/T | G depende de ângulo/orientação do indicador e polegar; T usa curvatura/polegar entre dedos. | Variação de orientação, oclusão e escores de regras parciais. |
| X/C | X usa curvatura do indicador; C combina curvatura dos quatro dedos. | Outras curvaturas elevarem C ou a candidata oscilar durante 600 ms. |

As regras acima são aproximações geométricas nominais. `splitHandsByRole()` usa a primeira mão sem lateralidade, e a interface não demonstra precisão. Escores heurísticos não são probabilidades. O diagnóstico amostrado mostra vencedora, segunda colocada, diferença, fase, tempo e motivo, mas não guarda landmarks nem permite reconstruir uma pose. A coleta começa desligada e o usuário a ativa localmente. A calibração exige protocolo com webcam, condições e rótulos consentidos; não alterar os limiares a partir de um único relato.

No Soletrar, testes com relógio controlado confirmaram seleção de palavras por nível, letra esperada, roteamento de `signconfirmed`, erros, repetição mediante liberação, pausa/retomada, timeout, cancelamento de avanço e troca de modo. Confirmou-se um defeito visual: `wordcomplete` não redesenhava a última letra como concluída durante os 450 ms antes da próxima palavra; a UI passou a renderizar o alvo nesse evento. `Game.handleSign()` agora devolve motivos verificáveis para `no_session`, `paused`, `round_transition`, `wrong_letter` e `accepted`, sem mudar pontuação ou eventos. Uma confirmação durante o atraso de avanço é rejeitada deliberadamente. O cronômetro por letra continua durante cooldown; um erro confirmado perto do fim pode ser seguido de timeout ainda nessa fase. A duração fica fora desta entrega.

Próximo passo recomendado: executar protocolo de webcam por letra e modo, com séries de tentativa, candidata, escore, confirmação, resposta do jogo, orientação/distância e CPU/RAM comparáveis; priorizar o empate estrutural I/Y e grupos não identificados. J/Z e possíveis custos da captura ligada também exigem medição. Não iniciar a FASE 04 sem autorização.

Protocolo proposto para a próxima avaliação manual: registrar dispositivo, navegador, iluminação, mão usada, distância e orientação; tentar cada letra repetidamente em Treino A–Z e uma amostra representativa no Soletrar/Forca. Para cada tentativa, anotar se houve mão válida, candidata e segunda colocada, tempo até confirmação, evento e decisão do jogo; contar detecções, confirmações, rejeições, falsos positivos e confusões por letra. Separar posição frontal/lateral e distância curta/média, repetir J/Z em velocidades distintas e duas letras iguais com liberação. Medir CPU/RAM e taxa de inferência em janelas contínuas com diagnóstico desligado e ligado, no mesmo hardware/entrada, distinguindo aba, GPU e captura compartilhada. Guardar somente contagens e eventos escalares; qualquer coleta de landmarks/imagens exige consentimento e protocolo próprio. Nenhuma dessas medições foi realizada nesta fase.
