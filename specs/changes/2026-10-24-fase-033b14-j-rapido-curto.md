---
id: CHG-20261024-fase-033b14-j-rapido-curto
status: implemented
date: 2026-10-24
affected_capabilities: core
---

# FASE 03.3B-1.4 — J rápido e curto

**Base:** `6170a2d`, branch `recovery/fase-033b13-6170a2d`. **Escopo:** geometria e continuidade de J, fixtures e diagnóstico escalar. A homologação da 03.3B-1.3 continuava pendente após os três buffers de webcam descritos no [relatório de QA](../../docs/qa/Libras_Arcade_Homologacao_J_033B13_2026-10-24.md).

## Problema e contexto

O anexo 1 registra quatro rejeições `stem_inclined` com descida da haste 1,187, desvio lateral 1,363 e retorno não nulo. A causa **confirmada no algoritmo** é que ele usava o maior Y suavizado como fim da haste. O começo do gancho ainda pode descer enquanto anda para o lado, e portanto inflava a lateral da haste. Uma fixture completa de J rápido com essa forma falhou antes da correção e passou após separar os segmentos. O buffer real não contém landmarks, então não é possível afirmar que essa foi a única causa física daquela tentativa. A candidata estática não é usada para escolher a letra dinâmica; `isPinkyUpBase()` e uma graça de 300 ms regem a coleta. A oscilação I/O/A/Y no anexo é uma hipótese de perda de hold, não a causa comprovada da falha de J.

O anexo 2 registra J aceito somente após 20 amostras/1.076 ms e depois I incorreto para o alvo J. No código, a média móvel causal de três amostras atrasa o retorno: uma fixture curta completa de seis amostras terminava com `hookRise=0,0033` e `hook_rise_short`, embora o último passo bruto subisse e avançasse lateralmente. Após cessar a intenção dinâmica, o hold pode confirmar a pose-base I; isso explica **um caminho possível** para o I observado, sem provar que ocorreu na webcam. A aceitação tardia dos anexos 2 e 3 não demonstra uma exigência de 18–20 frames; a regra continua com mínimo de seis. A segmentação real dessas tentativas e os efeitos de projeção, oclusão e pose-base permanecem desconhecidos.

Uma fixture com callback ausente e movimento contínuo do pulso falhou no limite fixo de 0,26 por observação. O anexo 1 também contém `tracking_discontinuity`, mas não há posições e tempos por frame suficientes para distinguir salto de rastreamento de velocidade legítima no caso real. O referencial J conserva pulso/escala inicial e ponta relativa/escala atual; a pequena variação de escala já coberta por teste continuou funcional. Z e câmera não mudaram.

## Resultado esperado

Confirmar nas fixtures um J rápido ou curto com haste vertical predominante e retorno ascendente/lateral, preservando I estático e oscilações, Z, os jogos e a confirmação única. Não inferir precisão de webcam a partir da simulação.

## Escopo

Segmentação e continuidade temporal de J, diagnóstico escalar opcional, fixtures de regressão e documentação.

## Não escopo

Classificador estático, Z, câmera, cooldown, jogos, cronômetro, conteúdo pedagógico, modelos novos e classificação pela letra esperada.

## Alternativas e decisão

Aumentar a razão lateral permitida na haste aceitaria diagonais de I sem separar a curva. Reduzir o mínimo de amostras aceitaria trajetórias incompletas. Remover a suavização de todas as trajetórias J ampliaria a sensibilidade a jitter. Foi escolhido localizar o prefixo de haste e usar uma média centrada apenas no retorno curto com deslocamento terminal simultâneo nos dois eixos. O limite espacial do pulso cresce somente com intervalo entre callbacks, com teto explícito.

## Solução e fluxo

