# Libras Arcade | Homologação real da Fase 03.3B-2A
**Data:** 25/10/2026  
**Fonte:** `qa-libras-fase-033b2a.json` e observações manuais do avaliador.

## Escopo e limites
- Foram analisadas **12 capturas**, não 30 capturas independentes. Várias capturas contêm mais de uma confirmação ou rodada.
- Cada captura guarda até **120 eventos escalares**. As capturas 1, 4 e 8 chegaram ao limite e perderam o evento `calibration_start`, portanto a mão física ou orientação dessas capturas **não deve ser inferida como fato**.
- Os escores são de regras heurísticas, não probabilidades. Confirmações registradas por sessão **não equivalem a taxas de sucesso por tentativa física**.
- O avaliador relatou **P, V, K e A satisfatórios**, **O frontal direito geralmente correto**, **O frontal esquerdo irregular**, e **O lateral de ambas as mãos falhando/confundindo-se com A**.

## Resumo por captura
| ID | Rótulo preservado | Confirmações e decisão do jogo | Observação |
|---|---|---|---|
| 1 | Inicial sobrescrito (alvo P) | P aceito 3; V errado 1 | Possível resíduo de competição P/V |
| 2 | P, direita, front | P aceito 3 | Bom |
| 3 | V, direita, front | V aceito 3 | Bom |
| 4 | Inicial sobrescrito (alvo V) | V aceito 2; K errado 2 | **Competição V/K real ainda merece controle** |
| 5 | K, esquerda, front | K aceito 4 | Bom |
| 6 | K, direita, front | K aceito 3 | Bom |
| 7 | O, direita, front | O aceito 3 | Sucesso registrado |
| 8 | Inicial sobrescrito (alvo O) | A errado 4 | A/O alterna e empata frequentemente |
| 9 | O, esquerda, front | A errado 3; O aceito 0 | Falha comprovada nesta janela |
| 10 | O, direita, front | A errado 3; O aceito 0 | **Conflita com o relato de O frontal direito bem-sucedido. Investigar rótulo de orientação ou variação de execução** |
| 11 | A, direita, front | A aceito 3 | Bom |
| 12 | A, esquerda, front | A aceito 3; B errado 1 quando o alvo era Z | B não ocorreu com A como alvo |

## O/A: padrões geométricos exploratórios
Médias dos eventos `recognition` com mão presente. **Não converter em limiares sem tentativas rotuladas confiáveis.**

| Captura | O | A | Área projetada da palma | Profundidade projetada | Empates A/O* |
|---|---:|---:|---:|---:|---:|
| 7: O direita bem-sucedido | 0,950 | 0,832 | 0,448 | 0,063 | 0/27 |
| 8: O falhou, metadados sobrescritos | 0,909 | 0,923 | 0,488 | 0,163 | 42/73 |
| 9: O esquerda falhou | 0,946 | 0,953 | 0,113 | 0,278 | 31/38 |
| 10: O direita falhou | 0,877 | 0,896 | 0,119 | 0,331 | 29/40 |

*Empates exatos de escores A e O com escore positivo.

**Interpretação:** há diferenças associadas às condições da captura, especialmente à área projetada e profundidade. Elas **não demonstram causalidade nem justificam ajuste automático de limiar**. A captura 8 mostra que a área projetada isolada não separa O e A. A captura 10 exige esclarecer se o gesto foi lateral e foi rotulado automaticamente como `front`.

## Decisões sugeridas
1. **03.3B-2A: revisão estática concluída, homologação funcional parcial.** P, V, K e A foram considerados satisfatórios pelo avaliador, mas o registro preserva confusões residuais P/V e V/K.
2. **O/A segue aberto**, sobretudo lateral e mão esquerda. Não alterar a ordem das regras nem aumentar a pontuação de O indiscriminadamente.
3. Corrigir o **protocolo de captura**: declarar `orientation` verdadeira por tentativa, indicar lado físico, uma tentativa por captura, salvar antes do limite de 120 eventos, e registrar manualmente sucesso/falha.
4. **Próxima investigação 03.3B-2A.1**: diagnóstico de O/A com controles A verdadeiro nas mesmas orientações e mãos; controle V/K para preservar a correção de P.
5. Só propor critérios de classificação após reprodução e validação da geometria com gestos pedagógicos corretos.

## Ambiente e segurança
Trabalhar no worktree de Codex `fase-03-cooldown-recuperado`. Preservar o CodeRabbit, histórico e os JSONs locais; não realizar commit, push, merge ou operações destrutivas automaticamente. Dados escalares locais, sem imagens ou landmarks completos automáticos.
