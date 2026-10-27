# Libras Arcade | Fase 03.3B-2C | Análise da 2ª rodada de webcam

**Fonte:** `qa-em-fase-033b2c-webcam teste 2.json`, 16 capturas, orientação rotulada `front`, distância `medium`, espelhamento `true`, duas mãos físicas. **Referência:** classificação vigente na branch de recuperação, anterior a qualquer correção E/M.

## Método

- Comparar a **primeira confirmação** da calibração com `intendedLetter` e verificar o primeiro evento `game_decision`.
- Calcular as **medianas das amostras `recognition` com `handPresent=true` até a primeira `signconfirmed`**, inclusive o frame de emissão, usando dados que sobreviveram no buffer.
- Medir candidata principal por frame e eventos `hold_reset` anteriores à primeira confirmação.
- Não tratar frames como ensaios independentes. As capturas são poucas, feitas por uma pessoa e algumas excederam o buffer de 120 eventos.
- Não fazer inferência sobre a forma física exata do gesto ou veracidade do rastreamento apenas a partir de escores.

## Resultados por captura

| # | Pretendida | Mão | Primeira confirmação | Decisão | Pontuação mediana relevante |
|---|---|---|---|---|---|
| 1 | E | direita | O | rejeitada | E 0,558; O 0,999; S 0,758 |
| 2 | E | esquerda | A | rejeitada | E 0,686; A 1,000; O 0,750 |
| 3 | M | direita | B | rejeitada | M 0,000; B 0,800 |
| 4 | M | esquerda | B | rejeitada | M 0,000; B 0,800 |
| 5 | M repetição | direita | B | rejeitada | M 0,000; B 0,800 |
| 6 | M repetição | esquerda | B | rejeitada | M 0,000; B 0,800 |
| 7 | B controle | esquerda | B | aceita | M 0,000; B 1,000 |
| 8 | B controle | direita | B | aceita | M 0,040; B 1,000 |
| 9 | S controle | direita | O | rejeitada | S 1,000; O 1,000; E 0,800 |
| 10 | S controle | esquerda | O | rejeitada | S 0,800; O 0,980; E 0,814 |
| 11 | A controle | esquerda | A | aceita | E 1,000; A 1,000 |
| 12 | A controle | direita | A | aceita | E 0,988; A 1,000 |
| 13 | O controle | direita | O | aceita | E 0,577; O 1,000 |
| 14 | O controle | esquerda | O | aceita | E 0,099; O 1,000 |
| 15 | N controle | esquerda | U | rejeitada | N 0,588; U 0,977 |
| 16 | N controle | direita | U | rejeitada | N 0,500; U 0,943 |

**Importante:** capturas 1–4 vieram da primeira rodada e foram incluídas novamente no novo JSON. O arquivo contém 12 capturas posteriores, não 16 tentativas independentes novas.

## E: concorrentes e limites

- **E direita:** O principal em 10 dos 11 frames retidos com mão antes da primeira confirmação; S em um. Escore E mediano 0,558 contra O 0,999.
- **E esquerda:** A em 34 de 47 frames, X em 12, O em 1; 15 `hold_reset` antes da confirmação. Escore E mediano 0,686 contra A 1,000.
- **A verdadeira** recebe `scoreE` mediano 1,000 (esquerda) e 0,988 (direita) mesmo sendo reconhecida corretamente como A. Portanto, elevar indiscriminadamente o escore de E pode causar falsos E em A.
- **S verdadeira** recebeu escore E mediano 0,800 (direita) e 0,814 (esquerda); há sobreposição adicional. Não modificar S neste worktree.
- **O verdadeira** foi reconhecida corretamente nas duas mãos; `scoreE` 0,577 (direita) e 0,099 (esquerda).

**Diagnóstico:** competição e separação insuficiente de características; ainda não está validado um discriminante único e seguro. Comparar componentes de polegar e dedos em cada classe, e avaliar necessidade de distâncias individuais de ponta–palma e relações locais da mão, antes de reescrever a regra.

## M: dados não correspondem à forma fechada esperada pela regra

| Captura | `extIndex` | `extMiddle` | `extRing` | `curlIndex` | `scoreM` | `scoreB` | `tipPalmMean` |
|---|---:|---:|---:|---:|---:|---:|---:|
| M direita, 1ª | 1,177 | 1,438 | 1,383 | 0,002 | 0,000 | 0,800 | 1,344 |
| M esquerda, 1ª | 1,384 | 1,703 | 1,748 | 0,002 | 0,000 | 0,800 | 1,749 |
| M direita, repetição | 1,417 | 1,787 | 1,776 | 0,001 | 0,000 | 0,800 | 1,676 |
| M esquerda, repetição | 1,457 | 1,786 | 1,711 | 0,001 | 0,000 | 0,800 | 1,683 |
| B esquerda, controle | 0,805 | 0,918 | 0,908 | 0,001 | 0,000 | 1,000 | 0,893 |
| B direita, controle | 0,707 | 0,816 | 0,788 | 0,004 | 0,040 | 1,000 | 0,789 |

Esses valores são medianas por captura dos frames retidos antes da primeira confirmação. Em todas as quatro capturas rotuladas M, `scoreM` foi 0,000, com extensões muito altas e curvaturas próximas de zero. Isso sugere **incompatibilidade entre a geometria detectada e a pose que a regra M espera**, mas não permite decidir se a mão física foi posicionada inadequadamente, se há uma convenção de sinais divergente ou se MediaPipe errou os landmarks em condição de oclusão. Verificar desenho dos landmarks de forma voluntária, sem registro automático de vídeo/imagens, definição das `features` e normalização antes de qualquer ajuste.

## Resultados relevantes às branches dos colegas

- **S direita e esquerda:** primeira confirmação O. Na direita, S e O atingem mediana 1,000 e o desempate/variação favoreceu O; esquerda, O 0,980 vs S 0,800. Fornecer estes resultados ao responsável por S; **não modificar S aqui**.
- **N direita e esquerda:** primeira confirmação U, com `extIndex` e `extMiddle` altos, cerca de 1,1–1,3, e `scoreU` 0,943–0,977. Fornecer ao responsável por N; **não modificar N/U aqui**.

## Qualidade dos registros

- Buffers com 120 eventos: capturas #1, #2, #4, #5, #9, #13. Neles parte do histórico inicial pode ter sido sobrescrita.
- Captura #1 tem duas confirmações; não usá-la como tentativa independente válida para calcular desempenho.
- Todas as demais capturas têm uma primeira confirmação identificada, e `game_decision` foi coerente com a letra pretendida.
- Observações estão limitadas a ensaios frontais rotulados por uma pessoa; não representam taxas de acerto gerais.

## Recomendação de engenharia

1. Congelar R/U e preservar N/S, A/O, os jogos e máquina temporal.
2. Investigar M como problema de **landmarks/pose/features** antes de alterar `RULES.M`; não promover escores de dedos estendidos a M.
3. Investigar E contrastivamente com A/O/S em dados reais. **Não apenas aumentar scoreE**, pois a classe A verdadeira já tem scoreE ~1,000.
4. Caso indispensável, adicionar instrumentação opcional de métricas individuais e/ou overlay temporário para verificar landmarks de M, sem armazenar imagens ou landmarks completos de forma persistente.
5. Propor apenas correções locais justificadas; executar testes positivos e negativos, replay e nova homologação independente de E/M, inclusive duas mãos.
6. Compartilhar achados de S/N com colegas, sem integrar branches prematuramente.
