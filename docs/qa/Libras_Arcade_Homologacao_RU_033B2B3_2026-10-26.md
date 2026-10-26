# Libras Arcade | Homologação preliminar R/U: Fase 03.3B-2B.3

**Data:** 26/10/2026<br>
**Origem:** `qa-r-fase-033b2b3-webcam.json` (4 capturas rotuladas, Treino)<br>
**Status:** R recuperada nas condições frontais testadas; U preservada. Robustez ampliada e revisão independente ainda pendentes.

## Condições registradas

As quatro capturas declararam `orientation=front`, `distance=medium` e `mirrored=true`. A mão física foi rotulada no arquivo. Nas duas tentativas de R, a postura declarada foi `estendido_cruzado`; nas duas tentativas de U, `paralelo`.

| Captura | Intenção e mão | Primeira confirmação | `game_decision` da primeira confirmação | Total de confirmações no resumo | Buffer |
|---|---|---|---|---:|---|
| 1 | R, direita | R | `accepted=true`, `expected=R` | 3 | 120/120, início sobrescrito |
| 2 | R, esquerda | R | `accepted=true`, `expected=R` | 1 | 80/120 |
| 3 | U, direita | U | `accepted=true`, `expected=U` | 1 | 67/120 |
| 4 | U, esquerda | U | `accepted=true`, `expected=U` | 2 | 67/120 |

A captura 4 registrou uma **segunda** confirmação de `A`, posteriormente rejeitada (`expected=V`), após a primeira confirmação correta de U. A captura 1 preserva no resumo três confirmações de R, mas apenas uma está presente nos eventos retidos, pois o anel atingiu sua capacidade. Não atribuir a segunda confirmação da captura 4 a um U legítimo sem saber qual gesto estava sendo executado naquele instante.

**Importante:** capturas 1 e 4 ultrapassaram o protocolo de uma confirmação por tentativa. Elas demonstram primeira confirmação correta, mas não devem ser tratadas como tentativas independentes limpas em estimativas de precisão. Não converter contagens de eventos/frames em taxas populacionais de acerto.

## Diagnóstico até a primeira confirmação

Os dados abaixo contam eventos `recognition` com mão presente até a primeira `signconfirmed` de cada captura (inclusive). O estágio de aproximação inicial pode conter outras candidatas.

| Condição | Candidata pretendida / frames com mão | Mediana do escore vencedor nos frames em que venceu | Mediana do escore concorrente R↔U nos mesmos frames | Tempo desde o primeiro frame da candidata pretendida até a confirmação |
|---|---:|---:|---:|---:|
| R, direita | 12/15 | R = 1,000 | U ≈ 0,980 | ≈ 662 ms |
| R, esquerda | 11/12 | R = 1,000 | U ≈ 0,982 | ≈ 666 ms |
| U, direita | 12/12 | U ≈ 0,995 | R = 0,000 | ≈ 645 ms |
| U, esquerda | 11/21 | U ≈ 0,983 | R = 0,000 | ≈ 633 ms |

Na confirmação de R direita, `scoreR=1` e `scoreU≈0,979`; na esquerda, `scoreR=1` e `scoreU≈0,982`. As margens foram pequenas (cerca de 0,021 e 0,018), e a estabilidade deve continuar sendo observada em novas sessões.

Na captura U esquerda houve eventos preliminares de X/O/A antes da sequência de U; depois da confirmação U, surgiu o evento adicional A fora do critério de primeira confirmação. O jogo recebeu e aceitou corretamente U nas duas mãos.

## Conclusões

1. **Regressão R→U anteriormente observada: recuperada nas condições testadas.** A primeira confirmação de R foi correta e aceita pelo jogo em ambas as mãos com dedos estendidos e cruzados.
2. **U legítimo preservado nas duas mãos**, com primeira confirmação correta e aceita pelo jogo.
3. Os dados confirmam o percurso motor → UI → Treino na primeira confirmação de cada captura.
4. A melhoria real não equivale a homologação ampla: não foram testadas várias tentativas independentes limpas, orientação oblíqua/lateral, diferentes distâncias, iluminação, outros usuários ou desempenho real de CPU/FPS.
5. O arquivo possui múltiplas confirmações acidentais em duas capturas. O resumo conserva a primeira letra, mas a captura 1 perdeu eventos do início porque o buffer de 120 ficou cheio.

## Recomendação de engenharia

- **Manter a correção 03.3B-2B.3 como candidata aprovada no cenário frontal**, sem novo ajuste de limiar apenas com estes dados.
- Documentar esta homologação nos `docs/qa` do repositório (após conferir conteúdo e privacidade), junto com o relatório 2B.3.
- Revisar o diff completo **2B.2 + 2B.3** por CodeRabbit após um checkpoint local controlado, sem push/merge na `main`.
- Fazer uma rodada posterior curta com tentativas individuais de R/U por mão e controles negativos de falsa interseção, oblíqua/espelho, após a revisão.
- Prosseguir com E e M em fase separada, sem alterar regras N/S de outras branches.

### Nota metodológica

O fato de R e U terem sido reconhecidos nas duas mãos nesta rodada sustenta uma **homologação funcional inicial do Treino frontal**, não acurácia estatística nem aprovação abrangente para todos os modos e condições.
