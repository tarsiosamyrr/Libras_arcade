# FASE 03.3B-2D.1 — revisão de B após webcam real

**Estado:** correção localizada implementada, com replay escalar e testes automatizados; **homologação independente ainda pendente**. Branch `recovery/fase-033b13-6170a2d`, HEAD inicial `82ae0bc`, worktree `fase-03-cooldown-recuperado`. Alterações não commitadas anteriores foram preservadas.

## Fonte e unidade de análise

O [relatório de QA recebido](Libras_Arcade_QA_B_033B2D_Webcam_2026-10-27.md) foi incorporado ao projeto com apenas as quebras de linha Markdown normalizadas para o gate do diff. O JSON `qa-b-fase-033b2d-webcam.json` permaneceu em Downloads; contém quatro tentativas rotuladas e apenas eventos escalares, sem landmarks completos para executar o motor novo sobre os frames originais. São **quatro ensaios**, não dezenas de amostras independentes. As comparações abaixo usam frames `recognition` com mão antes da primeira confirmação **visível**; a tentativa `four_spread` esquerda perdeu eventos do início porque o anel chegou a 120.

| Tentativa | Frames prévios visíveis | Primeira confirmação preservada | Decisão do Treino | Resumo da calibração |
| --- | ---: | --- | --- | --- |
| B unido, direita | 11 | B | B aceito | 1 confirmação |
| B unido, esquerda | 30 | B | B aceito; houve 5 resets anteriores | 1 confirmação |
| Quatro separados, direita | 14 | **B indevido** | B aceito porque era o alvo | 1 confirmação |
| Quatro separados, esquerda | 21 | W | W rejeitado pelo jogo | **2 confirmações**, só um `signconfirmed` no anel; a identidade da outra é desconhecida |

## Causa comprovada

`RULES.B` já usava o **mínimo** entre quatro extensões, polegar e três pares laterais. Portanto não havia compensação entre pares. O defeito era a transição `fuzzyOff(lateralRatio, 2, 3)`: uma abertura de 2,10 vezes a largura entre MCPs ainda recebe escore ≈0,90. Na captura `four_spread` direita, as razões medianas I–M/M–R/R–mínimo eram 1,993/2,067/2,107; as quatro extensões e o polegar passavam. B teve mediana 0,892, superou F (0,75) e liderou **11 frames consecutivos**, de `at≈578746` a `579313`, antes de `signconfirmed(B)` em `579380`. A UI e o Treino receberam B corretamente; `accepted=true` apenas refletiu que o alvo era B. O hold operou conforme a regra vigente.

Nos B unidos da rodada, as maiores razões observadas antes da confirmação foram 1,488 (direita, R–mínimo) e 1,433 (esquerda, R–mínimo). Dois controles B reais da rodada anterior também foram considerados: a razão I–M atingiu 1,739 na esquerda e 1,514 na direita, mas M–R/R–mínimo não tinham sido registrados naquela coleta. Essa evidência impede interpretar uma única captura nova como limite anatômico universal.

## Mudança geométrica e replay

O cálculo de `lateralRatioIM/MR/RP`, a exigência conjunta por `Math.min`, as extensões e a posição do polegar foram mantidos. **Somente a faixa específica de proximidade de B** mudou para escore pleno até razão 1,65 e redução gradual até zero em 2,20. A razão representa abertura lateral entre pontas em unidades da largura projetada entre as bases do próprio par, sem penalizar diferença longitudinal natural das pontas. A faixa é provisória: deixa folga sobre os B unidos recentes (máximo 1,488), preserva gradualmente o I–M do B esquerdo anterior (1,739 → fator mínimo 0,838, acima do concorrente F observado em 0,75) e faz o controle direito com separação persistente ficar abaixo do limiar de elegibilidade. Não usa a letra esperada pelo jogo nem modifica F/W. Não é calibração populacional.

A fórmula antiga reconstruída dos campos escalares reproduziu `scoreB` do JSON com **erro máximo zero**. Reaplicando a única mudança de faixa aos mesmos frames e comparando com o maior escore das outras letras registrado na primeira/segunda posição:

| Tentativa | B antes, mediana | B projetado, mediana | Frames com B ≥0,55 antes → depois | Frames em que B vence antes → depois | Maior sequência vencedora B antes → depois |
| --- | ---: | ---: | ---: | ---: | ---: |
| B unido, direita | 1,000 | 1,000 | 11 → 11 | 11 → 11 | 11 → 11 |
| B unido, esquerda | 1,000 | 1,000 | 24 → 24 | 24 → 24 | 10 → 10 |
| Quatro separados, direita | 0,892 | **0,167** | 13 → **0** | 11 → **0** | 11 → **0** |
| Quatro separados, esquerda | 0,301 | **0** | 8 → 1 | 8 → **0** | 8 → **0** |

No controle direito, o escore B projetado nos 14 frames fica entre 0 e 0,267. Na esquerda, um frame ainda é elegível para B, mas outro candidato vence; a identificação da confirmação perdida no anel continua desconhecida. O replay não reexecuta os landmarks nem simula uma nova captura física ou todos os efeitos temporais da tentativa esquerda. A condição de aceite exige nova webcam independente.

