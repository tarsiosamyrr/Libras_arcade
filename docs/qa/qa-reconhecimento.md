# QA do reconhecimento — FASE 03.3A a 03.3B-1.2

**Inspeção:** 24/10/2026, branch `feat/fase-03-cooldown`, commit-base `2f565a6`. Esta é uma auditoria de regras e de relatos do usuário; não houve captura de webcam nesta execução. A–Z estão nominalmente em `SUPPORTED_LETTERS`, `LETTERS` e `LETTER_POOL`; `J` e `Z` usam trajetórias. Disponibilidade não significa reconhecimento ou confirmação homologados.

**Atualização 03.3B-1:** o [relatório de 16 diagnósticos, 15 únicos](Libras_Arcade_Analise_Diagnosticos_Fase_03_3B.md) contém confirmações de J quando I era esperado e empates A/O em escore máximo. Os arquivos individuais e landmarks não estão disponíveis neste worktree. A [mudança localizada em J](../../specs/changes/2026-10-24-fase-033b1-j-oa.md) foi reproduzida e verificada sinteticamente; a eficácia com webcam ainda precisa de nova coleta rotulada.

**Atualização 03.3B-1.2:** o [resumo de 12 buffers reais](Libras_Arcade_Analise_12_Logs_24-10-2026.md) registra falsos J para I, confusão O/A por mão e orientação relatadas, V para P e B/F para C. O arquivo consolidado está disponível; os 12 JSON e seus landmarks não estão neste worktree. Contagens de eventos dentro dos buffers não são taxas por tentativa. A nova condição geométrica de J rejeita um traço lateral sintético, mas sua eficácia na webcam ainda não foi medida. A [captura escalar rotulada](../../specs/changes/2026-10-24-fase-033b12-j-calibracao.md) permanece opcional e local.

## Como ler a evidência

- **Código**: condição verificável nos módulos. **Sintético**: comportamento reproduzido por fixtures/relógio, sem estimar precisão de webcam. **Relato**: observação do usuário com webcam, sem contagem padronizada. **Pendente**: sem trilha suficiente para localizar a perda.
- “Detectar” abaixo significa exibir uma candidata estática; não prova que passou pelo limiar, sustentou 600 ms ou gerou `signconfirmed`. “Confirmar” significa emissão desse evento, ainda sujeita à decisão do modo.
- Todas as regras estáticas usam a média simples de seus componentes `fuzzyOn`, `fuzzyOff` ou `fuzzyBand`, cada um entre 0 e 1. A maior média vence, sem margem mínima; empate conserva a regra anterior na ordem de `RULES`. `MIN_SCORE = 0,55` decide a elegibilidade. O hold exige 600 ms; cooldown 900 ms e rearmamento exigem liberação por 250 ms ou mudança de outra letra por 300 ms. Esses tempos não foram recalibrados aqui.

## Matriz A–Z de validação

“Disponível” significa cadastro nominal no motor e no Treino completo, com regra estática salvo J/Z; **confirmação = não homologada** salvo observação qualitativa expressa. “Sem relato individual recente” não afirma que a letra funcionou: a última avaliação só disse que as demais foram satisfatórias em geral.

