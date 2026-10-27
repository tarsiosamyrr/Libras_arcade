# Verificações e evidências

**Data:** 20/10/2026. **Ambiente da auditoria:** PowerShell, Node.js `v24.18.0`, Python `3.11.9`. **Base:** `9063154f5661c50fc7312059aa769709615b3e70`.

## Falso W/F após B — FASE 03.3B-2D.2

O [replay e protocolo](../docs/qa/Libras_Arcade_Correcao_WF_033B2D2_2026-10-27.md) confrontam quatro tentativas reais com as regras W/F. Nos intervalos pré-confirmação preservados, os gates novos projetam W/F abaixo de 0,55 sem alterar B. O teste negativo falhou primeiro por W e, com só W limitado, por F; após os dois gates passou. Fixtures espelhadas verificam positivos W/F e negativos de quatro dedos separados, pausa/retomada e ausência de `signconfirmed(B/W/F)`. A instrumentação voluntária passou a registrar `scoreW` e `spreadMR`; o teste respectivo falhou antes da adição e garante ausência de landmarks. As capturas não incluem controles reais positivos F/W nem landmarks para replay integral; V pode substituir W/F nos controles, e U no trecho inicial do B esquerdo. Testes automatizados não homologam o uso físico.

`npm.cmd test`: **201/201**; `npm.cmd run test:camera`: **188/188**; `npm.cmd run test:performance`: **13/13**. `node --check` em `js/*.js` e no teste alterado, validador de specs, `git diff --check` e `git diff --cached --check` passaram. A suíte de performance verifica contratos lógicos, sem FPS/CPU/RAM físicos.

## Webcam e revisão de B — FASE 03.3B-2D.1

O [relatório desta rodada](../docs/qa/Libras_Arcade_Correcao_B_033B2D1_2026-10-27.md) confronta quatro capturas reais com a regra B. A reconstrução do escore antigo teve erro máximo zero; o replay da nova faixa preserva os B unidos em 11/11 e 24/30 frames vencedores e reduz os controles `four_spread` a zero frames vencedores de B nos intervalos disponíveis. Isso não é uma nova homologação do motor em webcam. Um teste novo de abertura próxima de duas larguras falhou antes da correção e passou depois, verificando escore, confirmação e decisão do Treino. Outro testa F com pinça e W com mínimo fechado, espelhados. A antiga oscilação sintética em razão 1,9 foi revista para 1,74 porque 1,9 ficou próxima do controle separado real.

`npm.cmd test`: **198/198**; `npm.cmd run test:camera`: **185/185**; `npm.cmd run test:performance`: **13/13**. A última suíte verifica contratos, sem medir custo físico; a regra usa as mesmas três razões e operações fuzzy por inferência. Sintaxe, validador de specs e `git diff --check` constam da verificação final desta fase. A captura esquerda `four_spread` teve `confirmationCount=2` e só um evento de confirmação retido; não se atribuiu identidade à outra confirmação.

## Integração seletiva e B — FASE 03.3B-2D

O [relatório técnico](../docs/qa/Libras_Arcade_Integracao_B_033B2D_2026-10-26.md) compara regras externas e a atual sem executá-las ou mesclá-las. Cinco testes novos cobrem B unido com ambas as projeções espelhadas, abertura natural, quatro dedos claramente separados, W, modelos M fechados e três dedos para baixo, polegar aberto, oscilação/projeção, hold de 600 ms, entrega ao Treino/Soletrar, cooldown/rearmamento e a captura `four_spread` sem letra falsa. O teste negativo de quatro separados falhou no B anterior e passou com a condição lateral. As 16 capturas E/M/B anteriores contêm apenas escalares: M teria B=0 pelo polegar observado, mas faltam M–R/R–mínimo para reconstruir o escore B completo dos controles B. Essas fixtures não validam a anatomia de M nem homologam B com webcam.

`npm.cmd test`: **196/196**; `npm.cmd run test:camera`: **183/183**; `npm.cmd run test:performance`: **13/13**. `node --check` de `js/*.js` e do teste alterado, validador de specs, `git diff --check` e `git diff --cached --check` passaram. A última suíte verifica contratos lógicos; o custo de CPU/FPS/RAM da nova razão lateral não foi medido em webcam.

## Instrumentação anatômica opcional — FASE 03.3B-2C.2

O [protocolo visual e as duas propostas geométricas condicionais](../docs/qa/Libras_Arcade_Preparacao_Visual_EM_033B2C2_2026-10-26.md) usam o alfabeto manual do IF Baiano e as 16 capturas E/M/A/O/S/B anteriores. O teste novo falhou inicialmente pela ausência de `mcpFoldIndex` e passou após acrescentar somente escalares à calibração rotulada. Verifica desvio no MCP com `curlMiddle` quase zero e `extMiddle` alto em geometria construída, igualdade de `tipPalmMean` com a média das quatro distâncias, espelhamento, ausência de landmarks registrados e ausência dos campos novos fora da calibração e de `state.features`. Essa fixture prova a fórmula, não a anatomia das capturas M nem a validade de E.

`npm.cmd test`: **191/191**; `npm.cmd run test:camera`: **178/178**; `npm.cmd run test:performance`: **13/13**. `node --check` dos dois módulos alterados e do teste passou. Nenhuma mudança funcional E/M foi feita; o custo dos novos escalares na webcam e a adequação real de M/B seguem sem medição visual. A comparação visual exige quatro inspeções pareadas M/B por mão física antes de formular limiares.

## Preparação de QA — FASE 03.3B-2C, E/M

A [auditoria e o protocolo de coleta](../docs/qa/Libras_Arcade_Auditoria_EM_033B2C_2026-10-26.md) mapearam os componentes de `RULES.E/M`, os controles S/A/O/N e a concorrente B. `startCalibration()` já expõe os escores relevantes, features, dois primeiros colocados e eventos `hold_reset`, `signconfirmed`, `ui_received` e `game_decision`, uma amostra por inferência, sem guardar landmarks. A matriz inicial previa 12 tentativas separadas por letra e mão física; o contraste real posterior está registrado abaixo.

## Capturas reais — FASE 03.3B-2C.1, contraste E/M

O [diagnóstico das 16 capturas](../docs/qa/Libras_Arcade_Diagnostico_EM_Rodada2_033B2C1_2026-10-26.md) reproduz as primeiras confirmações e decisões do JSON externo `qa-em-fase-033b2c-webcam teste 2.json`. As quatro primeiras capturas repetem exatamente o primeiro JSON; apenas 12 foram acrescentadas. E direita/esquerda emitiram O/A; quatro M emitiram B, com `scoreM` mediano zero e dedos detectados quase retos. Controles B/A/O foram aceitos. S e N emitiram O/U, respectivamente, e esses achados pertencem às branches dos colegas. Seis anéis atingiram 120 eventos e uma captura E teve duas confirmações. As medianas por captura não estimam precisão nem comprovam a postura física. Nenhuma regra ou instrumento foi alterado; E/M continuam sem homologação. Nesta etapa documental, não foi repetida a suíte automatizada, que não valida a causa física das capturas.

