# Libras Arcade | Diagnóstico contrastivo E/M | FASE 03.3B-2C.1

**Estado:** análise de capturas reais e das regras vigentes. Nenhuma regra, instrumento de captura, jogo ou tempo foi alterado. E e M continuam sem recuperação ou homologação.

## Fontes e método

Foram lidos o [relatório da primeira rodada](Libras_Arcade_Analise_EM_Webcam_033B2C_2026-10-26.md), o [relatório da segunda rodada](Libras_Arcade_Analise_EM_Webcam_Rodada2_2026-10-26.md), o JSON externo `qa-em-fase-033b2c-webcam teste 2.json` e o código de `js/libras.js` e `js/diagnostics.js`. Os dois relatórios originais foram preservados neste histórico técnico; o JSON bruto continua fora do repositório. Ele contém 16 capturas rotuladas; as quatro primeiras são objetos idênticos aos do JSON da primeira rodada. Portanto, são **12 capturas posteriores**, sem contar as quatro repetidas como novos ensaios. As tentativas foram rotuladas como frontais, distância média, espelho ativo e duas mãos físicas. O rótulo não verifica sozinho a execução física do sinal.

As medidas abaixo são medianas dos eventos `recognition` com `handPresent=true` preservados até a primeira `signconfirmed`, inclusive. Foram conferidas a primeira letra confirmada, `game_decision`, as candidatas e os `hold_reset`. Os frames da mesma tentativa são correlacionados. Os anéis das capturas 1, 2, 4, 5, 9 e 13 chegaram a 120 eventos; o começo pode ter sido sobrescrito. A captura 1 teve duas confirmações e não serve como ensaio único limpo de desempenho, embora a primeira confirmação e os frames que a precederam continuem úteis ao diagnóstico. Não há estimativa populacional de precisão.

## Resultado da primeira confirmação

| Capturas | Rótulo e mãos | Primeira emissão | Decisão do Treino | Localização da falha |
| --- | --- | --- | --- | --- |
| 1–2 | E direita, esquerda | O, A | Ambas `wrong_letter` | E não se tornou candidata principal nos frames retidos antes da emissão. |
| 3–6 | M direita/esquerda, duas rodadas | B nas quatro | Todas `wrong_letter` | `scoreM` mediano 0; B predominou antes da emissão. |
| 7–8 | B esquerda, direita | B nas duas | Ambas `accepted` | Controles B aceitos. |
| 9–10 | S direita, esquerda | O nas duas | Ambas `wrong_letter` | Achado para a branch de S; nenhuma regra S/O alterada aqui. |
| 11–12 | A esquerda, direita | A nas duas | Ambas `accepted` | Controles A aceitos, apesar de `scoreE` alto. |
| 13–14 | O direita, esquerda | O nas duas | Ambas `accepted` | Controles O aceitos. |
| 15–16 | N esquerda, direita | U nas duas | Ambas `wrong_letter` | Achado para a branch de N; nenhuma regra N/U alterada aqui. |

Nas tentativas E/M, `signconfirmed` e `game_decision` mostram que o jogo recebeu a letra emitida e rejeitou corretamente a letra diversa da pretendida. E/esquerda teve 15 `hold_reset` preservados, mas E nunca foi primeira candidata nos 47 frames com mão disponíveis antes da confirmação A. Os resets podem atrasar a decisão; não explicam a derrota de E. Em M, B predominou em 19/21, 12/12, 12/14 e 12/12 frames retidos, respectivamente. O problema primário observado é geométrico/classificatório, não um bloqueio da interface.

## E frente a A, O e S

`RULES.E` é a média de quatro curvaturas altas e da distância **grande** entre polegar e ponta do médio. Não exige posição individual das pontas perante a palma nem oposição do polegar. `RULES.A` usa baixa extensão dos quatro dedos e polegar afastado; aparece antes de E na ordem das regras. `RULES.O` usa baixa extensão de indicador/médio/anelar e polegar próximo do médio; `RULES.S` compartilha as quatro curvaturas de E e usa `thumbAcross`. O maior escore vence sem margem mínima; empate preserva a letra anterior na ordem das regras.

| Captura | Vencedora predominante | `scoreE` | Concorrente relevante | `thumbMiddlePinch` | `thumbIndexPinch` | `tipPalmMean` |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| E direita, 1 | O em 10/11 frames | 0,558 | O 0,999 | 0,421 | 0,346 | 0,366 |
| E esquerda, 2 | A em 34/47 frames; X em 12 | 0,686 | A 1,000 | 0,681 | 0,592 | 0,380 |
| S direita, 9 | O em 14/16 frames | 0,800 | O 1,000; S 1,000 | 0,385 | 0,477 | 0,260 |
| S esquerda, 10 | O em 13/14 frames | 0,814 | O 0,980; S 0,800 | 0,437 | 0,568 | 0,218 |
| A esquerda, 11 | A em 13/13 frames | 1,000 | A 1,000 | 0,819 | 0,652 | 0,207 |
| A direita, 12 | A em 12/13 frames | 0,988 | A 1,000 | 0,852 | 0,679 | 0,291 |
| O direita, 13 | O em 12/12 frames | 0,577 | O 1,000 | 0,248 | 0,228 | 0,356 |
| O esquerda, 14 | O em 12/16 frames | 0,099 | O 1,000 | 0,345 | 0,294 | 0,377 |

