---
id: CHG-20261026-fase-033b2b2-r-regressao
status: implemented
date: 2026-10-26
affected_capabilities: core
---

# FASE 03.3B-2B.2 — regressão real de R e medição complementar

## Problema e contexto

O relatório `Libras_Arcade_R_Regressao_Webcam_033B2B1_2026-10-26.md` e o JSON `qa-r-regressao-webcam.json`, fornecidos fora do repositório, contêm seis capturas rotuladas com webcam. As quatro capturas R emitiram U; os dois controles U emitiram U e foram aceitos no Treino. A captura R/esquerda estendida emitiu U duas vezes, portanto não é tentativa independente válida para desempenho. Os arquivos brutos não são versionados aqui.

Até a primeira confirmação nas quatro capturas R, 23 eventos `recognition` tinham mão detectada: 19 mostraram `crossDepthIM = null`, quatro tinham interseção projetada mas `scoreR < 0,55`, nenhum tinha R como candidata principal. `signconfirmed=U` chegou à UI e o jogo rejeitou a letra com `wrong_letter`. A falha observada está na classificação, antes do hold, da interface e da decisão do jogo. Os eventos são amostras, não frames completos nem tentativas independentes.

## Resultado esperado

Localizar a perda de R com medidas reais comparáveis aos controles U e preservar U legítimo. A recuperação funcional de R requer evidência geométrica adicional e nova homologação em webcam.

## Escopo

Recalcular o escore anterior nos eventos reais, medir lacunas e posições dos segmentos só na calibração opcional, testar a instrumentação e registrar os limites da decisão.

## Não escopo

Alterar regras R/U ou outras letras, limiar global, hold, cooldown, jogos, UI, cadência da câmera ou gravar mídia e landmarks completos.

## Comparação numérica com a regra anterior

A regra anterior era a média de cinco termos: extensão de indicador e médio com `fuzzyOn(0,38; 0,50)`, fechamento de anelar e mindinho com o complemento dessa função, e `fuzzyOff(crossIM, 0,22; 0,42)`. Os cinco escalares constam dos mesmos eventos. O cálculo abaixo usa apenas eventos com mão até a primeira confirmação de cada captura; `scoreRLegacy` foi reconstruído fora do runtime.

| Captura | Intenção | Amostras | R anterior (mín.–máx.) | R atual (mín.–máx.) | U (mín.–máx.) | Anterior supera U |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| 1 | R direita estendida | 10 | 0,465–0,800 | 0–0,511 | 0,563–0,982 | 0 |
| 2 | R esquerda estendida | 4 | 0,800–0,800 | 0–0,233 | 0,976–0,990 | 0 |
| 3 | R direita curvada | 5 | 0,400–0,874 | 0 | 0,685–0,967 | 0 |
| 4 | R esquerda curvada | 4 | 0,857–0,908 | 0 | 0,904–0,955 | 1 |
| 5 | U esquerda | 4 | 0,800–0,800 | 0 | 0,982–0,983 | 0 |
| 6 | U direita | 5 | 0,600–0,800 | 0 | 0,828–0,976 | 0 |

No evento amostrado da **primeira confirmação**, a comparação usa o mesmo frame em cada linha:

| Captura | R anterior | R atual | U | R anterior − U | Candidata/emitida |
| --- | ---: | ---: | ---: | ---: | --- |
| 1 | 0,800 | 0,511 | 0,977 | −0,177 | U / U |
| 2 | 0,800 | 0,233 | 0,986 | −0,186 | U / U |
| 3 | 0,867 | 0 | 0,929 | −0,062 | U / U |
| 4 | 0,900 | 0 | 0,909 | −0,009 | U / U |
| 5 | 0,800 | 0 | 0,983 | −0,183 | U / U |
| 6 | 0,800 | 0 | 0,974 | −0,174 | U / U |

Nas quatro capturas R, o escore antigo seria elegível em 20/23 amostras, mas superaria a candidata atual em apenas uma, por cerca de **0,004**, numa amostra transitória da captura 4. Nos nove eventos dos controles U, o escore antigo também seria elegível, sem vencer U. Restaurar a média anterior não demonstra recuperação sustentada de R e enfraqueceria a rejeição de R sem cruzamento. A amostragem de 200 ms não reconstrói o hold que o motor anterior teria produzido em todos os frames.

Na janela completa da captura 2, após o primeiro U emitido, seis amostras apresentaram `scoreR ≥ 0,55`, com máximo de 0,703; R ainda não venceu a candidata principal. Essas amostras não entram na comparação de uma tentativa independente nem demonstram que o jogo aceitaria R após rearmamento.

## Alternativas e decisão

`projectedCrossDepth()` exige interseção exata entre segmentos MCP–PIP–DIP–ponta na imagem; sem ela, o fator de R zera. Quando existe, R ainda multiplica ordem 3D das pontas, proximidade de profundidade e eixo projetado da palma. Na amostra R/direita anterior ao U incorreto, `crossOrderIM≈0,082`, `crossDepthIM≈0,008`, `palmAxisIM≈0,150`, `scoreR≈0,511` e `scoreU≈0,977`. Assim, remover somente a exigência de interseção não resolveria essa amostra.