## Webcam real — homologação frontal inicial da FASE 03.3B-2B.3

O [relatório de quatro capturas rotuladas](../docs/qa/Libras_Arcade_Homologacao_RU_033B2B3_2026-10-26.md) registra, no Treino, primeira confirmação correta e aceita de R estendido cruzado e U paralelo em ambas as mãos (`orientation=front`, `distance=medium`, `mirrored=true`). Antes da primeira confirmação, a candidata pretendida ocorreu em 12/15 e 11/12 frames com mão para R, e em 12/12 e 11/21 para U. Os tempos desde a primeira candidata até a confirmação foram aproximadamente 662, 666, 645 e 633 ms, respectivamente. As margens R−U no frame de confirmação foram cerca de 0,021 e 0,018. Capturas R/direita e U/esquerda tiveram confirmações adicionais; a primeira atingiu 120/120 eventos e perdeu o início. Estas contagens são correlacionadas dentro de quatro ensaios, não uma estimativa de precisão. O JSON escalar bruto permanece fora do repositório; faltam controles de falsa interseção, oblíqua/lateral, espelhamento alternativo, outros modos e medição de desempenho real.

## Verificação atual — FASE 03.3B-2B.3, promoção localizada de R

O JSON externo da 2B.2 contém duas capturas R estendidas com cruzamento geométrico persistente e dois controles U. Reaplicando a nova fórmula aos mesmos escalares antes da primeira confirmação original, R passaria de 0/9 para 8/9 candidaturas na mão direita e de 0/11 para 6/11 na esquerda; as capturas U permaneceriam com 0 candidaturas R em 12 e 11 amostras. Esse replay não executa o motor alterado sobre landmarks reais nem reconstrói a confirmação temporal completa. Um teste sintético de R com eixo projetado curto falhou antes da regra e passou depois, inclusive espelhado e com oscilação pequena. Negativos de U paralelo, pontas próximas, interseção isolada, um frame R espúrio e separação em profundidade passaram. O teste de integração usa a nova projeção e confirma R após U errado com rearmamento em Treino/Soletrar.

`npm.cmd test`: **190/190**; `npm.cmd run test:camera`: **177/177**; `npm.cmd run test:performance`: **13/13**. O teste de performance verifica contratos lógicos, sem benchmark de FPS, CPU ou RAM da nova condição em webcam. Os testes sintéticos não satisfazem o aceite funcional real de R/U. [Condição, comparação e protocolo](changes/2026-10-26-fase-033b2b3-r-recuperacao.md).

## Verificação atual — FASE 03.3B-2B.2, diagnóstico da regressão R/U

O JSON real de seis capturas foi lido fora do repositório; o escore anterior de R foi recalculado a partir dos cinco escalares por evento. Em 20/23 amostras R antes da primeira confirmação ele seria elegível, mas superaria a candidata atual apenas uma vez, por aproximadamente 0,004. A regra funcional não foi alterada. Três testes de instrumentação foram vermelhos antes das mudanças pela falta de `crossGap2DIM` e da captura por inferência; após a inclusão dos escalares, `npm.cmd test` passou **186/186**, `npm.cmd run test:camera` **173/173** e `npm.cmd run test:performance` **13/13**. Os testes verificam distâncias projetadas/3D, U paralelo, sobreposição distante em profundidade, amostragem rotulada e limite do buffer; não reproduzem os landmarks das seis capturas nem homologam R. O custo adicional da calibração em webcam não foi medido. [Comparação, decisão e protocolo](changes/2026-10-26-fase-033b2b2-r-regressao.md).

## Verificação atual — FASE 03.3B-2B, R e instrumentação E/M

Em 25/10/2026, no worktree `fase-03-cooldown-recuperado`, branch `recovery/fase-033b13-6170a2d`, HEAD inicial `cccf88d`, a linha de base da sessão anterior era **177/177** no teste completo, **164/164** na câmera simulada e **13/13** no desempenho contratual. A árvore estava limpa. Dois testes novos falharam antes da mudança: R reto e cruzado perdia para U; uma pose sem cruzamento confiável ainda atribuía **0,8** à regra R, acima de 0,55. O primeiro teste da instrumentação falhou por falta de `scoreM`. A fixture de R cruzado foi testada com espelho, pequena rotação, escala e oscilação. Controles negativos incluem dedos paralelos e sobreposição 2D com grande distância em z. O fluxo simulado confirmou rejeição de U errado, aceitação de R em Treino/Soletrar, rearmamento e ausência de duplicata.

Quatro testes foram adicionados. `npm.cmd test` passou **181/181**, `npm.cmd run test:camera` **168/168** e `npm.cmd run test:performance` **13/13**. `node --check` para `js/*.js` e o teste alterado, o validador `validate_specs.py`, `git diff --check` e `git diff --cached --check` passaram. O teste diferencial acusou uma primeira versão que acrescentava campos a `state.features`; a implementação final manteve o contrato anterior sem afrouxar o teste. E/M ganharam observabilidade, mas não fixtures pedagógicas positivas nem mudança de regra: não há landmarks reais rotulados suficientes para confirmar a separação E/S/A/O ou M/N. Câmera e jogos nos testes são simulados; as contagens não representam precisão de reconhecimento real. [Decisão e limites](changes/2026-10-25-fase-033b2b-emr.md).

**Verificação pré-checkpoint de R:** a linha de base do worktree não commitado passou **181/181**. Dois testes novos foram vermelhos antes da alteração: profundidade gradual entre os dedos cruzados (`spreadIM≈0,258`, R=0,681, U=0,920 e U confirmado) e rotação tridimensional de 55° (`palmAxisIM≈0,225`, R=0,877, U=0,943 e U confirmado). A nova medição usa os segmentos MCP/PIP/DIP/ponta; profundidade no cruzamento abaixo de 0,22 permitiu R com `spreadIM` até aproximadamente 0,327, sem relaxar os limiares. U paralelo, eixo quase de lado e sobreposições com grande distância em z permaneceram negativos; espelho, oscilação, Treino/Soletrar e confirmação única passaram nos controles. Resultado: `npm.cmd test` **183/183**, `test:camera` **170/170** e `test:performance` **13/13**. Vistas sintéticas de 60°/65° ainda perderam para U; não há amostra real para ajustar esse limite. [Decisão atualizada](changes/2026-10-25-fase-033b2b-emr.md).

## Verificação anterior — FASE 03.3B-2A.1, O/A e metadados de tentativa

