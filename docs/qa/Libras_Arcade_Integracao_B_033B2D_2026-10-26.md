# FASE 03.3B-2D — integração seletiva e B versus quatro dedos separados

**Base local:** `recovery/fase-033b13-6170a2d`, HEAD `82ae0bc`, worktree `fase-03-cooldown-recuperado`. O status inicial já continha alterações documentais e da instrumentação E/M da 2C.2; foram preservadas. O [plano recebido](Libras_Arcade_Plano_Integracao_ENSBM_2026-10-26.md) é referência preliminar. Os arquivos externos foram lidos como código de comparação, não executados nem incorporados integralmente. O caminho `/mnt/data/libras.js` naquele plano corresponde ao arquivo avulso em Downloads nesta máquina.

## Evidência e causa

No motor anterior, `RULES.B` tirava a média de extensão dos quatro dedos e polegar próximo do MCP médio. Nenhum par adjacente participava. Assim, quatro dedos muito separados ainda podiam obter B=1,00; e os quatro registros reais rotulados M da rodada E/M deram B≈0,80 apesar do polegar longe (`thumbAcross` mínimo 0,60 nas amostras antes da primeira confirmação). Isso é falha de pontuação da regra B, não demonstra M correto nem erro do estado temporal.

O JSON externo `qa-em-fase-033b2c-webcam teste 2.json` contém 16 capturas, com quatro repetições da rodada anterior. Nos controles B independentes da rodada 2, a mão esquerda e direita confirmaram B. Antes da primeira confirmação, a razão lateral I–M recuperável de `abs(crossOrder2DIM)/palmAxisIM` variou **1,56–1,74** em 13 frames da esquerda e **1,38–1,51** em 13 da direita. O polegar ficou em `thumbAcross<0,435` em 12/13 frames de cada uma. Os pares M–R e R–mínimo **não existem** no JSON antigo; a nova pontuação B desses frames não pode ser reconstruída. Os sete screenshots descritos no plano indicam B correto nas duas mãos, B excessivamente aberto aceito e M/O/B ambíguos, mas as imagens não estavam disponíveis para inspeção direta nesta execução. O relato não prova correspondência de cada landmark às articulações.

## Matriz de comparação das três versões

| Regra | Worktree antes da 2D | Avulso `libras.js` | `Projeto de Libras-pass.zip` | Métrica e vantagem proposta | Risco, dependência e evidência | Recomendação |
| --- | --- | --- | --- | --- | --- | --- |
| B | Média de quatro extensões + polegar; sem pares | Produto de três distâncias brutas entre pontas e orientação para cima | Mínimo das extensões, polegar e produto de três distâncias brutas | Gating individual I–M, M–R, R–mínimo elimina a mão espalhada | Limites avulsos I–M 0,26–0,36 rejeitariam parte do B esquerdo real (`spreadIM` mediano 0,334); ZIP tem R–mínimo **0,31–0,30** invertido. Nenhum arquivo trouxe testes ou controle real de quatro separados. Mudanças de orientação podem rejeitar variantes. | **Adaptar só o conceito de pares**, com projeção lateral relativa às bases e tolerância; validar em webcam. |
| E | Média de quatro `curl` altos e polegar–médio distante | Curvatura + baixa extensão + polegar recolhido | Curvatura média, mínima individual e faixas de duas relações do polegar; arbitragem E/A/S fora da regra | Curvatura individual e localização do polegar poderiam separar E de A/S | E real emitiu O/A; A real obteve `scoreE` mediano 0,988/1,000, S real ≈0,8. Faixas externas sem replay contrastivo, arbitragem altera A/S. | **Investigar** com escalares ponta–palma e polegar da 2C.2 antes de adaptar. |
| S | Média de quatro `curl` e polegar cruzado | Punho médio × polegar cruzado | Mínimo de três curvaturas + indicador flexionado + polegar cruzado, com arbitragem S/E/N | Exigir fechamento individual pode reduzir confusão | S real emitiu O nas duas mãos; mudança pode competir com E/A/O. Branch do colega e seus testes não foram fornecidos aqui. | **Investigar na etapa de S**, sem alterar esta branch agora. |
| N | Dois `curl`, anelar/mínimo fechados e polegar junto do anelar | Dois dedos estendidos apontados para baixo | Dedos dobrados e polegar junto do anelar; arbitragem S/N | Duas modelagens anatômicas incompatíveis | N real emitiu U nas duas mãos; `downScore` isolado poderia roubar U rotacionado. Falta pose validada e evidência da branch do colega. | **Investigar** a forma pedagógica e webcam; não misturar as versões. |
| M | Três `curl`, mínimo fechado e polegar perto do MCP do mínimo | Três dedos relativamente retos, mínimo recolhido, abertura média e direção para baixo | Modelo de punho/`curl` e polegar junto do mínimo | Avulso tenta cobrir dedos distais retos; ZIP exige polegar | Quatro M reais emitiram B com `scoreM≈0`, `ext*` altos e `curl*` quase nulos. Avulso não exige polegar sob os três dedos; ZIP mantém a modelagem que falhou. Sem overlay real confiável não há positivo seguro. | **Investigar rastreamento e anatomia** antes de regra M. |

