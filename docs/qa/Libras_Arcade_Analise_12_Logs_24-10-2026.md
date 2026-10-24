# Libras Arcade | Análise dos 12 logs reais (24/10/2026)

**Escopo:** buffers escalares exportados do `window.librasArcadeDiagnostics.read()` durante ensaios com webcam. Versão testada conforme relato: Fase 03.3B-1 (`bddf1a9` como HEAD antes das alterações locais; confirmar hash de trabalho antes de usar).

**Advertência:** Cada arquivo guarda até 120 eventos e pode começar no meio de uma tentativa. `game_decision` representa decisões capturadas na janela, não tentativas independentes. Contagens abaixo NÃO são precisão, recall, taxa de sucesso, distribuição representativa da população nem homologação. Mão/orientação/distância vêm do relato humano, **não** de campos dos logs. Não há imagens ou landmarks completos para reconstituir a geometria.

## Matriz de evidências

| Anexo | Ensaio informado | Candidatas predominantes (apenas amostras com mão) | Confirmações emitidas | Decisões importantes |
|---|---|---|---|---|
| 1 | I imóvel, mãos esquerda/direita | `I` 45, `F` 3, `O` 1 | `I` 2 | I→I (accepted): 3 |
| 2 | I com pequenas oscilações | `I` 32, `O` 8, `F` 1, `A` 1 | `J` 3, `I` 1 | J→I (wrong_letter): 3; I→I (accepted): 1 |
| 3 | J lento e completo | `I` 38, `A` 16, `O` 14 | `J` 4, `A` 1 | J→J (accepted): 4; A→J (wrong_letter): 1 |
| 4 | J rápido e haste curta | `I` 35, `O` 13, `A` 6, `G` 2 | `J` 4 | J→J (accepted): 4 |
| 5 | O frontal, esquerda | `A` 44, `O` 32, `X` 2, `C` 2 | `A` 3, `O` 1 | A→O (wrong_letter): 3; O→O (accepted): 1 |
| 6 | O frontal, direita | `O` 41, `A` 10, `B` 7, `X` 5 | `O` 5 | O→O (accepted): 5 |
| 7 | O lateral, ambas as mãos | `A` 26, `C` 16, `X` 6, `O` 4 | `A` 2 | A→O (wrong_letter): 2 |
| 8 | Soletrar, palavras com O | `O` 27, `L` 13, `A` 8, `B` 6 | `O` 3, `A` 1, `L` 1, `B` 1 | O→O (accepted): 3; A→O (wrong_letter): 1; L→L (accepted): 1; B→B (accepted): 1 |
| 9 | Soletrar, VIOLA | `I` 44, `V` 8, `O` 5, `A` 4 | `J` 2, `V` 1, `I` 1 | J→I (wrong_letter): 2; V→V (accepted): 1; I→I (accepted): 1 |
| 10 | Soletrar, C e G (primeira análise) | `B` 43, `F` 10, `C` 4, `O` 2 | `B` 3, `F` 1 | B→C (wrong_letter): 2; F→C (wrong_letter): 1; B→C (round_transition): 1 |
| 11 | Soletrar, C/G/I (segunda análise) | `I` 41, `G` 20, `T` 3, `A` 1 | `J` 3, `G` 1, `I` 1 | J→I (wrong_letter): 2; G→G (accepted): 1; I→I (accepted): 1; J→R (wrong_letter): 1 |
| 12 | Soletrar, P/V | `V` 38, `W` 6, `A` 4, `H` 3 | `V` 2 | V→P (wrong_letter): 2 |

## Constatações por anexo

**Anexo 1: I imóvel, mãos esquerda/direita.** I aceito em três decisões preservadas; J aparece como preparação, porém não há confirmação de J na janela. Buffer: 120 eventos.

**Anexo 2: I com pequenas oscilações.** Três J rejeitados com I esperado; um I aceito. O falso J não está resolvido. Buffer: 120 eventos.

**Anexo 3: J lento e completo.** Quatro J aceitos; houve uma confirmação A rejeitada com J esperado. Buffer: 120 eventos.

**Anexo 4: J rápido e haste curta.** Quatro J aceitos, inclusive tentativas rápidas/curtas segundo o relato do teste. Buffer: 120 eventos.

**Anexo 5: O frontal, esquerda.** Três A rejeitados para alvo O; um O aceito. A e O frequentemente empatam em 1,00. Buffer: 120 eventos.

