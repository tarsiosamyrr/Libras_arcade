---
id: CHG-20261026-fase-033b2b3-r-recuperacao
status: implemented
date: 2026-10-26
affected_capabilities: core
---

# FASE 03.3B-2B.3 — promoção geométrica condicionada de R

## Problema e contexto

O relatório externo `Libras_Arcade_Analise_RU_Webcam_033B2B2_2026-10-26.md` e `qa-r-fase-033b2b2-webcam.json` contêm seis capturas rotuladas, sem landmarks completos: duas R estendidas e cruzadas, duas R parcialmente curvadas e dois controles U. R não foi confirmada. U foi aceita nas duas capturas controle. Duas capturas R tiveram mais de uma confirmação e não servem como tentativas independentes de desempenho. O anel de 120 eventos perdeu o início de duas capturas; o resumo da primeira confirmação permaneceu.

Em R estendido, os quatro componentes de forma da regra valem 1 nos frames anteriores à primeira confirmação. A separação 3D no cruzamento é pequena, mas `palmAxisIM≈0,15` multiplica a pontuação por cerca de 0,68; `crossOrderIM` a reduz novamente. Assim, mediana de `scoreR` foi 0,468 na mão direita e 0,195 na esquerda, enquanto a mediana de `scoreU` foi 0,974 e 0,983. A falha é de classificação e competição: U é candidata principal, confirma e chega à UI, que a rejeita quando espera R. O hold e o jogo não originam a troca.

## Resultado esperado

Promover uma postura R com dedos estendidos e cruzamento geométrico coerente acima dos concorrentes, preservando U paralelo e evitando R por uma interseção 2D isolada. A eficácia real após a alteração depende de nova homologação em webcam nas duas mãos.

## Escopo

`crossingGeometry()` e `RULES.R`, testes de geometria positiva/negativa e integração com Treino/Soletrar, comparação retrospectiva dos escalares e documentação. A medição detalhada da 2B.2 continua opcional e local.

## Não escopo

Alterar `RULES.U`, limiar global, ordem geral de regras, letra esperada pelo jogo, estado temporal, câmera, jogos, outras letras, imagens ou landmarks persistidos. A postura R parcialmente curvada não é alvo desta correção porque não apresentou a assinatura geométrica do R estendido nas capturas.

## Alternativas e decisão

- Restaurar a média anterior de R: na regressão anterior quase nunca superou U e atribuiu escore elegível a R sem cruzamento.
- Reduzir U, reordenar letras ou favorecer o alvo: prejudicaria U legítimo e mascararia a causa geométrica.
- Aumentar R sempre que houver interseção 2D: o controle U/direita teve uma interseção isolada, com ordem 2D negativa e profundidade maior.
- **Escolha:** promover somente R quando forma e geometria convergem, deixando o hold de 600 ms exigir persistência. A regra U e o cálculo gradual de R fora dessa condição permanecem.

## Solução e fluxo

`crossingGeometry()` passa a calcular `crossOrder2DIM` também no caminho normal, com produto escalar das pontas no eixo projetado dos MCP. A calibração reutiliza esse valor; as outras cinco medidas detalhadas da 2B.2 ainda são calculadas só quando a captura rotulada está ativa.

`RULES.R` calcula a média original dos quatro componentes de forma. A condição forte exige simultaneamente:

1. Cada componente de extensão de indicador/médio e fechamento de anelar/mindinho acima de 0,5 na escala fuzzy existente.
2. `crossDepthIM` finito: encontro projetado com profundidade mensurável.
3. `crossOrder2DIM > crossDepthIM` e `crossOrderIM > 0`: inversão projetada maior que a separação em profundidade no encontro e ordem 3D coerente.
4. `crossDepthIM < palmAxisIM / 2`: dedos mais próximos no encontro que metade da separação projetada entre suas bases.
5. Confiabilidade projetada de pelo menos metade do fator já existente, `fuzzyOn(palmAxisIM, 0, SPREAD_TOGETHER) ≥ 0,5`.

Quando os cinco itens valem, R recebe o escore de forma, até 1. Caso contrário, mantém exatamente o produto gradual da 2B. Essa promoção permite superar U sem penalizar U. Não usa `crossGap3DIM` como critério normal: o mínimo 3D pode ocorrer em outra parte dos dedos; `crossDepthIM` mede a separação no encontro projetado relevante e já é calculado pelo motor. `crossGap2DIM` e as posições continuam disponíveis para inspecionar casos sem interseção em calibração, mas as capturas atuais não justificam aceitá-los como R.

As relações `ordem > profundidade` e `profundidade < metade do eixo` são hipóteses geométricas locais, não estimativas estatísticas de limites ótimos. Os únicos valores absolutos reutilizados são faixas fuzzy existentes. A confirmação temporal continua exigindo 600 ms da mesma candidata.

## Interfaces e dados afetados