Ambas as versões externas também modificam configurações e outras regras, inclusive R/U e comportamento temporal. O ZIP muda suavização e arbitragem de candidatos. Nenhuma dessas mudanças foi portada. O ZIP não inclui suíte de testes. As contribuições específicas dos colegas para E/N/S não tinham patch, commit ou resultado verificável disponível nesta análise; estas duas versões não devem ser atribuídas automaticamente a eles.

## Correção localizada de B

Para cada par adjacente, `lateralTipRatio` projeta a diferença entre pontas no eixo **2D entre os MCPs do próprio par** e a divide pelo quadrado do comprimento desse eixo. O resultado é abertura lateral da ponta em unidades da largura entre as bases: 1 significa mesma abertura lateral, 2 permite uma abertura duas vezes maior e 3 representa divergência clara. A projeção remove o desnível natural das pontas no eixo longitudinal dos dedos e conserva espelho, rotação no plano e escala comum. Se as bases se sobrepuserem na projeção, a razão é inválida para B e o escore cai a zero.

`RULES.B` agora usa o **menor** dos quatro graus de extensão, do polegar recolhido e das três proximidades laterais graduais (`fuzzyOff(ratio, 2, 3)`). A conjunção suave exige todos os elementos anatômicos sem multiplicar pequenas perdas de oito fatores. A faixa 2–3 é uma hipótese interpretável: os controles B anteriores já alcançam 1,74 em I–M, e o intervalo mantém folga para variação. Não foi ajustada com controles reais de quatro dedos separados ou com M–R/R–mínimo reais. Não se alteraram `RULES.U`, R, E, M, N, S, W, limiar global, hold, cooldown, câmera ou jogos. Os três escalares novos entram no objeto geométrico já calculado por frame; `state.features` mantém suas chaves antigas. Só a calibração voluntária registra as razões.

Para não atribuir a postura de controle à letra B, `startCalibration()` aceita alternativamente `controlPose: 'four_spread'` sem `intendedLetter`. O resumo mantém `intendedLetter: null`, conserva o rótulo fora do anel de 120 eventos e marca qualquer primeira confirmação como `unexpected`. O classificador não recebe esse rótulo. Imagens, vídeos e landmarks completos continuam fora dos eventos.

| Cenário | Antes | Depois / limite |
| --- | --- | --- |
| Fixture de B unido, projeções espelhadas | B confirmado | B confirmado, candidata contínua por 600 ms |
| Fixture de quatro dedos claramente separados | B incorreto (teste vermelho) | B não é candidata/confirmada |
| Quatro capturas M reais antes da primeira confirmação | B mediano 0,80 | B=0 nos frames com `thumbAcross≥0,60`; isso é consequência numérica do novo gate, **não replay do motor** |
| Dois controles B reais | B mediano 1,00 | I–M e polegar passam em 12/13 frames estáveis por mão; pontuação completa indeterminada sem M–R/R–mínimo |
| W, três dedos voltados para baixo, modelo fechado de M, polegar aberto | B podia receber parcela alta pela média | Fixtures não confirmam B; a legitimidade anatômica de M continua não validada |

## Verificação e custo