| Letra | Disponível | Motor | Reconhecimento relatado | Confirmação relatada / problema | Evidência | Próxima verificação |
| --- | --- | --- | --- | --- | --- | --- |
| A | Sim | Estático | Consistente | Consistente; compete com O/S | Relato recente; testes sintéticos | Baseline frontal/lateral no Soletrar |
| B | Sim | Estático | Venceu C em tentativas do Soletrar | Duas decisões B→C incorretas no buffer | Resumo de webcam; código | Comparar extensão e curvatura com C rotulado |
| C | Sim | Estático | Não confirmou na janela do ensaio C | B e F venceram; dica e regra de polegar divergem | Resumo de webcam; código | Validar guia com especialista e medir C/B/F por orientação |
| D | Sim | Estático | Sem relato individual recente | Pose-base de Z; defeitos temporais anteriores corrigidos sinteticamente | Código e testes | D parado e D→Z na webcam |
| E | Sim | Estático | Não identificada | Sem confirmação confiável relatada | Relato recente | Escores E/S/M/N/T e oclusão do polegar |
| F | Sim | Estático | Sem relato individual recente | Não homologada | Cadastro/código | Medir candidata e evento |
| G | Sim | Estático | Aceito quando o usuário apontou lateralmente; G/T alternaram em outros frames | Hold pode reiniciar; sem taxa medida | Resumo de webcam; código | Escores G/T, ângulo projetado e `hold_reset` rotulados |
| H | Sim | Estático | Pose percebida como pouco intuitiva | Não homologada | Relato anterior | Comparar H/U/R lateral/frontal |
| I | Sim | Estático | Imóvel aceito; oscilação ainda pode gerar J | Anexos 2/9/11 contêm J incorretos com I esperado; empate estrutural com Y | Dois resumos reais; código e fixtures | Repetir I/J rotulados após a nova condição de gancho |
| J | Sim | Dinâmico | Quatro aceitações no buffer lento e quatro no rápido/curto | Falsos J persistiram para I antes da 03.3B-1.2; precisão não homologada | Resumo real; trajetórias sintéticas | Medir falso J e perda de J verdadeiro por tentativa |
| K | Sim | Estático | Funcionamento satisfatório relatado anteriormente | Não homologada estatisticamente | Relato anterior | Comparar V/K por abertura |
| L | Sim | Estático | Detectada anteriormente | Demora para confirmar | Relato anterior | `hold_reset` e tempo até evento |
| M | Sim | Estático | Não identificada | Sem confirmação confiável relatada | Relato recente | Escores M/N/S/A por polegar |
| N | Sim | Estático | Não identificada | Sem confirmação confiável relatada | Relato recente | Escores N/M/T/A por polegar |
| O | Sim | Estático | Frente esquerda: O e A; frente direita: O; lateral: A venceu na janela | Empate A/O em 1,00 e A incorreto no Soletrar | Resumo real; empate sintético | Coletar features O/A/S/C por mão física e orientação |
| P | Sim | Estático | P foi segunda candidata em frames do Soletrar | Duas decisões V→P incorretas no buffer | Resumo real; código | Medir P/V/K com mão para baixo e variantes validadas |
| Q | Sim | Estático | Detectada anteriormente | Pode não confirmar | Relato anterior | Limiar, hold, Q/G por orientação |
| R | Sim | Estático | Não identificada | Sem confirmação confiável relatada | Relato recente | Cruzamento R/U/H/V e oclusão |
| S | Sim | Estático | Não identificada | Sem confirmação confiável relatada | Relato recente | Escores S/E/M/A/O |
| T | Sim | Estático | Competiu com G em frames do ensaio | Alternância pode reiniciar hold | Resumo real; código | Escores G/T e orientação por tentativa |
| U | Sim | Estático | Sem relato individual recente | Não homologada | Cadastro/código | U/R/H com mão vertical/lateral |
| V | Sim | Estático | Confirmou quando P era esperado | V não testa orientação e pode chegar a 1 apontando para baixo | Resumo real; código e fixture | Validar variantes V com especialista antes de impor direção |
| W | Sim | Estático | Sem relato individual recente | Não homologada | Cadastro/código | Medir candidata e evento |
| X | Sim | Estático | Gancho claro e orientação lateral necessários; C/D competem | Intermitente | Relato recente | X/C/D frontal/lateral e hold |
| Y | Sim | Estático | Falha histórica; avaliação recente não individualizou Y | Não homologada; empate com I | Relato anterior; código/teste sintético | I/Y com polegar visível, duas mãos/orientações |
| Z | Sim | Dinâmico | Sem validação recente específica | Não homologada | Código e trajetórias sintéticas | Z lento/rápido após D |

## Matriz técnica dos grupos de confusão

Os valores abaixo são limiares de **componentes**, não limites de decisão da letra. `ext`: extensão de ponta a pulso menos base a pulso (fechado até 0,38; estendido desde 0,50). `curl`: razão de curvatura (gancho em 0,16–0,40; fechado desde 0,62, com rampa 0,40–0,62). Distâncias são normalizadas por pulso–base do médio. Projeção em 2D e oclusão podem alterar as features sem que uma regra contenha orientação explícita.