Em 25/10/2026, HEAD inicial `595e80c`, branch `recovery/fase-033b13-6170a2d`, a linha de base passou em `npm.cmd test` com **171/171**. O JSON escalar bruto de 12 capturas estava em Downloads e foi analisado sem copiar seus dados ao repositório. O empate O/A na fixture e a perda do rótulo após 120 eventos foram demonstrados por três testes novos vermelhos antes da implementação. Uma primeira forma da regra A elevou o escore em poses sem pinça; a suíte diferencial encontrou o efeito, e a regra final conserva exatamente o escore anterior nesse caso. As fixtures históricas de A, antes com polegar e pontas sobrepostos, foram separadas em A com polegar afastado e O com pinça.

Seis testes novos cobrem O ambíguo, A verdadeiro, espelho/projeção/escala, entrega ao Treino e Soletrar no mesmo instante do hold, retenção de rótulo e primeira confirmação além do anel de 120 eventos, resultado incorreto/ausente e controle ascendente V/K. `npm.cmd test` passou **177/177**, `npm.cmd run test:camera` **164/164** e `npm.cmd run test:performance` **13/13**. Sintaxe de `js/*.js` e do teste alterado, validador de specs, links locais e `git diff --check`/`git diff --cached --check` passaram. A cópia do relatório de Downloads foi conferida por SHA-256. A suíte de câmera usa landmarks/DOM simulados e a de performance verifica contratos, sem benchmark de CPU/RAM/FPS. A análise retrospectiva de amostras não substitui webcam após a mudança. [Decisão e riscos](changes/2026-10-25-fase-033b2a1-oa.md).

## Verificação atual — FASE 03.3B-2A, O/A e P/V/K

Em 25/10/2026, branch `recovery/fase-033b13-6170a2d`, HEAD inicial `690a979`, baseline `npm.cmd test` **165/165**, `test:camera` **152/152** e `test:performance` **13/13**. O relatório rotulado de 12 buffers estava presente como arquivo não rastreado; o JSON bruto e landmarks não estavam no worktree. O empate A/O em 1,00 e a vitória de V sobre P descendente foram confirmados no código e nas fixtures existentes. Um teste novo pelo `LibrasEngine.update()` falhou antes da correção: na P sintética com polegar projetado perto do limite, `scoreP=0,9105` e `scoreV=0,9377`, produzindo V. O teste da nova instrumentação também falhou antes por ausência de `scoreS`.

Seis testes novos cobrem P ambíguo nos dois espelhos, P/V/K com inclinação e ruído, A/O com rotação/escala/espelho, calibração escalar, aceitação de P no Treino/Soletrar e rejeição de V incorreto seguida de P após liberação. Os testes anteriores seguem verificando J/Z/I/D/C/G, O/A, K/V, cooldown, duplicação e contratos de UI/câmera. Após a mudança: `npm.cmd test` **171/171**, `npm.cmd run test:camera` **158/158** e `npm.cmd run test:performance` **13/13**. Esses comandos não medem acerto na webcam nem custo real de CPU/RAM/FPS; a correção de P/V e a hipótese O/A permanecem sem homologação real. [Decisão e limites](changes/2026-10-25-fase-033b2a-oa-pvk.md).

## Verificação atual — FASE 03.3B-1.4.1, retorno terminal do J curto

Em 25/10/2026, no HEAD inicial `22b5d04` e worktree limpo, a linha de base era 160/160. No `LibrasEngine.update()`, a trajetória curta com último Y `0,40` falhou antes da correção: a captura escalar mostrou `shortHook=true`, `hookRise≈0,0233`, `hook_rise_short` e nenhuma confirmação J. O último passo bruto subia 0,16 e avançava 0,14 na escala da fixture. Uma trajetória com subida bruta terminal de 0,05 também ficou positiva após a correção. Um negativo novo encontrou falso J **já existente** em uma haste de I com um ponto final ruidoso; outro negativo mostrou que simplesmente preservar o último ponto faria um salto terminal menos extremo virar J. Esses testes orientaram a exigência de avanço lateral no passo anterior.

Cinco casos foram adicionados ao harness de integração: dois J curtos com retorno terminal, I com salto terminal único, I com ponto ruidoso isolado e retorno terminal abaixo do mínimo. A suíte anterior mantém J rápido/lento/inclinado/espelhado/irregular, aceitação no Treino/Soletrar, I imóvel/oscilante/lateral/vertical, ausência de gancho, incoerência, histórico antigo, descontinuidade espacial, confirmação única, D e Z. Após a mudança, `npm.cmd test`: **165/165**; `npm.cmd run test:camera`: **152/152**; `npm.cmd run test:performance`: **13/13**. Sintaxe de `js/*.js` e do teste alterado passou. São trajetórias e interfaces simuladas: `test:camera` não usa webcam física e `test:performance` não mede ganho de CPU/RAM desta correção. [Decisão técnica](changes/2026-10-25-fase-033b141-j-terminal.md).

## Verificação atual — FASE 03.3B-1.4, J rápido e curto

Em 24/10/2026, no worktree recuperado e HEAD inicial `6170a2d`, a linha de base documentada era 153/153. Três novas fixtures pelo caminho completo de `LibrasEngine.update()` falharam **antes** da correção: J rápido com curva lateral ainda descendente, J curto completo em seis amostras e J com callback ausente e deslocamento contínuo do pulso. A fixture curta registrou `hook_rise_short` com subida suavizada ≈0,0033; após a média centrada condicionada, a subida observada chegou a 0,03. Um primeiro desenho de J rápido passou na base por conter retorno antecipado; a fixture foi corrigida para manter descida até antes do último ponto, que então falhou como esperado. A primeira execução isolada sem `--experimental-vm-modules` falhou por ausência de `vm.SyntheticModule`, não por comportamento do gesto; as reproduções válidas foram repetidas com a flag exigida.

Sete testes novos ampliam a suíte: J rápido segmentado, variante inclinada/espelhada com timestamps irregulares, zoom, pequena rotação projetada alternada e perda breve da base, J curto de seis amostras e menos de 300 ms, curva lateral incoerente negativa, seis amostras sem retorno seguidas de I, callback ausente com pulso contínuo e entrega do J curto ao Treino/Soletrar. Um teste existente de salto espacial passou a conferir os escalares de descontinuidade. Os controles anteriores abrangem I imóvel/oscilante/vertical/lateral/repetitivo, gancho ausente, movimento incoerente, salto espacial, histórico antigo, cooldown, modo/sessão, J→I e D/Z.