As medianas acima são por captura, não pares de frames sincronizados; `scoreE` e o escore concorrente precisam ser comparados evento a evento antes de calibrar uma regra. E/direita tem curvaturas medianas de indicador/médio/anelar/mínimo de 0,474/0,585/0,623/0,558: vários componentes de E ficam apenas parciais, enquanto O satura. E/esquerda tem 0,286/0,500/0,703/0,691 e `thumbOut≈0,484`: indicador e médio ainda reduzem E, enquanto A satura. Em A verdadeira, `scoreE` já chega a 0,988–1,000; aumentar E indiscriminadamente pode transformar A correto em falso E. S verdadeira pontua E perto de 0,8 e sua concorrência com O é um problema próprio da branch de S.

Nos ensaios disponíveis, `thumbIndexPinch` distingue a captura E/direita das O (0,346 contra 0,228/0,294); `thumbOut` e `tipPalmMean` ajudam a contrastar as E observadas com A; `tipPalmMean` distingue as E observadas das S. **Nenhuma medida isolada foi validada como discriminante:** `tipPalmMean` de E/direita (0,366) quase coincide com O/direita (0,356) e O/esquerda (0,377); `thumbMiddlePinch` de E/direita (0,421) é próximo do de S/esquerda (0,437); `tipClusterIMR` de E/direita e O/direita coincide perto de 0,189. Os dados sugerem avaliar relações conjuntas de polegar e pontas, por mão e ao longo do hold, sem converter estas medianas em limiares.

**Instrumentação:** a calibração opcional já registra os quatro `ext*` e `curl*`, `thumbMiddlePinch`, `thumbIndexPinch`, `thumbOut`, `thumbAcross`, `tipPalmMean`, escores E/A/O/S, candidata/segunda colocada, `gap`, resets, confirmação, recebimento pela UI e decisão do jogo. Falta a distância **de cada ponta** ao centro da palma; a média atual oculta qual dedo está junto da palma. Também faltam relações locais de posição/oclusão do polegar e confiança anatômica individual dos landmarks. Acrescentar esses escalares somente à captura opcional se a comparação pareada e a inspeção visual mostrarem que são necessários para separar E dos controles. Não registrar imagens, vídeo ou landmarks completos automaticamente.

## M frente a B: geometria detectada primeiro

`handScale = max(dist3D(pulso, MCP do médio), 1e-4)`. Cada `ext*` é a distância ponta–pulso menos a distância MCP–pulso, dividida por essa escala. Cada `curl* = 1 − dist3D(MCP,ponta) / [dist3D(MCP,PIP)+dist3D(PIP,ponta)]`: a razão de curvatura independe de `handScale`. `RULES.M` exige curvatura alta de indicador/médio/anelar, baixa extensão do mínimo e polegar próximo ao MCP do mínimo. B pede quatro extensões altas e polegar pouco atravessado.

| Captura | `extIndex/Middle/Ring` | `curlIndex/Middle/Ring` | `extPinky` | `thumbPinkyMcp` | `tipPalmMean` | `scoreM/B` |
| --- | --- | --- | ---: | ---: | ---: | ---: |
| M direita, 3 | 1,177 / 1,438 / 1,383 | 0,002 / 0,001 / 0,000 | 0,865 | 0,806 | 1,344 | 0,000 / 0,800 |
| M esquerda, 4 | 1,384 / 1,703 / 1,748 | 0,002 / 0,001 / 0,001 | 1,440 | 1,058 | 1,749 | 0,000 / 0,800 |
| M direita, 5 | 1,417 / 1,787 / 1,776 | 0,001 / 0,001 / 0,001 | 0,617 | 1,282 | 1,676 | 0,000 / 0,800 |
| M esquerda, 6 | 1,457 / 1,786 / 1,711 | 0,001 / 0,000 / 0,000 | 0,911 | 1,163 | 1,683 | 0,000 / 0,800 |
| B esquerda, 7 | 0,805 / 0,918 / 0,908 | 0,001 / 0,001 / 0,000 | 0,725 | 0,586 | 0,893 | 0,000 / 1,000 |
| B direita, 8 | 0,707 / 0,816 / 0,788 | 0,004 / 0,002 / 0,001 | 0,631 | 0,460 | 0,789 | 0,040 / 1,000 |

