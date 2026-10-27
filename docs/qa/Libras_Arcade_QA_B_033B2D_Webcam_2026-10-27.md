# Libras Arcade — Fase 03.3B-2D | Auditoria da homologação de B

**Data:** 27/10/2026

**Fonte:** `qa-b-fase-033b2d-webcam.json` enviado pelo usuário, com quatro capturas de calibração. Imagens enviadas na mesma conversa dão contexto visual adicional, mas não substituem o registro temporal.

**Estado:** correção de B **NÃO homologada**. Positivos de B aceitos nas duas mãos; controle negativo `four_spread` confirmou B na mão direita. E, M, N e S continuam com falhas relatadas nas provas visuais, fora do escopo funcional desta alteração.

## Resultado e interpretação

| Ensaio | Primeira confirmação segundo resumo da calibração | Total de confirmações | Evidência na UI | Parecer |
|---|---|---:|---|---|
| B com dedos unidos, direita | B | 1 | `game_decision` B/B, `accepted=true` | Positivo passou |
| B com dedos unidos, esquerda | B | 1 | `game_decision` B/B, `accepted=true` | Positivo passou, com 5 resets de hold anteriores |
| `four_spread`, direita | B | 1 | `game_decision` B/B, `accepted=true` | **FALHA: falso positivo de B**, apesar de o Treino aceitar |
| `four_spread`, esquerda | W | 2 | Evento retido W/B, `accepted=false` | Sem B como primeira confirmação declarada; **não passou como controle sem letras**. Log de 120 eventos perdeu eventos anteriores; segundo evento confirmado não identificável apenas pelo anel retido |

Notas: `confirmationCount=2` em `four_spread` esquerda, mas só um `signconfirmed` persistiu no anel de 120, portanto não afirmar identidade da outra confirmação. O resumo de calibração indica `firstConfirmedLetter=W`; verificar implementação dessa contagem/primeira letra, se necessário.

## Resumo quantitativo

Medianas calculadas exclusivamente nos eventos `recognition` com `handPresent=true` e `at` menor que o primeiro `signconfirmed` **visível** no anel da captura.

| Captura | Frames | `scoreB` | `lateralRatioIM` | `lateralRatioMR` | `lateralRatioRP` | Candidatas principais pré-confirmadas |
|---|---:|---:|---:|---:|---:|---|
| B unido, direita | 11 | 1.000 | 0.922 | 0.781 | 1.319 | B 11/11 |
| B unido, esquerda | 30 | 1.000 | 1.018 | 0.803 | 1.249 | B 24/30; F 6/30 |
| `four_spread`, direita | 14 | 0.892 | 1.993 | 2.067 | 2.107 | B 11/14; W 3/14 |
| `four_spread`, esquerda | 21 | 0.301 | 2.495 | 1.717 | 2.614 | W 11/21; B 8/21; V 2/21 |

**Sequência crítica direita:** W liderou nos três primeiros frames com mão presente; B assumiu a partir de `at≈578746` e liderou em 11 frames até `at≈579313`; `signconfirmed(B)` em `at=579380`. O escore B ao longo da sequência vencedora variou de aproximadamente 0.849 a 0.947 com razões laterais em torno de 2.00, 2.07 e 2.10. Houve `game_decision accepted=true` porque o jogo esperava B, demonstrando que aceitação do jogo **não equivale** a validade da postura.

**Esquerda:** B foi candidata nos oito frames iniciais retidos (às vezes `scoreB=1`) e depois perdeu para V/W. W manteve 11 frames de liderança, com `signconfirmed(W)` em `at=599547`. O anel de 120 eventos perdeu parte do início, e o metadado conta duas confirmações, então nem todos os eventos podem ser auditados.

**Interpretação geométrica:** os B positivos têm razões laterais adjacentes tipicamente próximas de 0.7–1.5. O controle `four_spread` direita apresentou distâncias em torno de 1.9–2.2. O gate atual informado como transição entre duas e três larguras deixa B com alto escore mesmo sob separação intencional. A separação observada nos ensaios sugere ajustar a exigência conjunta por pares, mas **não autoriza fixar limiares definitivos** sem replicação em mais mãos e condições. Preferir requisitos por par de dedos, evitando que um par muito afastado seja compensado por outros unidos, e preservar tolerância anatômica nos positivos.

## Demais letras: observações por screenshot

Imagens anexadas mostram, no contexto de tentativas distintas:
- **M** sendo confundida visualmente com F e O, além dos históricos M→B.
- **N** gerando P/V nas telas mostradas, além do histórico N→U.
- **E** gerando O e X nas telas mostradas, além do histórico E→A/O.
- **S** gerando O nas telas mostradas; usuário relata um acerto esporádico à direita e falha à esquerda.

Essas imagens NÃO constituem um conjunto de calibrações independente de E, M, N e S, e não permitem estimar precisão ou refazer pontuações quantitativas. Não alterar essas letras com base apenas nesses prints. N/S pertencem aos colegas, e eventuais propostas devem ser integradas de modo coordenado.

## Decisão técnica e plano de ação

1. **Não marcar B como homologada** nem integrar à `main` antes de corrigir o falso B em `four_spread` direita.
2. Fazer a **Fase 03.3B-2D.1**, ajustando exclusivamente o gate B com base nas razões laterais dos três pares, sem mexer em R/U nem em E/M/N/S, FSM global, limiar global e tempo de hold. Analisar competição com F e W; não penalizar F/W globalmente para forçar B.
3. Criar fixtures positivas de B unido nas duas mãos e negativas de `four_spread` para ambas as mãos, espelhamento, pequenas oscilações e perspectiva. Negativos devem inspecionar `signconfirmed`, não somente decisão do jogo. O controle esquerdo com W requer um ticket separado de falso W ou um teste específico de W com mindinho estendido antes de propor mudança em W.
4. Executar testes gerais, câmera simulada, contratos de performance, specs, sintaxe e `git diff --check`.
5. Fazer **nova rodada independente** com pelo menos B unido e `four_spread` em ambas as mãos. Encerrar cada captura na primeira confirmação ou janela curta sem confirmação; deixar a mão fora e aguardar rearmamento. Verificar buffers sem transbordamento, candidato por frame, margem, hold, `signconfirmed`, `game_decision`, comparação com F/W, e FPS.
6. Se aprovada, revisar no CodeRabbit e registrar checkpoint local somente após inspeção do diff. Prosseguir posteriormente com E/S (conflitos com A/O), N (concorrência U) e M (rastreamento e modelagem sob oclusão), sempre preservando arquitetura existente.

**Git informado anteriormente:** worktree `fase-03-cooldown-recuperado`, branch `recovery/fase-033b13-6170a2d`, último HEAD relatado `82ae0bc`, com alterações locais documentais e instrumentação. Confirmar estado atual; não executar operações destrutivas, merge ou manipular worktrees dos colegas.

## Critérios mínimos de aceite da correção

- B legítimo confirma nas mãos direita/esquerda e não perde hold sob oscilações pequenas.
- `four_spread` não confirma **B** em nenhuma das mãos. Qualquer outra letra emitida é investigada como falso positivo se a postura física não corresponde a essa letra; em particular, W não deve ser dado como sucesso geral.
- R/U continuam funcionando, assim como os controles da suíte.
- As decisões da UI e do jogo refletem a letra emitida; o reconhecimento indevido não é mascarado por `accepted=true` quando a letra esperada coincidentemente é B.
- Conclusões reportam o número de tentativas independentes e seus limites. Sem estimativas de precisão populacional com apenas quatro capturas.