Cinco testes novos verificam B unido nas duas projeções espelhadas, abertura natural, quatro separados, W, poses M modeladas e três dedos para baixo, polegar aberto, oscilação, projeção oblíqua, hold, Treino/Soletrar, cooldown/rearmamento e captura de controle. A fixture de M fechado prova apenas exclusão de B naquela geometria construída. Os 16 registros reais são escalares; não fornecem landmarks completos para uma execução fiel do motor novo. A suíte anterior cobre R/U/A/O e demais fluxos.

`npm.cmd test`: **196/196**; `npm.cmd run test:camera`: **183/183**; `npm.cmd run test:performance`: **13/13**. A última testa contratos lógicos, não FPS/CPU/RAM. Por mão válida, há três produtos escalares e divisões adicionais, sem busca, buffer ou alocação de landmarks; o objeto geométrico já existente ganha três números. O custo real por inferência não foi medido.

## Homologação independente de B

1. Confirmar que o overlay acompanha punho, MCPs e pontas; registrar versão/HEAD, navegador, câmera, iluminação, mão física, espelhamento, distância e orientação **real**. Usar Treino A–Z com alvo B. Fazer tentativas separadas para B com dedos unidos e quatro dedos claramente separados, em ambas as mãos. Não chamar a segunda pose de letra “4”. Incluir W verdadeiro, polegar aberto e tentativa M anatomicamente validada como controles.
2. Antes de cada positivo, iniciar `window.librasArcadeDiagnostics.startCalibration({ intendedLetter: 'B', physicalHand: 'right', orientation: 'front', distance: 'medium', mirrored: true })`, corrigindo os metadados de cada tentativa. Para quatro separados, substituir apenas o rótulo por `controlPose: 'four_spread'` e omitir `intendedLetter`. O alvo do jogo não é fornecido ao classificador.
3. Sustentar a pose por pelo menos 600 ms; encerrar após a **primeira confirmação** ou cerca de 1,2 s sem confirmação com `const tentativa = window.librasArcadeDiagnostics.stopCalibration()`. Guardar manualmente `tentativa.calibration` e `tentativa.events`, uma tentativa por arquivo. Observar `lateralRatioIM/MR/RP`, quatro `ext*`, `thumbAcross`, `scoreB`, candidata/segunda, margem, `hold_reset`, `signconfirmed`, `ui_received` e `game_decision`. Se o anel atingir 120 eventos, reduzir a duração e repetir a tentativa; não contar amostras como ensaios independentes.
4. Repetir em Soletrar para B aceito, depois em espelhamento oposto e oblíqua, cada condição identificada. B unido deve manter B até a confirmação e chegar ao jogo; quatro separados não podem emitir B, mesmo quando o alvo é B. Se B real for rejeitado, comparar qual par e o polegar bloquearam. Se quatro separados vencerem, verificar projeção lateral, profundidade e overlay antes de alterar números. Repetir R/U e W como controles de regressão.

Sem essa rodada, **B está corrigido apenas em fixtures e parcialmente sustentado pelos escalares antigos, não homologado na webcam**.

## Sequência de integração posterior

1. **E:** usar capturas novas E/A/O/S com os escalares individuais da 2C.2; exigir separação por mão, análise temporal e negativos A/O/S. Só portar curvatura mínima/posição do polegar se superar os controles fora do conjunto usado para escolher a regra. Preservar A/O.
2. **S:** receber patch e testes do colega; comparar S/O reais e E/A. Avaliar fechamento individual e polegar cruzado em conjunto com a futura E, sem arbitragem de desempate sem dados.
3. **N:** obter definição pedagógica e capturas N/U/H/P com orientação e polegar verificáveis. Comparar as duas hipóteses externas, inclusive U rotacionado. Não reduzir U globalmente nem usar direção para baixo como único discriminante.
4. **M:** validar overlay e articulações em M/B nas duas mãos. Medir flexão MCP versus PIP/DIP, polegar sob três dedos e mínimo. Separar M real de B/N/W e de três dedos para baixo sem polegar correto. Só então modificar `RULES.M`; nova webcam é obrigatória.

Para CodeRabbit: revisar o denominador quando MCPs colapsam em vista lateral, a faixa 2–3 ainda sem M–R/R–mínimo reais, `Math.min` versus a média antiga, possível competição B/F/W em projeções difíceis, ausência de razão 3D para separação fora do plano e a semântica `controlPose`/`unexpected`. Nenhum teste sintético autoriza declarar precisão de B, E, N, S ou M.