## W e concorrentes

`four_spread` esquerda teve primeira confirmação W, e o resumo registra duas confirmações apesar de apenas um evento preservado. Nos **11 frames W vencedores** antes da confirmação visível, `extPinky` foi 0,626–0,683, portanto o mínimo estava detectado como **estendido**. `RULES.W` faz média de indicador/médio/anelar estendidos, mínimo fechado e abertura M–R. O componente de mínimo fechado vale zero nesses frames, mas os demais permitem W≈0,78–0,80. Logo, esse componente **não é uma trava discriminativa**. `scoreW` não é gravado como campo próprio; a pontuação vencedora `score` mostra o resultado. W legítimo sintético continua confirmado na suíte, mas falta um controle W real pareado antes de mudar `RULES.W`. A segunda confirmação da captura esquerda não deve ser atribuída a uma letra sem evento.

F marcou 0,75 nos frames do falso B direito. O novo B fica abaixo de 0,55 nesse controle; F/W não receberam desconto nem preferência. Uma eventual outra letra incorreta em `four_spread` deve ser investigada separadamente, sem ser tratada como sucesso geral do controle.

O JSON histórico E/M/B da 2C.1 também foi consultado para o negativo M real: nos **55 frames com mão anteriores às primeiras confirmações** das quatro tentativas M, `thumbAcross` mínimo por captura foi 0,600/0,900/1,012/0,916. O gate já existente do polegar em B vale zero em todos esses frames; a 2D.1 não mudou esse comportamento. Sem landmarks completos, isso não é um teste do novo motor com uma postura M anatômica validada.

## Testes, custo e limites

Um novo teste com abertura lateral próxima de 2,05, projeções espelhadas e pequenas oscilações **falhou no código anterior** (`scoreB` elegível) e passou após a correção. Ele verifica `scoreB`, ausência de `signconfirmed(B)` e ausência de aceitação B no Treino. Um segundo teste confirma F com pinça e W com mínimo fechado nas duas projeções sem convertê-los em B. As fixtures anteriores de B unido, oscilação, projeção oblíqua, Treino/Soletrar, cooldown/rearmamento, quatro afastados extremos, M modelada e polegar aberto continuam passando. A oscilação antiga em razão 1,9 foi reduzida a 1,74 porque 1,9 agora está próxima do controle **realmente separado**; essa mudança de expectativa está fundamentada nos dados e não representa homologação anatômica da fixture.

`npm.cmd test`: **198/198**; `npm.cmd run test:camera`: **185/185**; `npm.cmd run test:performance`: **13/13**. A suíte de performance verifica contratos lógicos, não FPS/CPU/RAM de webcam. A alteração usa as mesmas três razões e as mesmas três chamadas a `fuzzyOff` por inferência; muda apenas os dois parâmetros locais de B, sem nova alocação, busca, buffer ou trabalho de diagnóstico. O custo real não foi medido.

**Riscos:** outros B legítimos com abertura I–M/M–R/R–mínimo próxima de 1,9 ou com bases projetadas comprimidas podem perder escore; F pode vencer um B esquerdo sob oscilação de polegar; a projeção 2D não mede separação fora do plano. A correção de B também deixa mais visível o falso W independente. E/M/N/S, R/U, A/O, câmera, jogos, limiar geral, hold e cooldown permanecem sem alteração funcional.

## Nova rodada de webcam e revisão

1. Confirmar overlay alinhado; anotar HEAD, navegador, câmera, mão física, espelho, orientação e distância reais. Fazer capturas **novas e independentes** de B unido e `controlPose: 'four_spread'` em ambas as mãos, separadas por pose e encerradas na primeira confirmação ou em janela curta sem confirmação. Retirar a mão e aguardar rearmamento entre tentativas para não carregar o cooldown. Manter cada anel abaixo de 120 eventos.
2. Em cada tentativa, conferir as três razões laterais, quatro extensões, `thumbAcross`, `scoreB`, primeira/segunda candidatas, margem, resets, `signconfirmed`, `ui_received` e `game_decision`. B unido precisa sustentar candidatura até confirmar e ser aceito; quatro separados não pode emitir B mesmo quando B é o alvo. Registrar qualquer W/F emitido como resultado próprio, sem mascará-lo pela decisão do jogo.
3. Repetir B no Soletrar e incluir W verdadeiro, F verdadeiro, M com polegar observado, polegar aberto, espelhamento alternativo, oblíqua e regressão curta R/U e A/O. Comparar o mesmo ambiente e duração com métricas de inferência caso se queira avaliar custo. Separar os ensaios usados aqui dos de validação.

**CodeRabbit:** conferir a faixa 1,65–2,20 e a margem histórica de B esquerdo contra F=0,75; `Math.min` de todos os pares; eixo MCP quase colapsado em vista lateral; controle `four_spread` com W falso; uso correto de primeira confirmação do resumo quando o anel transborda; equivalência da regra R/U e da máquina temporal. Sem nova webcam, **B ainda não está homologada**.