Após as edições: `npm.cmd test` **160/160**, `npm.cmd run test:camera` **147/147** e `npm.cmd run test:performance` **13/13**; sintaxe de `js/*.js` e do teste alterado passou. O `test:camera` usa câmera e DOM simulados. `test:performance` verifica contratos e não é benchmark de CPU, RAM ou FPS nesta mudança. Nenhuma suíte mede precisão de J com webcam, taxa de falso J em I físico, latência real ou variação entre mãos. [Decisão e protocolo de homologação](changes/2026-10-24-fase-033b14-j-rapido-curto.md).

## Verificação atual — FASE 03.3B-1.3, segmentação e continuidade do J

Em 24/10/2026, no HEAD inicial `f75e1da` da branch `feat/fase-03-cooldown`, `npm.cmd test` passou com **138/138**. Antes da correção, novos testes de `LibrasEngine.update()` falharam como esperado: J inclinado a 15°, J cujo gancho perde brevemente a pose I e J com variação projetada de escala não confirmavam. A inspeção confirmou três passos descendentes consecutivos sensíveis à amostragem, buffer mantido sem acrescentar pontos durante a perda da pose-base e divisão da coordenada absoluta da ponta pela escala de cada frame. A [auditoria externa](../docs/qa/Libras_Arcade_Auditoria_Codigo_Atual_2026-10-24.md) relata dificuldade real de J, mas suas reproduções adicionais foram sintéticas e a cópia ZIP não tinha histórico Git para quatro testes diferenciais.

Quinze testes novos foram adicionados ao harness de integração. Positivos: J com haste inclinada e espelhada, seis amostras com gancho claro, sete amostras em cadência irregular, perda breve de base, variação de escala e entrega/aceitação no Treino e Soletrar. Negativos: seis amostras que perdem o gancho após suavização, perda da base antes de iniciar o movimento, salto espacial do pulso com e sem base, I imóvel com escala variável, I apenas vertical e histórico obsoleto. Diagnóstico com razão geométrica preserva a descida medida em haste rejeitada. Testes anteriores cobrem J lento/rápido/curto, I↔J, falsos J laterais/invertidos/oscilatórios, duplicação, cooldown, sessão, D/Z e os três modos. Alguns novos controles negativos já passavam antes; apenas as falhas descritas acima e as lacunas de observabilidade demonstraram o ciclo vermelho/verde.

Após as mudanças, `npm.cmd test`: **153/153**; `npm.cmd run test:camera`: **140/140**; `npm.cmd run test:performance`: **13/13**. `node --check` em `js/*.js` e `git diff --check` passaram. O script de specs da skill não iniciou via `py`: o launcher informou ausência de Python instalado, e o alias da WindowsApps é inacessível. Uma verificação equivalente de estrutura, frontmatter, links e marcadores foi executada com Node nesta sessão. `test:performance` verifica contratos de inferência e buffers; não é benchmark novo de CPU/RAM. Fixtures de landmark não validam precisão, lateralidade física, oclusão nem taxa de sucesso com webcam. [Decisão técnica](changes/2026-10-24-fase-033b13-j-segmentacao.md).

## Verificação anterior — FASE 03.3B-1.2, retorno de J e coleta rotulada

Em 24/10/2026, no HEAD local `67c0f39` da branch `feat/fase-03-cooldown`, `npm.cmd test` passou com **130/130** antes das alterações. Um novo teste de `LibrasEngine.update()` falhou antes da correção: haste descendente seguida somente de desvio lateral emitia J. Após exigir retorno ascendente/lateral e preservar a fixture histórica de J no mesmo instante, esse teste e os controles positivos passaram. A primeira variante da correção atrasava J em um frame no teste diferencial; o piso de subida foi alinhado à fronteira de movimento já usada pelo motor e a regressão passou. Uma fixture de hold inicialmente movia a ponta para outra posição ao cessar o traço; a fixture foi corrigida, sem mascarar o falso J reproduzido.

Oito testes foram acrescentados ao harness de integração existente: traço lateral negativo, I com desvio inclinado/espelhado, I entregue ao Soletrar sem falso J, J curto em duas velocidades e espelhamentos, API rotulada com validação/limpeza/escalares seguros, geometria resumida de J, V/P/K apontados para cima/baixo e inclinados no plano da imagem, e empate A/O sob rotação/espelhamento sintéticos. Os rótulos de mão nos testes são declarados e espelhamento matemático não reproduz lateralidade física nem mudança do plano da palma. Os testes antigos preservam I imóvel e sob oscilações, J lento/rápido/irregular, I→J, J→I, residual, D/Z, Treino A–Z, três modos e recursos. Após as mudanças, `npm.cmd test` passou com **138/138**, `npm.cmd run test:camera` com **125/125** e `npm.cmd run test:performance` com **13/13**; `node --check` em `js/*.js` passou. A captura rotulada foi verificada desligada por padrão, com rótulos válidos obrigatórios, até 120 eventos em memória e sem arrays de landmarks.

As fixtures não reproduzem os landmarks dos 12 buffers reais, indisponíveis neste worktree; portanto não medem redução de falso J, perda de J válido, precisão O/A ou custo de CPU/RAM com webcam. O script `test:performance` verifica contratos de inferência e buffers, não um benchmark desta mudança. O relatório de webcam registra eventos de janelas circulares, sem denominador de tentativas. [Decisão e protocolo](changes/2026-10-24-fase-033b12-j-calibracao.md).

## Verificação anterior — FASE 03.3B-1, falso J e diagnóstico O/A

Em 24/10/2026, a base local `bddf1a9` passou com **123/123** em `npm.cmd test`. Antes da correção, uma fixture determinística de I com curva invertida produziu `J` em vez de `I` no fluxo completo de `LibrasEngine.update()`. Outro teste novo revelou que uma trajetória J incompleta sobrevivente a mais de 300 ms sem callbacks prejudicava a trajetória seguinte. Os dois testes passaram após exigir um segmento descendente para J e descartar o buffer obsoleto, sem alterar cooldown ou hold estático.

Após as mudanças, `npm.cmd test` passou com **130/130**: sete testes novos no harness existente. `npm.cmd run test:camera` passou com **117/117** e `npm.cmd run test:performance` com **13/13**; sintaxe de `js/*.js` e validação de specs passaram. Cobrem curva invertida, intervalo sem frames, emissão/recebimento/aceitação de I pelo Soletrar, J com haste inclinada e espelhada, empate A/O e separação positiva de O, rejeição de A e aceitação de O no Soletrar, e controles K/P/C. Os 123 testes anteriores incluem I sob oscilações pequenas e intensas, J lento/rápido, I→J, J→I, D/Z, cooldown, rearmamento, modos e recursos. A regra C usada na fixture difere da dica pedagógica, conforme registrado em [QA](../docs/qa/qa-reconhecimento.md). O/A não foi recalibrado; os casos sintéticos demonstram empate e decisão, não precisão real. O [relatório técnico da mudança](changes/2026-10-24-fase-033b1-j-oa.md) descreve o risco de rejeitar um J verdadeiro de haste curta ou inclinada. A suíte chamada `test:performance` verifica contratos e buffers, sem comparar CPU/RAM em webcam.