| Grupo/letra | Componentes de escore e limiares decisivos | Concorrência e interrupção possível |
| --- | --- | --- |
| E | Quatro `curl` fechados ≥0,62; `thumbMiddlePinch` afastado ≥0,67. | S usa as mesmas quatro curvas; M/N/T e A podem receber média alta. A hipótese de oclusão do polegar exige webcam. |
| S | Quatro `curl` fechados ≥0,62; `thumbAcross` próximo ≤0,42. | E difere pelo teste de polegar; punho A/M/N/T também compete. |
| M | `curl` de indicador/médio/anelar fechados; mindinho fechado (`ext` ≤0,38); `thumbPinkyMcp` próximo ≤0,28. | N/T/S/A compartilham punho; posição fina do polegar pode oscilar. |
| N | `curl` de indicador/médio fechados; anelar/mindinho fechados; `thumbRingMcp` ≤0,28 e `thumbPinkyMcp` ≥0,50. | M/T/S/A; dois testes do polegar podem sofrer oclusão. |
| T | `curl` de médio/anelar fechados, mindinho fechado e `thumbBetweenIM` ≤0,28. | N/M/S/A; G/T é relato, não empate demonstrado. Regra não exige indicador curvado. |
| R | Indicador/médio estendidos, anelar/mindinho fechados; `crossIM` ≤0,22. | U exige `crossIM` ≥0,42, H usa direção lateral, V separação; R não impõe orientação. |
| U | Dois dedos estendidos/juntos (`spreadIM` ≤0,22), anelar/mindinho fechados, `crossIM` ≥0,42 e `uprightScore`. | H troca por direção lateral; R por cruzamento; `uprightScore = 1 - sidewaysScore`, portanto também aceita direção para baixo. |
| V | Dois dedos estendidos/separados (`spreadIM` ≥0,34), demais fechados, `thumbBetweenIM` afastado ≥0,50. | K/P acrescentam direção cima/baixo como um entre sete componentes; V não impõe direção e pontua 1 em fixture sintética invertida. Impor orientação requer validar a variante pedagógica. |
| H | Dois dedos estendidos/juntos, demais fechados, `sidewaysScore(pointAngleIM)`. | U/R; direção lateral tem platô até 30° e zera a 90° de distância do alvo. |
| O | Indicador/médio/anelar com `ext` baixo (rampa 0,38–0,65); `thumbMiddlePinch` ≤0,42. | Não testa mindinho, `curl` nem orientação. A/S podem vencer por média; a pose lateral pode alterar distâncias projetadas. |
| A | Quatro `ext` fechados ≤0,38; `thumbOut` ≥0,315 (limiar específico reduzido). | O/S/E/M/N/T. Se O e A pontuarem igualmente, A vence por preceder O. |
| C | Quatro `curl` em 0,16–0,40; `thumbMiddlePinch` próximo ≤0,42. | X compartilha gancho do indicador e O também pede pinça próxima. A regra executável diverge da dica em `data.js`, que descreve o polegar sem tocar as pontas; requer revisão pedagógica posterior. |
| I | Indicador/médio/anelar fechados, mindinho estendido; nenhum teste do polegar. | Y usa os mesmos quatro componentes mais `thumbOut`; no ideal, I=Y=1 e I vence. J usa a pose-base e trajetória; movimento em curso suspende hold. |
| Y | Componentes de I mais `thumbOut` ≥0,45. | Pode perder por empate com I; não há margem mínima ou desempate específico. |
| J | Pose-base do mindinho com trajetória: ≥6 amostras, deslocamento ≥0,26, curva ≥35°, razão percurso/reta ≥1,15, avanço vertical ≥0,10, 3 passos descendentes de deriva lateral ≤0,25 da descida e retorno posterior com subida ≥0,03 e avanço lateral ≥0,06. | Um traço só descendente/lateral emitia falso J sintético antes da 03.3B-1.2; a correção não foi medida na webcam. Intervalo sem callbacks acima de 300 ms descarta o buffer. |
| X | `curlIndex` no gancho 0,16–0,40; médio/anelar/mindinho fechados. | Não exige polegar nem orientação; C se outros dedos parecerem curvos e D na transição para indicador reto. |
| D | Indicador estendido, demais fechados, `thumbMiddlePinch` ≤0,42. | Pose-base de Z; X com gancho parcial. Pequeno movimento não deve impedir o hold, conforme testes sintéticos da FASE 03.1. |

As regras de direção G/Q, K/P e H/U usam ângulo no plano da imagem; não há normalização de rotação da mão. `vision.js` configura `numHands: 1` e `splitHandsByRole()` usa a primeira mão como papel lógico `right`, sem usar handedness real. `REQUIRE_LEFT_HAND` permanece falso. A lateralidade física e o espelhamento não são avaliados pelo classificador; a direção projetada pode diferir entre mãos e câmeras. A classificação estática ocorre a cada resultado; segundo lugar é calculado só com diagnóstico ligado. Sem margem mínima, alternância de vencedora reinicia o hold; candidata abaixo de 0,55, movimento J/Z em preparação, cooldown e rearmamento também impedem confirmação.

