# Libras Arcade | Correção conjunta V/K, Fase 03.3B-2D.4

**Data:** 27/10/2026. **Branch:** `recovery/fase-033b13-6170a2d`. **HEAD de partida:** `a801633`. Alterações locais anteriores foram preservadas; não houve commit, push ou merge.

## Fonte e integridade

Foram analisadas seis capturas rotuladas em `C:\Users\JC INFORMATICA\Downloads\qa-vk-fase-033b2d4-baseline.json` (SHA-256 `E3DBC8FD4E856CC794920721CD1B5999A6871CB7A060D7F1E0BAD2993F95AA50`). São quatro tentativas legítimas, V/K nas mãos físicas direita e esquerda, e dois controles `four_spread`, todas frontais e com `mirrored:true`. O arquivo contém somente o diagnóstico opcional; não são armazenados aqui imagens, vídeo ou landmarks completos. `classify()` reproduziu candidata, segunda colocada e respectivos escores em **146/146 frames com mão** antes da mudança. As tentativas não estimam precisão populacional.

A captura K esquerda chegou ao limite de **120 eventos**. Seu resumo informa primeira confirmação K correta e uma confirmação total, mas o `signconfirmed` e todos os frames que levaram a ela já haviam saído do anel. Os 25 frames com mão preservados são posteriores e incluem V/F/L/O durante mudança de postura; não podem validar o efeito de um gate na primeira K. O replay temporal desse trecho truncado não reproduz fielmente o estado da tentativa inteira. É necessária uma nova tentativa curta de K esquerda.

## Contraste geométrico antes da confirmação visível

| Tentativa | Frames com mão até a primeira confirmação | Mediana `extRing` / `extPinky` | Mediana `thumbBetweenIM` | `scoreV` / `scoreK` | Primeira confirmação |
| --- | ---: | ---: | ---: | ---: | --- |
| V direita | 11 | −0,116 / −0,059 | 0,568 | 1,000 / 0,857 | V, aceita |
| V esquerda | 11 | −0,246 / −0,229 | 0,623 | 1,000 / 0,857 | V, aceita |
| K direita | 11 | −0,293 / −0,213 | 0,188 | 0,833 / 1,000 | K, aceita |
| K esquerda | trecho perdido | indisponível na confirmação | indisponível | indisponível | K no resumo; evento perdido |
| Quatro separados esquerda | 11 | 0,784 / 0,615 | 0,732 | 0,667 / 0,571 | V, incorreta |
| Quatro separados direita | 12 | 0,764 / 0,588 | 0,618 | 0,667 / 0,571 | V, incorreta |

Os indicadores e médios das três tentativas legítimas preservadas e dos controles estão estendidos; anelar e mínimo separados aparecem claramente abertos nos controles e recolhidos nos positivos. K direita posiciona a ponta do polegar próxima do meio dos PIPs de indicador/médio, em contraste com V e controles. `thumbBetweenIM` é uma distância **2D normalizada**, não uma prova de contato anatômico, e pode variar com oclusão e orientação. O guia `js/data.js` descreve V com indicador/médio em V e K com polegar entre a base desses dedos; nenhum limiar novo foi inferido das medianas acima.

## Regra localizada e replay de todas as candidatas

Em `RULES.V`, o escore mantém a média e o desconto direcional anteriores, mas é limitado pelo fechamento fuzzy de anelar e mínimo. Em `RULES.K`, a média antiga é limitada pelos mesmos dois fechamentos e pela proximidade fuzzy já existente do polegar. As faixas locais `FINGER_EXT_OFF/ON = 0,38–0,50` e `THUMB_NEAR_ON/OFF = 0,28–0,50` não foram alteradas. Cada fator fuzzy é calculado uma vez e reutilizado na média e no gate. U, limiar global, hold, cooldown e demais regras permanecem iguais.