## Verificação anterior — FASE 03.3A, auditoria da calibração

Em 24/10/2026, no commit-base `2f565a6` da branch `feat/fase-03-cooldown`, `npm.cmd test` passou com **123/123** antes e depois da edição documental. O validador de `maintaining-project-specs` concluiu com `[OK]`; `git diff --check` saiu sem erros; a matriz contém 26 linhas nominais. A [matriz de QA](../docs/qa/qa-reconhecimento.md) foi derivada da inspeção de `libras.js`, `data.js`, `diagnostics.js`, visão, UI, motor do Soletrar e testes existentes. Nenhuma regra, timer, interface, fixture ou teste foi alterado. A suíte já inclui empate I/Y sintético, evento de confirmação até UI/jogo, razões de rejeição, letras iguais, timeout em cooldown, pausa, troca de modo e buffer diagnóstico; adicionar fixtures específicas I/O sem landmarks reais não isolaria o relato da webcam.

As dez etapas do percurso de uma tentativa são observáveis nos eventos existentes, com limites: só duas candidatas estáticas, amostragem de 200 ms, anel de 120 eventos, sem identificador de tentativa ou validação anatômica dos landmarks. O protocolo exige isolamento manual de tentativas e separa observação qualitativa de taxas medidas. Não houve execução de webcam nem benchmark de CPU/RAM nesta fase; 123 testes verdes não são precisão por letra.

## Verificação atual — FASE 03.2, diagnóstico e Soletrar

Em 23/10/2026, a linha de base local no commit `48fc74c` passou com **110/110** em `npm.cmd test`. Antes da implementação, três testes novos falharam: a última letra do Soletrar permanecia `is-current` após `wordcomplete`; `Game.handleSign()` não retornava razão técnica; a API de diagnóstico não existia. O primeiro caso era defeito funcional reproduzido. O segundo e terceiro eram lacunas de observabilidade, não falhas de pontuação.

Após a alteração, `npm.cmd test` passou com **123/123** (treze casos novos), `npm.cmd run test:camera` com **110/110** e `npm.cmd run test:performance` com **13/13**. O loader de `tests/phase02.test.mjs` passou a carregar o novo módulo local como data URL; sem isso, o harness legado falhava em resolver um import relativo dentro de sua própria data URL. Isso não era uma falha do navegador nem do jogo.

Os casos novos exercitam a marcação da última letra, decisão de aceitação/erro/pausa/transição/sessão encerrada, emissão até UI e jogo, letras iguais com liberação, timeout durante cooldown, troca de modo, troca rápida de banco e cancelamento de avanço, J em movimento, pausa/retomada, landmarks estruturalmente inválidos, limite de 120 registros, cópias de leitura, ausência de landmarks no registro, amostragem do painel, empate heurístico I/Y, descarte de hold/trajetória e listeners/loop únicos. O relógio e os landmarks são sintéticos; a execução não valida precisão, orientação, lateralidade ou experiência com webcam real. O diagnóstico foi verificado por comportamento e inspeção de caminhos condicionais, sem benchmark comparável de CPU/RAM com captura ativa. A validação visual do painel em navegador físico permanece pendente.

## Verificação atual — FASE 03.1.3, interface do Treino

Em 23/10/2026, a linha de base local passou com **107/107** em `npm.cmd test`. Antes da correção, novos testes falharam porque `Anterior` e `Escolher letra` eram ocultados nos níveis e `Game.navigatePracticeTarget()` rejeitava `-1` e letras fora de A–Z; a opção completa também não tinha `aria-pressed`. Após a alteração, `npm.cmd test` passou com **110/110** (três testes novos; alguns testes existentes foram ampliados), `npm.cmd run test:camera` com **97/97**, `npm.cmd run test:performance` com **13/13**, e a sintaxe dos módulos e `git diff --check` passaram. O harness agora exige que os IDs simulados constem do `index.html`, evitando falso verde caso um controle seja removido do markup. Verifica seleção semântica, níveis 1–3, filtros de letras, navegação, cancelamento de avanço, relógio, pontos, listeners e ocultação fora do Treino. A fixture continua sendo um DOM simulado, sem cálculo de layout.

Para layout, o Edge headless instalado renderizou o HTML/CSS da aplicação com a tela ativada por script local temporário. A emulação CDP confirmou viewports **1366×768** e **390×844**, `documentElement.scrollWidth` igual à largura do viewport em ambos e caixas de Anterior/Próxima inteiras dentro do cartão. No mobile, Próxima ocupou `x=199..351`, `y=303,75..347,75`, com **44 px** de altura; no desktop, `x=686,98..862,98`, `y=288,75..332,75`, também **44 px**. Capturas foram inspecionadas; um teste inicial com `--window-size=390,844` sem CDP foi descartado porque o navegador aplicou largura interna maior e cortou a imagem. A fixture não testa boot, MediaPipe, webcam, clique nativo em dispositivo físico, leitor de tela nem estado visual sob câmera ativa. Os relatos por letra com webcam constam do [roadmap](../docs/ROADMAP.md); não há taxas de precisão medidas nesta fase.

## Verificação atual — complemento da FASE 03.1.2, Treino A–Z

Em 23/10/2026, a suíte local anterior passou com **101/101** em `npm.cmd test`. A limitação relatada foi confirmada: nível 1 filtrava `LETTER_POOL` por `difficulty <= 1`, produzindo A, B, I, L e V. Cinco testes foram escritos antes da implementação e falharam pela ausência do conjunto sequencial e da interface; o sexto, de avanço automático, foi acrescentado depois que o fluxo existia. Após a mudança, `npm.cmd test` passou com **107/107**, `npm.cmd run test:performance` com **13/13** e `npm.cmd run test:camera` com **94/94**. O harness existente verifica 26 letras únicas em A–Z, J/Z, percurso e retorno, Anterior, seleção direta, conjuntos tradicionais, placar, recorde, timer, callbacks, cooldown, limpeza de trajetórias, três modos, listeners e marcação responsiva. A verificação da marcação/CSS não substitui teste visual em celular ou com leitor de tela. Nenhuma simulação homologa precisão de webcam. [Decisão da fase](changes/2026-10-23-fase-0312-z-i-treino.md).

## Verificação anterior — FASE 03.1.2, falso Z/J e avanço manual