- A haste termina no **último prefixo** anterior ao ponto mais baixo cuja descida seja pelo menos 0,26, predominantemente vertical (`|dx| ≤ dy`) e com consistência ≥0,65. O ponto mais baixo continua definindo o início do retorno ascendente. A lateral acumulada entre o fim da haste e esse ponto passa a integrar a curva. Sem prefixo válido, as razões anteriores `stem_insufficient`/`stem_inclined` continuam disponíveis.
- O retorno mantém subida ≥0,03 e lateral ≥0,06, seguido dos critérios globais anteriores de curva ≥35°, percurso/reta ≥1,15, progresso vertical ≥0,10 e consistência ≥0,65. Nenhum alvo do jogo altera a classificação. Um J de seis a oito pontos usa média **centrada** somente se a avaliação causal falhar por gancho ausente ou subida curta e o último passo tiver subida ≥0,03 e lateral ≥0,10. Assim o gancho final não é apagado pela média causal. Com retorno terminal menor, a regra anterior continua; a fixture negativa de seis pontos com gancho ambíguo permanece negativa. O `1e-9` na comparação de subida evita que 0,03 seja rejeitado por arredondamento binário.
- A continuidade do pulso permite passo maior quando o intervalo entre callbacks passa dos 50 ms nominais, até `0,26 × 1,75 = 0,455` na escala normalizada. Não altera o limite de 0,26 em intervalos de 50 ms ou menores, nem a janela de descarte de 300 ms. Isso preserva os testes de salto espacial instantâneo. Um salto moderado após um callback ausente ainda pode ser indistinguível de movimento legítimo sem identidade da mão; requer webcam rotulada.

O custo adicional é uma varredura linear do buffer J já limitado e, apenas para seis a oito pontos com retorno terminal claro, uma média centrada curta. Não há medição nova de CPU/RAM, FPS ou precisão.

## Interfaces e dados afetados

`motion_geometry` opcional acrescenta `stemEndIndex`, `troughIndex` e `shortHook` para distinguir haste encontrada antes da curva e seleção da média centrada. `motion_rejected` por `tracking_discontinuity` acrescenta `wristStep`, `wristGapMs` e `wristLimit`. `reason` continua sendo a primeira condição reprovada na ordem da avaliação: intenção/amostras/percurso, forma da haste, gancho e regras globais. Assim, `stem_inclined` pode coexistir com gancho medido; não afirma que ele não existe. `stale_history` indica descontinuidade temporal e `tracking_discontinuity` a espacial. A captura continua voluntária, local, limitada a 120 eventos escalares, sem imagens, vídeo, landmarks completos ou persistência.

## Falhas, segurança e compatibilidade

Uma oscilação involuntária com geometria indistinguível de J ainda pode gerar falso positivo, e um J físico sem retorno observável pode falhar. Um salto moderado após callback ausente pode parecer movimento legítimo; `numHands: 1` não oferece identidade persistente da mão. A captura continua sem biometria bruta automática. Z, câmera e armazenamento preservam seus contratos. Custo CPU/RAM, FPS e precisão reais não foram medidos.

## Estratégia de testes

Antes da mudança, falharam pelo `LibrasEngine.update()` as fixtures de J rápido com curva descendente lateral, J curto completo em seis amostras e J com callback ausente e pulso contínuo. Os testes existentes protegeram I imóvel, oscilante, vertical, lateral, repetitivo e após J, ausência de gancho, curva invertida, salto espacial, histórico antigo, sessão/cooldown, D/Z e os jogos. Casos novos cobrem também J rápido inclinado/espelhado com cadência irregular, zoom, pequena alternância de orientação projetada e perda breve da base, além de curva lateral incoerente. [Comandos e resultados](../testing.md).

As fixtures demonstram apenas comportamento lógico com landmarks sintéticos. A fase **não está homologada em webcam**. Para avaliar: no mesmo dispositivo e iluminação, iniciar uma captura rotulada por tentativa; executar J rápido completo, J curto, J lento, J inclinado e I imóvel/oscilante/lateral com as duas mãos, frontal e oblíquo; registrar sucesso ou erro por tentativa, tempo, motivo geométrico, perda de base e decisão do Treino/Soletrar. Pausar entre tentativas para rearmar. Comparar o mesmo protocolo com a base anterior. Sem amostras independentes, não calcular taxa de precisão a partir do anel de 120 eventos. Submeter o diff desta fase ao CodeRabbit e revisar em especial o prefixo da haste, o retorno de seis pontos e o limite espacial dependente do tempo.

## Critérios de aceite

Os positivos sintéticos devem confirmar J uma vez; os controles de I, sem gancho, salto, sessão e Z não podem emitir J indevido. A aprovação final requer review do novo diff e tentativas reais rotuladas com denominadores, incluindo I físico após J. Até essa evidência, o estado é implementação verificada por testes, não homologação.

## Consolidação na memória viva

[Capacidade](../capabilities/core.md), [sistema](../system.md), [testes](../testing.md), [README](../../README.md), [roadmap](../../docs/ROADMAP.md) e [estado](../../docs/state.md).