### Diagnóstico dirigido dos pares na 03.3B-1.2

- **O/A:** A exige quatro extensões baixas e `thumbOut`; O exige três extensões baixas e `thumbMiddlePinch` próxima. As condições podem coexistir no platô 1,00. As regras não usam orientação ou handedness físico; rotação/espelhamento rígidos de uma fixture preservaram o empate, o que não reproduz oclusão ou diferenças reais de mão. A diferença frontal esquerda/direita e lateral dos buffers é observação de webcam, sem geometria para atribuir causa.
- **P/V/K:** V ignora `pointAngleIM` e pode pontuar 1 com dois dedos para baixo se o polegar estiver afastado. P/K incluem direção como um dos sete componentes; mesmo com direção totalmente contrária, os demais componentes podem render 6/7, acima de `MIN_SCORE`. A fixture positiva P/K usa polegar próximo; a negativa para P, polegar afastado e mão invertida, produz V. A dica de P descreve K para baixo; a dica de V não define orientação. Não foi criada regra universal de V para cima.
- **C/B/F:** B pontua extensão dos quatro dedos; C pontua curvatura intermediária dos quatro e pinça polegar–médio; F pontua extensão de médio/anelar/mindinho e pinça polegar–indicador. Extensão e curvatura não são mutuamente exclusivas no cálculo. Os anexos mostram B/F para alvo C, mas faltam valores de `ext`, `curl` e pinças para escolher limiares. A dica de C diz que o polegar não toca pontas, enquanto a regra exige pinça próxima: revisão especializada é necessária antes de alterar guia ou classificador.
- **G/T:** G inclui `sidewaysScore(pointAngleIndex)` como um de sete componentes; a dica pede indicador e polegar apontando de lado, coerente com esse componente. T não tem orientação. Mesmo sem pontuar a direção lateral, seis componentes ideais dariam G≈0,86, acima do limiar global; a orientação isolada não rejeita G. `sidewaysScore` aceita esquerda/direita na imagem, mas handedness físico não é fornecido ao motor. A alternância G/T pode reiniciar os 600 ms de hold; o buffer não contém os ângulos ou componentes para atribuir a oscilação a uma causa única.

### Tentativa rotulada com captura escalar opcional