Nas quatro M, os cinco componentes de M estão na região desfavorável: três dedos quase retos, mínimo estendido e polegar distante do MCP do mínimo. A baixa curvatura não decorre de um erro de escala isolado, pois `fingerCurl()` é uma razão interna ao dedo. As extensões e a distância `tipPalmMean` são ainda maiores do que nos B verdadeiros, mas têm dependência da escala e da pose projetada. `pointAngleIM` em M ficou perto de ±164–167° (dedos para baixo na imagem), enquanto em B ficou perto de −11°/18° (para cima); direção é pista de contexto, **não** prova de M e não deve promover uma mão aberta a M.

O JSON prova a incompatibilidade da **geometria retornada** com a forma fechada exigida por `RULES.M`; não separa três hipóteses físicas: execução/convenção de M distinta da modelada, oclusão e estimativa errada do MediaPipe, ou combinação de ambas. O aplicativo já desenha articulações e conexões ao vivo no Canvas sobre o vídeo espelhado (`js/app.js` e `css/style.css`); usar esse overlay existente, com consentimento da pessoa que sinaliza, para conferir MCP/PIP/pontas e o polegar durante M. Não há necessidade demonstrada de código novo para o primeiro exame visual, e o overlay 2D não valida a profundidade `z`. Se a divergência persistir visualmente, coletar apenas escalares opcionais de relações de ponta com palma e qualidade observável, após definir qual ambiguidade resolverão. Não usar alta extensão como evidência positiva de M.

## Encaminhamento delimitado para N e S

**S:** as duas capturas S emitiram O. Na direita, `scoreS` e `scoreO` tiveram mediana 1,000; quando empatam no mesmo frame, O precede S em `RULES`. Na esquerda, O 0,980 supera S 0,800 nas medianas. `scoreE` de 0,800/0,814 evidencia risco de qualquer ampliação ampla de E. Os responsáveis por S devem comparar escores no mesmo frame e validar controles O/E; este worktree não altera S nem O.

**N:** as duas capturas N emitiram U. Indicador e médio detectados estavam retos (`curl≈0`) e estendidos (`extIndex≈1,107/1,161`, `extMiddle≈1,270/1,332`), enquanto `RULES.N` requer curvatura alta desses dois dedos. `pointAngleIM≈−177,6°/159,1°` indica vetor dos dedos para baixo na imagem. `RULES.U` usa `uprightScore = 1 − sidewaysScore`, que recompensa tanto cima quanto baixo; `RULES.N` não usa direção. A sugestão de limitar U a cima e N a baixo é **hipótese para a branch de N**, dependente de validação pedagógica e controles reais. Trocar só o termo de direção de U por um termo que zerasse nos frames para baixo reduziria seu escore em **no máximo 1/7**: medianas contrafactuais de U ainda seriam cerca de 0,834/0,800, acima de N 0,588/0,500; na direita N também permanece abaixo do limiar global 0,55. `pointAngleIM` mede direção projetada dos dedos, não a orientação 3D da palma. Nem a equivalência linguística N=U invertido nem a segurança de rejeitar U descendente foram demonstradas. Preservar N/U e encaminhar estas evidências aos colaboradores, sem integrar branches nesta fase.

## Plano incremental e critério de recuperação

1. **E:** revisar nos frames da mesma tentativa as margens `scoreE−scoreA/O/S`, curvaturas por dedo, distâncias de polegar, `tipPalmMean` e duração de cada candidata. Verificar visualmente E verdadeiro e controles A/O/S com referência pedagógica. Testar se uma combinação de posição das pontas e polegar separa positivos de controles; se a média esconder diferenças relevantes, instrumentar apenas distâncias individuais de ponta–palma e relações locais indispensáveis. A mudança futura deve ser localizada em E, com negativos A/O/S e outras concorrentes relevantes.
2. **M:** conferir primeiro no overlay se o esqueleto acompanha a mão e se a pose física corresponde à forma que a regra pretende detectar. Se houver divergência do rastreador, melhorar aquisição/visibilidade ou caracterizar a limitação antes de calibrar M. Se o rastreamento estiver coerente e a forma pedagógica diferir do modelo, definir a geometria correta com especialista e controles B/N, só depois propor regra local. Repetir com iluminação, distância e orientação controladas; não inferir solução de `scoreM=0` sozinho.
3. **Antes de qualquer correção:** usar conjuntos distintos de desenvolvimento e validação, tentativas independentes curtas em ambas as mãos, e medir primeira candidata, margem evento a evento, permanência por 600 ms, resets, `signconfirmed`, `ui_received` e `game_decision`. Testar B/A/O/S/N verdadeiros, ruído/oclusão, Treino e Soletrar, cooldown e rearmamento, além das suítes completas. Após mudança funcional, colher nova webcam independente; fixtures e replay não homologam E/M.

**Limites:** sem landmarks completos, imagens ou vídeo destas capturas, a postura física de M e a qualidade de landmarks individuais não podem ser auditadas retrospectivamente. A escala 3D é aproximada, as medições são de uma pessoa e de poucas tentativas frontais, e seis buffers perderam parte do começo. Os valores são pistas de investigação, não novos limiares de produção. R/U, N/S, A/O/B, demais letras, interface e máquina temporal permaneceram intocados.