Nas janelas finais de aproximadamente 700 ms, `crossOrderIM` R variou de −0,196 a 0,082, enquanto U variou de −0,158 a −0,110. `palmAxisIM` e `spreadIM` também se sobrepuseram. Diferenças observadas em `crossIM` e curvatura são de poucas capturas, com transições de pose e sem landmarks completos para localizar os segmentos. Não há base para transformar essas faixas em limiar de classificação seguro. A decisão nesta entrega é **não alterar `RULES.R` nem `RULES.U`**; R continua não homologada.

Restaurar a média anterior não venceria U de forma sustentada. Reduzir U, mudar o limiar global ou favorecer o alvo do jogo violaria os controles e não explicaria a geometria. Um novo limiar para `crossIM`, curvatura ou ordem das pontas extrapolaria seis capturas. A alternativa escolhida é medir a aproximação entre segmentos no próximo ensaio pareado.

## Solução e fluxo

Somente com `startCalibration()` ativo, cada evento `recognition` com mão inclui seis escalares adicionais:

- `crossGap2DIM`: menor distância entre os segmentos projetados, dividida pela escala da mão; zero indica encontro ou sobreposição colinear na projeção.
- `crossGap3DIM`: menor distância tridimensional entre os segmentos, possivelmente em outra posição da medição 2D.
- `crossGap3DAt2DIM`: distância tridimensional nos dois pontos que deram a menor lacuna projetada.
- `crossProgressIndex2D` e `crossProgressMiddle2D`: posição desses pontos ao longo do respectivo dedo, de MCP (0) à ponta (1), ponderada pelo comprimento projetado dos três segmentos.
- `crossOrder2DIM`: ordem relativa das pontas no eixo projetado dos MCP, sem o componente de profundidade de `crossOrderIM`.

O cálculo considera os nove pares de segmentos e também casos paralelos ou degenerados. Nenhum dos campos participa de `classify()`, `state.features`, hold, cooldown ou jogos. O registro continua desligado por padrão e local. Durante a calibração rotulada, `recognition` é registrado a cada inferência para mostrar variações consecutivas; fora dela, permanece a amostragem de 200 ms ou mudança de estado. O anel conserva no máximo 120 eventos, que podem ser sobrescritos mais cedo numa tentativa longa. Não captura imagens, vídeos ou landmarks completos. O custo adicional só ocorre durante calibração rotulada e ainda não foi medido em webcam.

## Interfaces e dados afetados

`read().events[].recognition` recebe somente os seis escalares acima durante `startCalibration()`. A API de captura, `signconfirmed`, `state.features`, os jogos e os demais eventos mantêm seus formatos. `SAFE_FIELDS` filtra os valores para números finitos antes de inseri-los no buffer.

## Falhas, segurança e compatibilidade

Lacuna 2D pequena também pode ocorrer em U com dedos muito próximos; lacuna 3D mínima pode estar na base dos dedos, longe do cruzamento pretendido. As posições indicam onde isso ocorre, mas não validam a postura física sem landmarks. A validade estrutural atual verifica `x/y`, não a qualidade anatômica nem finitude de `z`; um escalar não finito é omitido do evento. As medidas não devem ser interpretadas como probabilidade ou como limiar aprovado. A captura segue voluntária e sem persistência automática.

## Estratégia de testes

Dois testes foram vermelhos pela ausência dos campos e passaram após a implementação. Uma fixture de aproximação sem interseção mantém `scoreR=0` e compara lacuna projetada com U paralelo; outra confirma que sobreposição projetada com separação em profundidade registra as duas dimensões sem tornar R elegível. São testes de medição, não evidência de reconhecimento real de R. As suites de câmera simulada cobrem Treino, Soletrar, hold, cooldown e rearmamento preexistentes; não houve alteração funcional desses caminhos.

Uma captura nova deve isolar uma pose e terminar na primeira confirmação ou após uma janela fixa curta, salvando `stopCalibration()` logo após para evitar sobrescrever o início. Repetir R estendido e cruzado nas duas mãos, R curvado como investigação separada e U paralelo nas duas mãos, anotando orientação, distância e espelhamento reais. Comparar `crossGap2DIM`, `crossGap3DAt2DIM`, posições de proximidade, ordens 2D/3D, `scoreR`, `scoreU`, primeira letra emitida e decisão do jogo. Captura com mais de uma confirmação é inadequada como tentativa independente. Se essas medidas não separarem R/U, discutir coleta pontual de landmarks reais sob escopo e consentimento específicos; os escalares atuais não permitem reconstruir a geometria completa.

## Critérios de aceite

A instrumentação deve fornecer lacuna e posição finitas em exemplos de aproximação, paralelismo e sobreposição 2D com separação 3D, sem alterar escores nem emissão. A correção funcional permanece pendente até R estendido cruzado confirmar nas duas mãos e U legítimo continuar confirmável em webcam real.

## Consolidação na memória viva

O estado parcial e o próximo ensaio constam de `../capabilities/core.md`, `../system.md`, `../testing.md`, `../../docs/ROADMAP.md` e `../../docs/state.md`.

## Próximo passo

Obter novas capturas pareadas com esta instrumentação, estudar controles U com os dedos mais próximos e R com pequenas variações/oclusão, e somente então propor uma regra localizada e novos testes de regressão. Homologar R estendido cruzado em ambas as mãos e U legítimo em ambas as mãos na webcam antes de declarar recuperação. E/M seguem em diagnóstico; N/S e as demais regras ficam fora desta alteração.