Em 23/10/2026, a baseline `515c496` passou com **90/90** em `npm.cmd test`. Antes da correção, testes pelo caminho completo de `LibrasEngine.update()` reproduziram Z no lugar de D sob oscilação horizontal de amplitude normalizada 0,15 e período 300 ms, J no lugar de I sob movimento equivalente do mindinho, e I/D sem confirmação sob vai-e-vem em dois eixos. A nova ação manual também falhou antes da implementação. Após a correção, `npm.cmd test` passou com **101/101** (11 casos novos), `npm.cmd run test:performance` com **13/13** e `npm.cmd run test:camera` com **88/88**, preservando a fixture histórica que confirma Z no mesmo instante. Os casos estão em `tests/app-ui.integration.test.cjs`, com relógio, landmarks, câmera e DOM simulados.

Os novos cenários incluem oscilação com deriva leve e em dois eixos, D/I estáticos, Z com amplitudes 0,65 e 1,25, rearmamento de J após movimento rejeitado, propagação de I até Treino, botão exclusivo do Treino, avanço sem pontuação, reset de tempo, cancelamento do avanço automático e guardas de pausa/saída. Os casos anteriores continuam cobrindo J/Z lentos e rápidos, caminhos incompletos, cooldown, residual, três modos, ciclo da câmera e listeners. Nenhum teste sintético valida precisão com webcam física, compatibilidade de toque/leitor de tela, orientação de mão ou custo real de CPU/RAM. [Decisão e critérios](changes/2026-10-23-fase-0312-z-i-treino.md).

## Verificação atual — FASE 03.1, arbitragem estático/dinâmico

Em 23/10/2026, a linha de base `4af4a98` passou em `npm.cmd test` com **60/60**. Antes da correção, os novos cenários de `LibrasEngine.update()` reproduziram D/I bloqueados por deslocamentos parciais, ausência de rearmamento D→Z/I→J e confirmação residual Z→D/J→I. Após a correção, `npm.cmd test` passou com **90/90** (30 casos novos), `npm.cmd run test:performance` com **13/13** e `npm.cmd run test:camera` com **77/77**. A sintaxe dos módulos JavaScript passou. Os casos novos estão no harness de integração existente em `tests/app-ui.integration.test.cjs`, com relógio e landmarks simulados.

Os casos cobrem D/I com oscilação, trajetórias J/Z lentas, rápidas, incompletas e consecutivas, cooldown, rearmamento, pose residual, perda temporária de landmarks, timestamps irregulares, pausa/retomada, troca de sessão/tela, eventos únicos e letras estáticas sem relação com J/Z. A reprodução inicial demonstra os defeitos lógicos nas entradas simuladas; o resultado verde demonstra o comportamento nessas entradas. Ainda faltam webcam real, classificação por letra, orientações/distâncias da mão, CPU/RAM e testes de usabilidade. O teste de performance é uma suíte de regressão lógica e não mede ganho de CPU/RAM. Os novos limiares temporais e espaciais são hipóteses de teste. A estratégia e as limitações estão em [FASE 03.1](changes/2026-10-23-arbitragem-estatico-dinamico.md).

## Verificação atual — FASE 03, cooldown e integração simulada

Em 22/10/2026, a linha de base deste worktree passou em `npm.cmd test` com **50/50** antes das edições. Após a FASE 03, `npm.cmd test` passou com **60/60** (10 casos novos), `npm.cmd run test:performance` com **13/13** e `npm.cmd run test:camera` com **47/47**. Sintaxe de `js/*.js` e dos testes alterados, validação de specs e `git diff --check` passaram. `git diff --cached --check` não apontou erro. O teste diferencial da FASE 01 passou a comparar classificação, cursor, navegação e primeira confirmação; a antiga repetição de cinco letras para a pose mantida foi substituída pela exigência de um evento, mudança intencional desta fase.

Os novos casos usam relógio determinístico e o grafo real de módulos no harness existente: pose estática contínua, A→B com transição estável, A→A com/sem liberação, gesto rápido no cooldown, trajetória antiga, J/Z após rearmamento e pelo caminho completo de `update()`, pose-base estática imóvel, reset de sessão, três modos, menu, pausa/retomada, navegação e uma cadeia de inferência/listeners. A câmera simulada entregou 120 frames novos e houve 120 inferências, inclusive durante cooldown; o teste diferencial preservou a sequência de chamadas/timestamps da visão em relação à baseline. Isso verifica continuidade lógica, não FPS, CPU/RAM, latência ou reconhecimento com MediaPipe real. Os valores temporais e o feedback precisam de teste com webcam e jogadores. O cronômetro do Soletrar continua ativo no cooldown; a FASE 04 decidirá sua duração.

## Histórico — integração simulada de `app.js`/`ui.js` na FASE 02.1

Em 21/10/2026, após fechar a lacuna A-2 no harness de testes, `npm.cmd test` passou com **50/50 testes**: 13 de performance, 21 da FASE 02/02.1 e 16 novos testes de integração simulada. `npm.cmd run test:performance` passou com 13/13; `npm.cmd run test:camera` passou com 37/37 (21 anteriores + 16 de integração). Sintaxe dos módulos, `git diff --check` e `git diff --cached --check` também passaram. `npm.ps1` pode ser bloqueado pela política de execução local do PowerShell; `npm.cmd` executa os scripts. O aviso `ExperimentalWarning` do Node permanece esperado.

A integração usa os módulos reais carregados por `vm.SourceTextModule`, com DOM/event targets, relógio, rAF, câmera e MediaPipe simulados. Testa o boot disparado pelos controles reais do harness, telas de falha/retry, visibilidade, `pagehide`/restauração, desconexão, erros no detector/consumidor, navegação dos três modos, eventos de confirmação, resultados, persistência indisponível e ausência de listeners/loops duplicados. O harness não implementa layout, propagação completa de eventos nem MediaPipe/GPU reais.

Os testes dividem-se em: (1) unitários de motores/métricas e persistência; (2) integração simulada de `app.js`, `ui.js`, `vision.js` e motores, adicionada no fechamento A-2; (3) validação com webcam/navegador real, que não foi executada nesta entrega. Portanto, mensagens/fluxos são verificados sob as respostas controladas dos mocks, não em dispositivos ou navegadores reais. A versão mais antiga efetivamente testada é Node `v24.18.0`; versões anteriores não foram ensaiadas. Os testes diferenciais requerem que o commit-base referenciado no teste esteja disponível no histórico Git local.

O `package.json` inclui a nova suíte de integração em `test` e `test:camera`; esta última e a suíte completa usam `--experimental-vm-modules`. A FASE 01 depende de `vm.SyntheticModule`/`vm.SourceTextModule`; sem a flag, estas APIs não estão disponíveis no Node 24.18.0. Edge `155.0.4283.62` e Playwright pertencem à medição histórica da FASE 01; esta integração não foi medida com navegador/webcam real. Não há dependências instaláveis, CI, lint, typecheck ou build versionados.