No replay escalar com `_advanceConfirmation()` e timestamps registrados, os 11/11 frames pré-confirmação de cada V continuam vencendo e emitindo V no mesmo instante; K direita conserva 11/11 e a confirmação K. Nos dois controles, `scoreV` e `scoreK` caem de `0,667/0,571` para **0/0** nos trechos estáveis. U passa a ser a primeira colocada em 11/11 frames estáveis de cada controle, porém fica abaixo de 0,55; o W transitório da direita não sustenta hold. Ao percorrer todos os eventos retidos, nenhuma letra confirma nos controles sob o replay. Eventos de jogo posteriores à confirmação original são contrafactuais, e o replay não recompõe movimento, landmarks ou eventos perdidos.

**Risco de sucessora:** uma fixture de landmarks com quatro dedos abertos, mais alinhada verticalmente que os controles reais, sustentou **U** após os gates. Nesse caso `scoreU≈0,567` e a confirmação U ocorre após o hold. A regra U está fora do escopo desta fase e não foi modificada. Portanto, os replays reais disponíveis sustentam o patch para as duas perspectivas medidas, mas não garantem ausência de falsos U em outras orientações. Esta correção é **provisória para nova homologação**, não aprovação do conjunto B/W/F/V/K/U.

## Verificação e limites

O teste geométrico novo falhou antes do patch porque V aceitava anelar/mínimo abertos e passou depois. Ele cobre V/K com polegar distante/próximo, anelar ou mínimo aberto individualmente, fechamento na faixa fuzzy e pequenas oscilações. Três testes de integração novos cobrem quatro dedos separados sem V/K, V/K no Treino e Soletrar nas duas projeções espelhadas, confirmação única, cooldown, liberação e novo hold. As suítes existentes cobrem R/U/B/W/F e demais letras. Espelhamento matemático não comprova mão física, e essas fixtures não são a própria captura do MediaPipe.

No estado local atual, `js/forca.js` foi movido para `docs/forca.js` por uma alteração preexistente e não relacionada; o conteúdo tem hash Git idêntico. Por isso `npm.cmd test` **sem substituição** falha com `ENOENT` antes da execução das suítes. Os três scripts npm foram repetidos com `NODE_OPTIONS` apontando para uma substituição de leitura **somente no processo de teste**, que lê a cópia idêntica em `docs/forca.js`, sem editar esses arquivos: **206/206** geral (incluindo cinco testes novos), **193/193** câmera simulada e **13/13** contratos de performance. Esses resultados são condicionais à cópia equivalente; os scripts npm sem essa condição ainda precisam ser repetidos após resolver a movimentação local. Nenhum benchmark de CPU, FPS ou memória física foi realizado. O custo novo é constante e pequeno: reutiliza três fatores fuzzy já calculados e acrescenta uma operação `Math.min` por regra.

`node --check` passou em `js/*.js` e nos dois testes alterados; `git diff --check` e `git diff --cached --check` também passaram. O validador de specs falha apenas no link preexistente para `../../js/forca.js`, atualmente ausente pela movimentação citada. A validação deve ser repetida após essa pendência local ser resolvida.

## Revisão e homologação seguinte

Para CodeRabbit: verificar que os gates não admitem compensação de anelar/mínimo ou polegar em K; que a distinção V/K em mãos legítimas não depende do alvo do jogo; que U pode surgir como sucessora em perspectivas mais frontais; e que a captura K esquerda não protege a primeira confirmação. Revisar o teste e a execução condicionada por `js/forca.js` ausente.

Coletar tentativas **novas e independentes**, cada uma encerrada na primeira confirmação ou em janela fixa curta, de V e K nas duas mãos físicas, mais `four_spread` nas duas mãos. Incluir pequenas rotações frontais para examinar a migração U. Registrar distância, orientação real, espelhamento, iluminação e sequência de candidatos, `scoreV/K/U`, `extRing/Pinky`, `thumbBetweenIM`, `hold_reset`, `signconfirmed`, `ui_received` e `game_decision`. Acrescentar controles R/U/B/W/F; confirmar que as letras legítimas sustentam o hold e que o controle separado não confirma **nenhuma** letra indevida. Não declarar V ou K recuperadas até essa rodada pós-patch, com ênfase na K esquerda curta e no possível falso U.