`crossOrder2DIM` é calculado internamente em toda inferência com mão, mas registrado apenas na calibração rotulada, como antes. `state.features`, `signconfirmed`, `read()`, nomes de eventos, jogos e armazenamento não mudam. `scoreR` na captura passa a refletir a nova regra; `scoreU` permanece idêntico.

## Comparação retrospectiva das capturas

Aplicando a fórmula nova aos escalares dos mesmos eventos com mão **até a primeira confirmação original**:

| Captura | R candidata antes | R candidata projetada | U preservada |
| --- | ---: | ---: | ---: |
| R direita estendida | 0/9 | 8/9 | — |
| R esquerda estendida | 0/11 | 6/11 | — |
| R direita curvada | 0/6 | 0/6 | — |
| R esquerda curvada | 0/22 | 0/22 | — |
| U direita paralela | 0/12 | 0/12 | 12/12 eventos sem promoção de R |
| U esquerda paralela | 0/11 | 0/11 | 11/11 eventos sem promoção de R |

Medianas nos mesmos eventos até a primeira confirmação antiga (margem = `scoreR` menos o maior escore de outra letra, calculada por frame antes de tirar a mediana):

| Captura | R antigo | R projetado | U | Margem antiga | Margem projetada |
| --- | ---: | ---: | ---: | ---: | ---: |
| R direita estendida | 0,468 | 1,000 | 0,974 | −0,521 | +0,026 |
| R esquerda estendida | 0,195 | 1,000 | 0,983 | −0,791 | +0,015 |
| R direita curvada | 0,000 | 0,000 | 0,827 | −0,827 | −0,827 |
| R esquerda curvada | 0,000 | 0,000 | 0,857 | −0,857 | −0,857 |
| U direita paralela | 0,000 | 0,000 | 0,981 | −0,981 | −0,981 |
| U esquerda paralela | 0,000 | 0,000 | 0,988 | −0,988 | −0,988 |

Nas janelas completas de R estendido, a regra projetada tornaria R candidata por 23 frames consecutivos (~1.533 ms) à direita e por até 30 frames consecutivos (~1.685 ms) à esquerda. O primeiro frame que completa 600 ms aparece, respectivamente, cerca de 83 ms e 343 ms após o instante em que o motor antigo emitiu U. Isso é **replay escalar de eventos coletados antes da alteração**, não execução do novo motor com os landmarks reais: a troca de candidata mudaria o hold e impediria inferir o resultado exato da sessão antiga. Os eventos de uma captura são correlacionados e não estimam precisão populacional.

## Falhas, segurança e compatibilidade

A promoção tem uma fronteira abrupta: oscilação perto das relações geométricas pode reiniciar o hold. Uma U com cruzamento aparente e inversão persistente por 600 ms pode ser confundida com R; os dois controles disponíveis não cobrem todos os usuários, câmeras e orientações. MediaPipe pode deslocar `z` sob oclusão; a validade estrutural atual não certifica anatomia nem finitude de `z`. Uma vista muito lateral pode reduzir `palmAxisIM` e continuar perdendo R. Se R e U saturarem em 1, a ordem atual das regras ainda favorece U; não se alterou o desempate sem dados reais. Não há alteração de coleta ou persistência biométrica.

No caminho normal, o acréscimo geométrico é um comprimento projetado e um produto escalar por inferência com mão, sem percorrer novos pares de segmentos. O percurso de nove pares da medição detalhada continua exclusivo da calibração opcional. Essa é uma avaliação de operações, **não** uma medição de FPS, CPU, RAM ou tempo de inferência em webcam.

## Estratégia de testes

Um teste de R com eixo projetado curto e mãos espelhadas falhou antes da correção com U vencedora. Após a mudança, confirma R pelo hold. Controles sintéticos verificam U paralelo nas duas mãos, pontas próximas sem inversão, interseção 2D isolada, um frame espúrio com geometria R completa, sobreposição 2D distante em profundidade, variação de profundidade, projeção lateral e R após U errado com rearmamento e aceitação em Treino/Soletrar. As suites anteriores verificam demais letras, cooldown, câmera e contratos dos jogos. Fixtures são aproximações geométricas, não os landmarks das capturas reais.

## Critérios de aceite

A implementação candidata deve passar nos testes de forma, negativos U, integração e suites completas. O **aceite final funcional permanece pendente**: em novas tentativas independentes, R estendido e cruzado deve confirmar corretamente na webcam em cada mão, e U paralelo/variantes deve continuar confirmável. Registrar primeira candidata, tempo de hold, letra emitida e decisão do jogo; separar essas capturas das seis usadas na formulação.

## Consolidação na memória viva

`../capabilities/core.md`, `../system.md`, `../testing.md`, `../../docs/qa/qa-reconhecimento.md`, `../../docs/ROADMAP.md` e `../../docs/state.md` distinguem a implementação sintética da homologação real pendente.