Os testes diferenciais da FASE 01 chamam `git show 9063154:...`; esse commit precisa estar disponível no histórico local, inclusive em uma futura execução de CI. Os testes sintéticos não medem CPU/RAM total nem validam reconhecimento com webcam.

```powershell
npm test
npm run test:performance
npm run test:camera
# Equivalente direto da suíte conjunta:
node --experimental-vm-modules --test tests/performance.test.cjs tests/phase02.test.mjs tests/app-ui.integration.test.cjs
Get-ChildItem -LiteralPath js -Filter *.js | ForEach-Object {
    node --check $_.FullName
    if ($LASTEXITCODE -ne 0) { throw "Falha de sintaxe: $($_.Name)" }
}
git diff --check
git diff --cached --check
```

- FASE 01: 13 testes de FPS e limites de 50/1.000 ms; durações separadas; buffer de 120 amostras; vídeo repetido; início/parada/reinício; desenho e limpeza; três motores; comparação com a base para estados, cursor, confirmações, hold, J/Z e navegação sintéticos. A fixture de DOM e três vídeos sintéticos foram adaptados para o controle de visibilidade e `readyState` da FASE 02.
- FASE 02: 12 testes de inicialização compartilhada, cancelamento de modelo/câmera, falha de reprodução, loop único, reinício de métricas após reabrir a câmera, erros do detector/consumidor, limpeza de gestos e pausa/cancelamento de avanços nos jogos. Usam substitutos locais e não validam hardware real.
- FASE 02.1: 9 testes novos em `tests/phase02.test.mjs` cobrem exceções de `getItem()`/`setItem()`, `QuotaExceededError`, avisos de armazenamento, recorde em memória, reconciliação com valor persistido, nova tentativa após falha temporária, saída manual para o menu, `sessionend`, reinício de `bestStreak`, resultados de Treino/Soletrar/Forca e persistência normal. Usam os motores e métodos reais da UI com DOM/armazenamento substitutos.
- Fechamento A-2: 16 testes em `tests/app-ui.integration.test.cjs` e `tests/helpers/browser-runtime.cjs`. Avaliam o grafo real de módulos em VM com elementos DOM e listeners reais do harness, além de APIs remotas/hardware simuladas. Incluem boot e retry, permissão negada, suspensão/retomada, descarte/restauração, cancelamento de inicialização pendente, desconexão da câmera, falhas de detecção/consumo, navegação e saída dos três modos, eventos `signconfirmed`, resultados, recuperação do armazenamento e contagem de listeners/loops. Não substituem navegador ou webcam real.
- Histórico da FASE 01: implementação anterior apresentou 7 falhas em 9 testes; a implementação passou. A revisão identificou duração zerada quando o consumidor parava o loop; teste ampliado falhou e passou após correção. A fixture inicial de navegação não atingia o deslocamento mínimo; foi ajustada sem mudar a regra do jogo.
- Mocks substituem relógio, DOM mínimo, timers, storage e import remoto na VM; os módulos da aplicação são reais. Desenho compara a sequência de operações, não apenas quantidade de chamadas. Testes diferenciais leem o commit-base pelo Git.
- Benchmark separado usa MediaPipe real, GPU e UI no navegador com vídeo gerado sem pessoas. Scripts, parâmetros, resultados brutos, regressões de eventos/DOM e limitações estão no [relatório da FASE 01](../docs/performance/FASE01.md).
- Na FASE 01, `app.js` e `vision.js` mudaram funcionalmente; CSS, dados, regras, jogos e UI preservaram os hashes do snapshot de início daquela fase. Em HTML, a conferência original identificou uma edição adicional de `js/app.js` para `./js/app.js`, com destinos equivalentes. Na consolidação para commit em 21/10, o arquivo já havia retornado a `js/app.js`; o estado encontrado foi preservado. A equivalência de todos os ASTs abaixo vale somente para a FASE 00.

## Histórico da FASE 00 — ferramentas e resultados naquele momento

O repositório não possui suíte de testes, CI, `package.json`, lint, typecheck ou build. Não foram instaladas dependências nem criada infraestrutura de testes da FASE 05. As verificações abaixo foram executadas pontualmente no terminal, sem persistir scripts executáveis no projeto.

| Verificação | Comando/método | Evidência e limite |
| --- | --- | --- |
| Sintaxe | `node --check` em cada `js/*.js` | Sete módulos válidos; não executa imports, DOM ou MediaPipe. |
| Ausência de mudança funcional | Acorn interno do Node, `node --expose-internals -`, comparação de AST com a base | Sete ASTs iguais, ignorando posições. HTML/CSS comparados sem comentários e com CRLF normalizado. |
| Dados | `node --experimental-vm-modules -`, módulos reais e substituição apenas do import remoto | 24 regras estáticas + J/Z, 26 letras únicas, 90 palavras sem caracteres fora do pool e sem dicas ausentes. |
| Motores | Mesmo ambiente VM, storage em memória e timers controlados | Treino: acerto dá 10 pontos; Soletrar: palavra soma bônus; Forca: repetição não duplica pontos, vitória e derrota com 6 erros. Não valida interface ou reconhecimento real. |
| Diagnóstico | Relógio/callbacks e features sintéticas | Reproduzidos FPS falso, loop interrompido por exceção, avanço por callback antigo, `bestStreak` herdado e empate I/Y. Esta linha preserva o diagnóstico da FASE 00; o estado atual está acima e no roadmap. |
| HTTP local | Python `ThreadingHTTPServer`, porta efêmera em `127.0.0.1`, GET via `urllib.request` | HTML, CSS e sete JS retornaram 200 com corpo. Servidor encerrado no fim; não houve chamada a CDN/webcam. |
| Documentação | Validador `validate_specs.py` da skill `maintaining-project-specs`, mais conferência de links locais | Aprovado; links locais e UTF-8 dos 10 documentos conferidos. Não valida conteúdo pedagógico. |
| Diff | `git diff --check`, revisão de arquivos novos e diff | Sem erros de whitespace; revisão confirma documentação e comentários. O status local está em `docs/state.md`. |

## Histórico da FASE 00 — comandos de sintaxe e preservação

Executar na raiz em PowerShell:

```powershell
Get-ChildItem -LiteralPath js -Filter *.js | ForEach-Object {
    node --check $_.FullName
    if ($LASTEXITCODE -ne 0) { throw "Falha de sintaxe: $($_.Name)" }
}
git diff --check
```

A comparação abaixo foi usada apenas na auditoria da FASE 00. Após a FASE 01, ela detectará as mudanças intencionais de `app.js` e `vision.js`; não é um critério de aprovação da versão atual. O Acorn interno existe no Node instalado; é uma API interna, não uma dependência adicionada à aplicação ou um comando de CI portátil.