**Anexo 6: O frontal, direita.** Cinco O aceitos; os demais eventos do buffer não provam ausência de falhas fora da janela. Buffer: 120 eventos.

**Anexo 7: O lateral, ambas as mãos.** Duas confirmações A rejeitadas com O esperado; nenhuma confirmação O nesta janela. Buffer: 120 eventos.

**Anexo 8: Soletrar, palavras com O.** Três O aceitos e um A rejeitado quando O era alvo. Há também confirmações de L e B em seus respectivos alvos. Buffer: 120 eventos.

**Anexo 9: Soletrar, VIOLA.** Dois J rejeitados para alvo I; I finalmente aceito. V aceito. Buffer: 109 eventos.

**Anexo 10: Soletrar, C e G (primeira análise).** Dois B e um F rejeitados para alvo C; uma decisão B/C foi round_transition. Buffer: 120 eventos.

**Anexo 11: Soletrar, C/G/I (segunda análise).** G e I aceitos; dois J rejeitados quando I era alvo e um J rejeitado quando R era alvo. Buffer: 120 eventos.

**Anexo 12: Soletrar, P/V.** Duas confirmações V rejeitadas com P esperado; P aparece em segunda posição com escores abaixo de V. Buffer: 120 eventos.


## Questões prioritárias

### P0: falsa confirmação de J enquanto o alvo é I
- Há 3 eventos J/I rejeitados no anexo 2, 2 no anexo 9 e 2 no anexo 11. Também há 1 J/R rejeitado no anexo 11. Os exemplos mostram confirmações indevidas mesmo depois da regra de três passos descendentes.
- J genuíno permaneceu reconhecível nas janelas de testes 3 e 4, com quatro aceitações em cada. Corrigir falso positivo sem rejeitar J legítimo, incluindo haste curta e variação de velocidade.
- Há exemplos de `motion_preparing` e `motion_in_progress` afetando estabilização da pose estática. Não assumir causalidade geométrica específica sem dados rotulados.

### P1: O versus A com lateralidade e orientação
- Anexo 5 (esquerda/frontal): 3 A/O rejeitados e 1 O/O aceito; anexo 6 (direita/frontal): 5 O/O aceitos; anexo 7 (lateral): 2 A/O rejeitados.
- O e A podem empatar em 1,00; mudar apenas ordem das regras inverte o erro e não é solução.
- Verificar espelhamento da câmera, handedness real e features geométricas invariantes a orientação; coletar features escalares locais rotuladas antes de recalibrar.

### P1: P versus V
- Anexo 12: dois V/P rejeitados; V aparece frequentemente com escore 1,00 e P como segunda candidata.
- Avaliar orientação (V para cima conforme proposta do usuário) como atributo discriminativo **sem impor orientação arbitrária antes de validar variantes legítimas com referência de Libras**.

### P1: C versus B, e G versus T
- Anexo 10: 2 B/C rejeitados e 1 F/C rejeitado. Rever curvatura, extensão dos quatro dedos, oclusão e guia pedagógico de C (divergência anterior relatada pelo Codex).
- Anexo 11: G aceito; mas há alternância G/T e resets de hold na segunda análise. Não atribuir a distância/orientação como causa sem medidas.

## Instruções para Codex
1. Fazer commit local das alterações anteriores apenas após aprovação do usuário e revisão de staging. Trabalhar em branch isolada ou worktree de desenvolvimento existente, sem `push` ou `merge`.
2. P0: reproduzir falso J no caminho completo `LibrasEngine.update()` com fixtures variadas; adicionar negativos de I e positivos de J; corrigir por geometria temporal e observar eventos, sem aumentar `cooldown` indiscriminadamente.
3. P1: revisar O/A, P/V, C/B, G/T por pares. Introduzir atributos escalares derivados rotulados com opt-in e sem armazenar vídeo ou landmarks brutos automaticamente; identificar handedness e orientação, confrontar variantes legítimas de Libras.
4. Evitar calibração geral simultânea de E/M/N/S/T/R sem amostras; preservar D/Z, navegação, Soletrar e suíte anterior 130/130.
5. Medir taxas por tentativas realmente rotuladas e não por quantidade de eventos do buffer; declarar limitação quando não houver dados para alterar limiares.

## Integridade das fontes
Todos os 12 arquivos JSON foram lidos integralmente. Os arquivos refletem trechos de diagnósticos, não rastreamento completo de 10 tentativas por mão. Não foi feita nenhuma alteração no repositório local do usuário.