# Libras Arcade | Homologação real do J após Fase 03.3B-1.3

**Origem:** 3 capturas de eventos escalares submetidas pelo usuário, executadas no Treino, comparadas aos relatos de execução. **Nenhuma análise de vídeo ou landmarks brutos.**

## Síntese

- **J rápido e completo (anexo 1):** nenhuma confirmação J na janela preservada; rejeições de haste inclinada, haste insuficiente e descontinuidade, seguida de timeout da rodada J.
- **J com haste curta (anexo 2):** uma confirmação J correta/aceita; posteriormente I confirmado enquanto J era esperado, com `wrong_letter`.
- **J lento/com inclinação (anexo 3):** duas confirmações J aceitas.
- **Decisão:** Fase 03.3B-1.3 **não homologada em webcam**, apesar dos testes sintéticos e do review CodeRabbit sem achados.

Cada arquivo traz os **120 eventos finais** de uma sessão mais longa; não representa o total de tentativas nem serve para calcular taxa de acerto.

## Métricas verificadas nos buffers

| Arquivo | Tempo presente | `signconfirmed J` | `game_decision J accepted` | Outros eventos | Rejeições geométricas |
|---|---:|---:|---:|---|---|
| 1 | 8.13s | 0 | 0 | não houve | intent_missing=5, samples_insufficient=4, stem_inclined=4, stem_insufficient=12 |
| 2 | 11.16s | 1 | 1 | I: esperado J (wrong_letter) | intent_missing=6, samples_insufficient=4, path_short=2, stem_insufficient=3, hook_absent=4, hook_rise_short=1, stem_inclined=2 |
| 3 | 9.87s | 2 | 2 | não houve | intent_missing=4, samples_insufficient=4, path_short=1, stem_insufficient=9, hook_absent=6, hook_rise_short=2, stem_incoherent=1, hook_lateral_short=1 |

## Achados concretos para o Codex

1. **Anexo 1, 170.313–171.011s:** quatro avaliações `stem_inclined`; haste descendente `1.187`, deriva lateral `1.363`, isto é, desvio/descida de aproximadamente **1,15**. Há retorno geométrico não trivial: subida entre `0.193` e `2.112`, e lateral entre `0.076` e `0.897`, mas o reconhecimento continua rejeitado. **Hipótese a investigar:** a segmentação inclui desvio do gancho na haste, o referencial projeta movimento diagonal excessivo, ou a deriva horizontal real é incompatível com os critérios. Não assumir qual hipótese é a causa sem inspecionar o código/traçado.
2. **Anexo 1, 171–175s:** `incoherent_trajectory` (3 vezes), `tracking_discontinuity` (2) e `stale_history` (1). Alternância de candidatas provoca 16 resets do hold por `candidate_changed`; pode afetar a detecção estática, mas não prova a origem das rejeições dinâmicas.
3. **Anexo 2, 266.217s:** J aceito em `motionSamples=20`, `motionDurationMs≈1076`, descida `1.106`, lateral haste `0.838`, gancho subida `0.068`, lateral `0.117`. Após isso, I confirmado enquanto J era o alvo, com rejeição do jogo por `wrong_letter`. Isso demonstra uma oportunidade perdida no reconhecimento dinâmico, sem indicar erro no motor do jogo.
4. **Anexo 3, 349.276s e 351.863s:** J aceito em 19 amostras/≈1033ms e 18 amostras/≈960ms. Houve outras rejeições `hook_absent`, `stem_insufficient` e `hook_rise_short` antes das aceitações.
5. **Cautela metodológica:** as capturas limitadas a 120 eventos são apenas janelas finais de sessões longas e não guardam uma segmentação confiável por tentativa física. Relatar contagens por evento, não por tentativa.

## Fase 03.3B-1.4 recomendada (escopo mínimo)

- Revisar a escolha do ponto mais baixo e dos segmentos da haste/gancho usando os registros reais acima, principalmente a rejeição `stem_inclined` em trajetória com gancho medido.
- Verificar se o referencial, suavização e escala de J projetam corretamente inclinação lateral, espelhamento e movimentos rápidos.
- Avaliar a relação entre 20 FPS, duração da execução e coleta de no mínimo 6 amostras sem alterar globalmente a frequência da câmera.
- Garantir tratamento de `tracking_discontinuity` que rejeite saltos falsos, mas não perca movimentos válidos por jitter, com testes positivos e negativos.
- Manter proteção contra falso J durante I; evitar simples remoção dos critérios de haste, aumento geral do cooldown ou consulta ao alvo do jogo.
- Acrescentar casos sintéticos que *falhem antes da correção* reproduzindo os motivos acima; usar rota completa `LibrasEngine.update()` e verificação Treino/Soletrar.
- A prova final depende de webcam real com tentativas rotuladas separadamente em J rápido, curto, lento, inclinado e controles I imóvel/oscilante, mão esquerda/direita. Reportar sucesso por tentativa e por condição.

## Condições de segurança do trabalho

- Desenvolver apenas no worktree recuperado do Codex, branch `recovery/fase-033b13-6170a2d`, confirmando status Git antes de mudanças.
- Não manipular o worktree de review ou o worktree original vazio; não executar `git worktree remove`, `prune`, `clean` ou `reset`.
- Não fazer commit, push, merge ou cherry-pick automaticamente.
- Após testes e checkpoint deliberado, realizar novo CodeRabbit review somente sobre o diff novo, sem declarar homologação a partir de `findings:0`.