```powershell
@'
const fs = require('node:fs');
const cp = require('node:child_process');
const acorn = require('internal/deps/acorn/acorn/dist/acorn');
const base = '9063154f5661c50fc7312059aa769709615b3e70';
const files = cp.execFileSync('git', ['ls-files'], {encoding: 'utf8'}).trim().split('\n');
const original = file => cp.execFileSync('git', ['show', `${base}:${file}`], {encoding: 'utf8'});
const normalize = code => JSON.stringify(
  acorn.parse(code, {ecmaVersion: 'latest', sourceType: 'module'}),
  (key, value) => key === 'start' || key === 'end' ? undefined : value
);
for (const file of files.filter(f => f.endsWith('.js'))) {
  if (normalize(fs.readFileSync(file, 'utf8')) !== normalize(original(file))) {
    throw new Error(`AST alterada: ${file}`);
  }
  console.log('AST idêntica:', file);
}
for (const file of ['index.html', 'css/style.css']) {
  const pattern = file.endsWith('.html') ? /<!--[\s\S]*?-->/g : /\/\*[\s\S]*?\*\//g;
  const strip = text => text.replace(pattern, '').replace(/\r\n/g, '\n');
  if (strip(fs.readFileSync(file, 'utf8')) !== strip(original(file))) {
    throw new Error(`Conteúdo alterado fora de comentários: ${file}`);
  }
  console.log('Conteúdo sem comentários idêntico:', file);
}
'@ | node --expose-internals -
if ($LASTEXITCODE -ne 0) { throw 'Comparação estrutural falhou' }
```

A primeira execução detectou uma quebra de linha acrescentada no fim de HTML/CSS pela edição; o formato original foi restaurado. A comparação não foi relaxada para aceitar essa diferença.

## Reprodução da consistência dos dados

Este comando avalia os módulos reais com uma fronteira remota inerte; não chama a implementação do MediaPipe. A VM experimental pode emitir aviso do próprio Node.

```powershell
@'
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const assert = require('node:assert/strict');
(async () => {
  const context = vm.createContext({EventTarget, CustomEvent});
  const cache = new Map();
  const remote = new vm.SyntheticModule(['HandLandmarker', 'FilesetResolver'], function () {
    this.setExport('HandLandmarker', {});
    this.setExport('FilesetResolver', {});
  }, {context});
  const load = file => {
    file = path.resolve(file);
    if (!cache.has(file)) cache.set(file, new vm.SourceTextModule(
      fs.readFileSync(file, 'utf8'), {context, identifier: file}
    ));
    return cache.get(file);
  };
  const data = load('js/data.js');
  await data.link((spec, ref) => spec.startsWith('https:') ? remote :
    load(path.resolve(path.dirname(ref.identifier), spec)));
  await data.evaluate();
  const d = data.namespace;
  const l = cache.get(path.resolve('js/libras.js')).namespace;
  const words = Object.values(d.WORDS).flat();
  assert.equal(l.STATIC_LETTERS.length, 24);
  assert.equal(l.MOTION_LETTERS.join(','), 'J,Z');
  assert.equal(new Set(l.SUPPORTED_LETTERS).size, 26);
  assert.equal(d.LETTER_POOL.length, 26);
  assert.equal(words.length, 90);
  assert.ok(words.every(w => [...w].every(c => d.LETTER_POOL.includes(c))));
  assert.ok(words.every(w => d.WORD_HINTS[w]));
  console.log('Dados OK: 26 letras, 90 palavras, todas com dica');
})().catch(error => { console.error(error); process.exitCode = 1; });
'@ | node --experimental-vm-modules -
if ($LASTEXITCODE -ne 0) { throw 'Validação dos dados falhou' }
```

## Histórico da FASE 00 — cenários diagnósticos executados

A auditoria avaliou as fontes reais em `vm.SourceTextModule`, com `localStorage` em memória, callbacks de rAF/intervalo/timeout guardados em mapas e um `HandLandmarker` substituto. A exposição temporária de `RULES`/`classify` ocorreu apenas na string da VM, sem editar os exports do arquivo.

| Cenário | Passos / resultado observado |
| --- | --- |
| FPS | Executar 20 callbacks com `currentTime` distinto e timestamps espaçados por 1.000 ms: o callback recebe FPS 20, apesar de uma inferência simulada por segundo. |
| Erro de inferência | Fazer o detector substituto lançar erro no callback seguinte: nenhum novo rAF é agendado. |
| Callback de outra sessão | `startPractice(1)` → `handleSign(target)` → capturar callback de avanço → `end()` → `startPractice(1)` → executar callback antigo: `round` aumenta indevidamente. |
| Sequência herdada | Após um acerto, executar `end()` e novo `startPractice(1)`: `bestStreak` continua 1. |
| I/Y | Features com extIndex/extMiddle/extRing=0, extPinky=1, thumbOut=1 e demais medidas afastando outras regras: I=1, Y=1; `classify()` retorna I por ordem. É um caso sintético, não estatística por usuário. |
| Níveis | Comparar cada caractere de WORDS com `LETTERS[c].difficulty`: 11/13 palavras do nível 1 e 6/21 do nível 2 contêm letras com dificuldade maior que a do banco. |

Essas reproduções confirmaram os comportamentos naquela auditoria. A FASE 01 corrigiu o FPS, a FASE 02 tratou parte dos recursos e callbacks antigos, e a FASE 02.1 corrigiu a sequência herdada; o estado atual está no código e no [roadmap](../docs/ROADMAP.md).

## Validação documental

Em ambiente com a skill global instalada, na raiz do projeto:

```powershell
py "$env:USERPROFILE\.codex\skills\maintaining-project-specs\scripts\validate_specs.py" .
```

O validador pertence ao ambiente do agente, não ao repositório. A inspeção adicional percorre apenas README, AGENTS, `docs/*.md` e `specs/**/*.md` e confere destinos de links locais, sem acessar a pasta aninhada preexistente. O diff de arquivos novos deve ser inspecionado também: `git diff` sozinho não os inclui.

## Limites da FASE 00 e verificações manuais pendentes

Na FASE 00 não foram medidos CPU/RAM, latência ou FPS reais nem testado MediaPipe real. A FASE 01 acrescenta as medições controladas e integração de navegador descritas acima. Reconhecimento por webcam, compatibilidade entre navegadores, leitor de tela, contraste ou navegação visual completa permanecem sem homologação. Servir os arquivos com HTTP 200 não comprova boot nem jogabilidade.

Quando autorizado, validar: câmera negada/ausente/ocupada, falhas de rede/modelo, play rejeitado, visibilidade da aba, sair/reiniciar durante avanços, guia aberto durante jogo, J/Z e letras similares, duas mãos no quadro, teclado/touch, proporções de tela e zoom. O planejamento está no [roadmap](../docs/ROADMAP.md).