1. Selecionar uma letra pretendida no Treino A–Z ou uma rodada conhecida do Soletrar. Anotar a **intenção** separadamente de `expected`, que é o alvo do jogo. Iniciar `startCalibration({ intendedLetter, physicalHand, orientation, distance, mirrored })` imediatamente antes de **uma** execução. A API rejeita rótulos ausentes/inválidos; as opções exatas e exemplo estão no [README](../../README.md#diagnóstico-voluntário-no-navegador). `physicalHand` e `mirrored` são declarações do avaliador, não saída do MediaPipe.
2. Encerrar com `stopCalibration()` e consultar o valor retornado ou `read().events`. A chamada para iniciar outra tentativa limpa o anel. Repetir em condições separadas: mão esquerda/direita, frente/oblíqua/lateral, distância perto/média/longe, I parado/com variações, J lento/rápido/curto, O/A, P/V/K, C/B/F e G/T. Registrar denominador de tentativas fora do buffer; várias amostras de `recognition` ou vários eventos na mesma tentativa não equivalem a tentativas independentes.
3. Comparar `calibration_start` e `recognition` com `scoreA`/`scoreO`, `scoreP`/`scoreV`/`scoreK`, `scoreC`/`scoreB`/`scoreF` ou `scoreG`/`scoreT`; ler `ext*`, `curl*`, distâncias de polegar e `pointAngle*`. Para J, `motion_geometry` fornece haste, subida/avanço do gancho, curva, percurso e duração somente quando há amostras suficientes; `shapeValid` não é confirmação. Seguir `signconfirmed` → `ui_received` → `game_decision`, inclusive motivo de rejeição. `elapsedMs` parte do início manual da captura.
4. Guardar somente um resumo escalar revisado pelo avaliador. O anel de 120 eventos reside na memória da aba e não é exportado, persistido ou transmitido automaticamente; `disable()` o apaga. O protocolo não recolhe imagens, vídeos nem landmarks completos. Um dataset biométrico precisaria de consentimento e retenção próprios. Comparar amostras de validação separadas das usadas para propor regras e incluir A/D/K/P, J/Z verdadeiros como controles.

## Observabilidade: o que a trilha distingue

| Pergunta | Evidência em `read().events` | Limite |
| --- | --- | --- |
| 1. Faltam landmarks? | `recognition.handPresent=false`, `reason=no_hand`; estrutura inválida gera `input_invalid`/`invalid_landmarks`. | Validade estrutural de 21 pontos e `x/y` finitos não comprova boa estimativa anatômica. |
| 2. Sem candidata elegível? | `candidateEligible=false`, `reason=below_threshold`, `score<0,55`. | `candidate` ainda nomeia a regra vencedora. |
| 3. Correta em segundo? | Comparar `second` com `expected` de `round_start`/`ui_target`; ler `secondScore` e `gap`. | Terceiro lugar e escores por regra não são guardados. |
| 4. Incorreta vencedora? | `candidate` diferente de `expected`; `game_decision.reason=wrong_letter` somente se for confirmada. | A candidata observada pode mudar entre amostras. |
| 5. Candidata oscila? | Sequência `recognition` e `hold_reset.reason=candidate_changed`. | Buffer de 120 entradas sobrescreve histórico; amostragem pode omitir flutuações breves. |
| 6. Hold interrompido? | `hold_reset`: `candidate_changed`, `candidate_lost`, `motion_preparing`; `stabilizingMs` reinicia. | Perda completa de mão chama `resetHold()` sem evento `hold_reset`; correlacionar com `no_hand`. |
| 7. Cooldown/rearmamento? | `phase`, `cooldownRemainingMs`, `reason=cooldown/wait_release/residual_base`. | Cronômetro do Soletrar continua ativo. |
| 8. Evento emitido? | `signconfirmed` com letra e `reason=emitted`. | Registro precede a emissão síncrona. |
| 9. Evento chegou ao modo? | `ui_received`, `screen`/`mode`. | É chegada à UI; `game_decision` comprova a chamada/decisão do motor. |
| 10. Aceito ou rejeitado? | `game_decision.accepted`, `reason`, `expected`, `wordIndex`, `round`; `ui_target.uiUpdated` após renderização do alvo. | `uiUpdated` confirma a chamada de renderização, não o resultado visual em navegador real. |

Os eventos têm timestamp monotônico `at` e contexto `mode/screen`, mas não possuem identificador de tentativa. Não atribuir eventos de tentativas próximas por posição apenas: isolar uma tentativa por vez, limpar o buffer antes dela e anotar a rodada. `motionProgress` é progresso geométrico aproximado, não porcentagem de acerto. `score`/`secondScore` são médias de regras, não probabilidades. `reason` é a condição dominante escolhida para a amostra; uma única amostra não descreve todas as causas simultâneas.

## Soletrar: trilha para I e O

O banco `wordBank(level)` define a palavra; `target[wordIndex]` é a letra esperada. Na tela `play`, `signconfirmed` gera `ui_received` e chamada síncrona a `Game.handleSign()`. O motor rejeita `no_session`, `paused`, `round_transition` quando o intervalo está parado, ou `wrong_letter` na comparação exata. Uma letra correta gera `accepted`, incrementa `wordIndex`, atualiza o alvo e reinicia o tempo; a última letra dispara `wordcomplete` e aguarda 450 ms antes da próxima palavra. `game_timeout` marca fim do tempo, inclusive durante cooldown. A troca de tela reseta tracking; a troca de sessão cancela callbacks anteriores.

Para **I**: conferir `recognition` I/Y e `motionStatus=base/in_progress/rejected`, depois `hold_reset`, `signconfirmed I`, `ui_received`, `game_decision` e `ui_target`. O empate I/Y é defeito estrutural confirmado por código e fixture; qual caminho explica a intermitência da webcam no Soletrar ainda é desconhecido. Para **O**: se `candidate=A` e depois houver `signconfirmed A`, `game_decision` deve indicar `expected=O`, `reason=wrong_letter`. Se não houver evento, a perda ocorreu antes do jogo; se houver `signconfirmed O` mas decisão rejeitada, observar `reason` e estado da rodada. A confusão específica de webcam O→A ainda não foi reproduzida com seus landmarks reais. Nenhuma duração do cronômetro foi alterada.

## Protocolo de coleta manual para retorno do usuário

1. Ativar voluntariamente no console `window.librasArcadeDiagnostics.enable()` ou pela tecla `d`. Antes de cada tentativa, executar `clear()`; testar uma letra por vez em **Treino → Todas as letras → Escolher letra**. Usar depois palavras que contenham I/O no Soletrar, anotando a letra esperada exibida. `read().events` devolve até 120 eventos em memória; copiar o resumo logo após a tentativa, antes que o anel sobrescreva a trilha. `disable()` desliga e apaga tudo.
2. Para cada tentativa, preencher: identificador local anônimo; data/versão; navegador/dispositivo; modo/nível; letra esperada e palavra/posição se Soletrar; mão física; câmera espelhada ou não; frontal/lateral; distância curta/média; iluminação; início/fim aproximados; sinal estático/dinâmico; observação de movimento. Não coletar nome, imagem ou coordenadas.
3. Anotar da trilha: primeiro `handPresent/landmarksValid`; sequência resumida de `(at,candidate,score,second,secondScore,gap,phase,stabilizingMs,reason)`; `hold_reset`/`motion_rejected`; `cooldownRemainingMs`; `signconfirmed`; `ui_received`; `game_decision` com `expected/reason`; `ui_target` ou estado visual observado. Registrar explicitamente “nenhum evento” quando aplicável.
4. Repetir cada condição exploratória pelo menos 10 vezes por letra prioritária, separando orientação, mão, distância, modo e velocidade J/Z. Contar tentativas válidas, primeira candidata correta, confirmação correta, confusão por destino, confirmação falsa, rejeição do jogo e tempo até evento. Dez tentativas são triagem, **não** homologação estatística. Registrar pausas e cooldown como condições distintas. Testar controles A/K/P para regressão.
5. Para comparar desempenho, repetir janela contínua igual com diagnóstico desligado e ligado no mesmo dispositivo e entrada; registrar frequência de inferência (`getPerformanceMetrics()`), CPU/RAM da aba e condições do navegador. GPU e captura podem ser processos compartilhados; não atribuir seu consumo integral ao app. Não há medição nova nesta fase.

Modelo de devolutiva por tentativa (somente escalares):

```text
ID: ___  versão: ___  modo/nível: ___  esperada: ___  palavra/índice: ___
mão: ___  espelhada: ___  orientação: ___  distância: ___  luz: ___
landmarks válidos: ___  vencedora/2ª e escores: ___  trocas/hold_reset: ___
fase e tempo de hold: ___  cooldown restante: ___  J/Z status: ___
signconfirmed: ___  ui_received: ___  game_decision/expected/reason: ___
interface após evento: ___  tempo até confirmação: ___  observação: ___
```

Nenhum evento, vídeo, imagem ou landmark é transmitido pelo aplicativo. Compartilhar registros é ação manual do usuário; revisar o texto antes de enviá-lo. Imagens ou landmarks brutos exigiriam consentimento e protocolo separado.

## Prioridade de calibração futura e entrada para FASE 03.3B

1. Obter tentativas rotuladas para E/M/N/S/T/R e I/O, com logs pareados por modo e orientação. Distinguir “sem landmarks”, “abaixo de 0,55”, concorrente vencedora, hold interrompido, bloqueio temporal e rejeição do jogo antes de propor regra nova.
2. Medir matriz de confusão e distribuição de **margens** por par (I/Y, O/A/S/C, E/S/M/N/T, R/U/V/H, X/C/D, V/K, G/T). Guardar taxas com denominadores e tempos; preservar controles que já funcionam. Um limiar global maior/menor não é solução presumida.
3. Com especialistas em Libras, validar rótulos e variantes de mão/orientação; avaliar normalização de rotação e handedness real. Só depois testar mudanças locais, inclusive política explícita para empate/ambiguidade, contra conjunto separado de validação e regressões dos três modos e J/Z.
4. Considerar exemplos rotulados e um classificador treinado apenas se regras revisadas continuarem insuficientes, com consentimento, separação por participante/dispositivo, comparação contra baseline e autorização específica. Não foi incorporado modelo novo.

**Critérios mínimos de entrada 03.3B:** registros reais consentidos e rotulados das letras prioritárias em frontal/lateral e condições de mão/distância anotadas; denominadores e confusões por letra; trilhas que localizem pelo menos os relatos I/O no Soletrar; sinais de controle para regressão; critérios de aceitação e conjunto de validação definidos antes de ajustar regras; medição de custo comparável se a solução aumentar trabalho por frame. Enquanto faltarem esses dados, a causa da falha de webcam por letra permanece hipótese.
