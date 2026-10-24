# Libras Arcade | Evidências reais para a Fase 03.3B

**Origem:** 16 arquivos JSON de `window.librasArcadeDiagnostics.read()` enviados pelo testador; 9 e 10 são cópias idênticas.

**Interpretação:** contagens abaixo são de eventos **capturados no buffer circular**, amostrados, e NÃO medem precisão, recall nem o total de tentativas. Os logs não armazenam os 21 landmarks, a lateralidade física da mão ou a distância real da câmera.

## Matriz consolidada

| Anexo | Tentativa declarada | Candidatas com mão presente (top 3) | `signconfirmed` capturado | `game_decision` capturado |
|---|---|---|---|---|
| 1 | I (3 tentativas) | I=35, O=3, A=2 | J=3, I=1 | J→I: wrong_letter (2), I→I: aceito (1), J→J: aceito (1) |
| 2 | M | B=32, V=5, A=3 | B=2 | B→M: wrong_letter (3) |
| 3 | N | W=25, V=6, B=4 | W=2 | W→N: wrong_letter (2) |
| 4 | O | O=28, A=22, K=1 | A=1, O=2 | A→O: wrong_letter (1), O→O: aceito (2) |
| 5 | S | A=28, O=5, B=1 | A=4 | A→S: wrong_letter (4) |
| 6 | R | U=27, D=5, F=1 | U=2 | U→R: wrong_letter (2) |
| 7 | T | F=34, A=19, T=6 | F=2, A=2 | F→T: wrong_letter (2), A→T: wrong_letter (2) |
| 8 | E | O=30, A=29, S=11 | A=2, O=2 | A→E: round_transition (1), O→E: wrong_letter (2), A→E: wrong_letter (1) |
| 9 | AVO | A=33, O=13, V=10 | A=2, V=1, O=1 | A→A: aceito (1), V→V: aceito (1), A→O: wrong_letter (1), O→O: aceito (1) |
| 10 | BOA (arquivo duplicado de 9) | A=33, O=13, V=10 | A=2, V=1, O=1 | A→A: aceito (1), V→V: aceito (1), A→O: wrong_letter (1), O→O: aceito (1) |
| 11 | ZANGADO (N) | V=7, F=7, P=5 | F=1 | F→N: wrong_letter (1) |
| 12 | G | G=32, T=27, A=4 | G=1, T=2 | G→T: wrong_letter (1), T→T: aceito (2) |
| 13 | C | B=35, C=21, Y=4 | C=2, B=4 | C→C: aceito (2), B→C: wrong_letter (4) |
| 14 | D | D=55, A=1 | D=4 | D→D: aceito (4) |
| 15 | I no Soletrar | I=56, O=2, X=1 | J=4, I=1 | J→I: wrong_letter (4), I→V: wrong_letter (1) |
| 16 | CIDADE | D=56, A=12, I=7 | I=1, D=2, A=1 | I→I: aceito (1), D→D: aceito (2), A→A: aceito (1) |

## Achados e consequências

1. **I versus J (P0):** no anexo 15 o motor emitiu J quatro vezes quando `expected=I`; apenas após a rodada avançar para V emitiu I, que foi recusada como `wrong_letter`. O anexo 1 também mostra J incorreto (duas vezes) antes de I aceito. A prioridade é reproduzir falso J com pose de I e garantir que J verdadeiro continue funcionando.
2. **O versus A (P0/P1):** no anexo 4 houve empate `candidate=A, score=1`, `second=O, secondScore=1`. Durante alvo O confirmou A incorretamente uma vez e O corretamente duas. Nas capturas AVO (9 e 10 idênticas), A foi recusada quando O era esperada, seguida de O aceito. Score=1 é escore heurístico, não certeza estatística.
3. **E/S/M/N/T/R (P1):** predominância de candidatos concorrentes: E→A/O/S, S→A, M→B, N→W, T→F/A (T aparece), R→U. Há confirmações e decisões de `wrong_letter` com alvos correspondentes. A ausência da letra desejada como vencedora sugere investigar primeiro features/regras em vez de cooldown isoladamente.
4. **G/T (P1):** no anexo 12 há G confirmado e rejeitado enquanto alvo era T; depois T foi confirmado e aceito. Alterações de distância/ângulo são relatadas pelo testador, mas o log NÃO tem distância real nem handedness, então não prova essa causalidade.
5. **C/B (P2):** no anexo 13 tanto C correto quanto B errado foram confirmados enquanto o alvo era C, reproduzindo a instabilidade.
6. **D funcional (controle de regressão):** anexo 14 contém 4 confirmações D aceitas quando alvo D. Na palavra CIDADE (16), I, D, A, D foram aceitos. Conservar essas sequências ao recalibrar.
7. **I também funciona em circunstâncias particulares:** anexo 16 contém I aceito no Soletrar; não se deve bloquear I tentando eliminar falsos J.
8. **Limitação de duplicação:** os anexos 9 e 10 possuem SHA-256 idêntico; embora descritos como AVO e BOA, fornecem apenas uma evidência independente para análise quantitativa.
9. **Interpretação de `round_transition`:** o anexo 8 contém A confirmado durante `expected=E` mas `timeLeft=0` e `reason=round_transition`. Esse caso é rejeição por estado, diferente de `wrong_letter`; não misturar as causas.

## Proposta de ordem para Codex

- **Etapa P0 separada:** reproduzir I→falso J e pose O→A; validar arbitragem estática/dinâmica, desempate e scores saturados, sem aumentar cooldown arbitrariamente.
- **Etapa P1:** instrumentar/exportar agregados escalarizados para casos rotulados manualmente; validar pose de sinal com fontes de Libras e entradas positivas/negativas. Calibrar em lotes controlados E/S/O/A; M/N/T; R/U/H; G/Q; I/J/Y. Preservar controles A, D, J, Z, K, P.
- **Etapa P2:** avaliar sensibilidade de orientação, handedness e normalização geométrica, somente com evidências por mão e câmera; comparar latência e CPU com método repetível.
- **Gate de QA:** documentar resultados antes/depois por classe, positivos/negativos, confusion pairs, regressão da suíte atual 123/123 e casos reais com webcam; sem números inventados.

## Como melhorar o próximo registro

- Limpar ou iniciar novo buffer imediatamente antes de cada letra, registrar alvo e terminar em seguida: 120 eventos são rapidamente sobrescritos.
- Registrar tentativas explicitamente (id, início/fim, letra pretendida informada pelo testador, mão física, orientação, distância aproximada, iluminação), sem imagens, vídeos nem landmarks persistidos automaticamente.
- Preservar a série de candidatas/segundas candidatas, gaps, `hold_reset`, `motion_rejected`, `signconfirmed`, `ui_received`, `game_decision` e status de cooldown.
- Não chamar uma letra de treinada/validada até avaliação manual com referência adequada e evidência reproduzível.
