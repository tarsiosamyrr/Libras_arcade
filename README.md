# Libras Arcade 1.5

Jogo educacional de datilologia em Libras, desenvolvido no contexto de uma Liga de Inteligência Artificial. A webcam fornece landmarks da mão para um classificador geométrico executado no navegador, que alimenta os modos **Treino, Soletrar e Forca**.

Esta documentação descreve a auditoria da FASE 00, as alterações de performance da FASE 01, o ciclo de vida da câmera da FASE 02 e as correções de armazenamento e estatísticas da FASE 02.1. A aplicação atual continua em JavaScript, sem backend Python, TypeScript ou etapa de treinamento de letras.

Repositório: [Darkzin41/Libras_arcade](https://github.com/Darkzin41/Libras_arcade).

## Os três jogos

| Modo | Funcionamento atual | Progressão |
| --- | --- | --- |
| Treino | Sorteia uma letra conforme a dificuldade. A letra confirmada é comparada com o alvo; acertos somam pontos, erros e tempo esgotado zeram a sequência. | Sobe um nível a cada 5 letras corretas, até o nível 5. |
| Soletrar | Sorteia uma palavra e recebe suas letras em ordem. O cronômetro é por letra; completar a palavra acrescenta bônus. | Sobe um nível a cada 5 letras corretas, até o nível 5. |
| Forca | Sorteia palavra e dica. Cada palpite correto revela todas as ocorrências; repetidos não acrescentam erros. Com 6 erros, perde-se a rodada. Não há cronômetro. | Sobe um nível a cada 3 palavras vencidas, até o nível 5. |

O menu permite escolher os níveis iniciais 1, 2 e 3; os níveis 4 e 5 são alcançados pela progressão. Treino e Soletrar compartilham um recorde local; a Forca mantém outro. A melhor sequência de Treino/Soletrar e as vitórias da Forca pertencem à sessão atual. Não há limite de rodadas para encerrar automaticamente a sessão. Após vitória/derrota na Forca, uma nova palavra começa após 1,6 s; no Treino e ao concluir uma palavra, a pausa de avanço é de 450 ms.

## Como executar

Sirva a raiz que contém este README, `index.html`, `js/` e `css/`. Não abra o HTML por `file://`.

Requisitos: webcam com permissão, navegador com módulos ES, Canvas, `getUserMedia` e suporte ao runtime MediaPipe/WASM e ao delegate GPU solicitado. Use `localhost` ou HTTPS. Não existe matriz de compatibilidade validada nesta fase nem fallback explícito de GPU para CPU.

Com Python 3 já instalado, execute na raiz:

```powershell
# Windows com Python Launcher
py -m http.server 8000 --bind 127.0.0.1
```

Em ambientes onde Python 3 é acessível por `python` ou `python3`, use esse executável com os mesmos argumentos. Abra [localhost:8000](http://localhost:8000), clique em **Começar** e permita a câmera. Pare o servidor com `Ctrl+C`. Python serve apenas os arquivos estáticos nessa opção; não processa os sinais.

Alternativas existentes de desenvolvimento: Live Server do VS Code ou `npx serve` com Node.js instalado. `npx serve` pode baixar o pacote de servidor; ele não é uma dependência versionada do projeto. O `package.json` contém apenas comandos de teste; a aplicação não exige `npm install`, dependências locais ou etapa de build.

É necessária conectividade para os recursos externos quando eles não estiverem em cache. O repositório não contém service worker, modelo local ou garantia de funcionamento offline.

## Interação

| Ação | Entrada implementada |
| --- | --- |
| Escolher um modo | Clique/toque ou cursor do indicador com pinça sobre o cartão. |
| Escolher nível inicial | Clique/toque nos números 1–3; não há seleção de nível por gesto implementada. |
| Confirmar letra estática | Sustentar a candidata por 600 ms, com tolerância de 250 ms a perda breve da candidata. |
| Confirmar J/Z | Formar pose-base e executar trajetória; reconhecimento experimental separado do hold. |
| Abrir guia | Botões “Guia do alfabeto” ou “Aprender Libras”. |
| Sair da rodada | Botão Sair, `Esc`, pinça sobre Sair ou deslize da mão da esquerda para a direita na imagem espelhada. |
| Fechar guia | Clique em Fechar, `Esc`, deslize ou punho fechado fora das telas de jogo. |
| Abrir diagnóstico | Tecla `d`; o painel fica oculto pelo CSS em telas de até 720 px. |

Mouse/toque são alternativas de **navegação**; as respostas dos jogos continuam dependendo do reconhecimento. O teclado desenhado na Forca é um indicador de palpites, sem entrada por clique. O suporte de navegação por teclado está incompleto: os cartões recebem foco, mas não tratam Enter/Espaço.

Há marcação de identificação do jogador e ranking, porém o ranking não tem preenchimento/persistência implementados e faltam estilos específicos desses painéis. A presença dos botões não significa um ranking funcional. Veja os achados no [roadmap](docs/ROADMAP.md).

## Reconhecimento existente e limites

A cobertura **nominal** do código é de 26 letras:

- Regras estáticas: `A B C D E F G H I K L M N O P Q R S T U V W X Y`.
- Trajetórias experimentais: `J Z`.

Essa lista descreve a implementação, não comprova precisão, conformidade pedagógica ou reconhecimento confiável de todas as letras. H, K e X, por exemplo, são tratados como poses estáticas neste código; isso não é uma afirmação linguística sobre a realização correta desses sinais em Libras.

O MediaPipe detecta a mão e seus 21 pontos; a classificação das letras é feita por regras próprias. Distâncias são normalizadas pela distância entre pulso e base do dedo médio, com proteção contra divisão por zero. Extensão/curvatura de dedos, posição do polegar, distâncias e orientação recebem escores fuzzy. A maior pontuação acima de `MIN_SCORE = 0.55` vira candidata. O percentual apresentado como “confiança” é um escore heurístico, sem calibração estatística.

J/Z usam histórico de até 1.300 ms, suavização por 3 amostras, mínimo de 6 amostras e critérios de trajetória. O reconhecimento estático continua ativo durante esse processamento, podendo competir com a pose-base. Há ainda desempates por ordem de regras, como o caso sintético de I/Y registrado na auditoria. Iluminação, oclusão, escala, posição, orientação e frequência de frames precisam de avaliação real.

A configuração atual detecta **uma mão** (`numHands: 1`), atribui a primeira detecção ao papel lógico `right` e mantém `REQUIRE_LEFT_HAND: false`. Não identifica lateralidade nesse caminho. O painel de duas mãos é um resquício de outra configuração; ativar só a flag da esquerda impediria confirmações.

As 90 palavras cadastradas têm dicas e usam letras da cobertura nominal. A dificuldade das palavras não é filtrada pela dificuldade individual das letras; Soletrar/Forca não têm exatamente o mesmo conjunto por nível que Treino.

## Arquitetura e estrutura

```text
.
├── index.html              # Telas, vídeo, Canvas, HUD, guia e painéis
├── css/style.css           # Tema HUD, estados visuais e regra responsiva
├── js/
│   ├── app.js              # Boot, desenho e conexão dos componentes
│   ├── vision.js           # MediaPipe, câmera, loop e landmarks
│   ├── libras.js           # Regras estáticas, trajetórias, hold e navback
│   ├── data.js             # Letras, dificuldades, 90 palavras e dicas
│   ├── game.js             # Treino/Soletrar, pontos, sequência e tempo
│   ├── forca.js            # Palpites, erros e vitórias da Forca
│   └── ui.js               # DOM, eventos, telas, cursor e interações
├── AGENTS.md               # Contrato de engenharia e regras de Git
├── docs/ROADMAP.md         # Diagnóstico classificado e fases futuras
├── docs/state.md           # Estado da entrega e próxima ação
└── specs/                  # Arquitetura detalhada, contratos e evidências
```

`app.js` carrega modelo e câmera após o clique inicial, constrói os motores e inicia o loop. A cada inferência, desenha a mão, atualiza `LibrasEngine` e entrega o cursor à UI. O motor emite `frame`, `signconfirmed` e `navback`; a UI encaminha a letra ao jogo ativo e traduz seus eventos para o DOM.

O detalhamento de dependências, eventos e recursos está em [specs/system.md](specs/system.md). O catálogo pedagógico importa o classificador, que importa a visão; portanto até os motores de jogo têm uma dependência transitiva do módulo remoto de MediaPipe.

## Tecnologias e dependências efetivas

| Tecnologia | Uso verificado |
| --- | --- |
| JavaScript com módulos ES, HTML e CSS | Aplicação estática, sem framework ou bundler. |
| MediaPipe Tasks Vision `0.10.14` | Import JS e WASM via jsDelivr; `HandLandmarker` em modo VIDEO com delegate GPU. |
| Modelo `hand_landmarker/float16/1` | Download de `storage.googleapis.com` durante o boot. |
| Canvas, `requestAnimationFrame`, eventos nativos | Desenho, agendamento e comunicação entre módulos. |
| Google Fonts | Rajdhani e Share Tech Mono importadas pelo HTML. |
| `localStorage` | Recordes de pontuação, quando disponível; não armazena imagens ou landmarks. |

## Performance e diagnóstico

Já existem intervalo mínimo de 50 ms entre tentativas de inferência, descarte de frames com `currentTime` repetido, captura solicitada em 320×240 (máximo 480×360, até 30 FPS), Canvas interno de 640×480 e caches parciais de texto/estado na UI.

Na FASE 01, o FPS passou a contar inferências concluídas na última janela de 1.000 ms. O loop mantém uma única cadeia de rAF; o Canvas evita redefinir dimensões iguais e limpar repetidamente uma imagem já vazia. Modelo, resolução, limites de confiança, regras e cadência mínima foram preservados.

Para consultar as métricas locais pelo console do navegador:

```javascript
const vision = await import('./js/vision.js');
vision.getPerformanceMetrics();
```

O snapshot retorna FPS, callbacks, inferências e callbacks ignorados por frame repetido/intervalo; média, p95 e máximo de inferência, consumidor (desenho + reconhecimento + UI) e trabalho total do ciclo, em milissegundos. Tempos usam as últimas 120 amostras; FPS usa apenas 1 s. Os buffers ocupam 3.840 bytes de dados numéricos. A consulta calcula os percentis, sem ordenar arrays a cada inferência. O HUD recebe FPS na última inferência; se o vídeo parar, consulte o snapshot para observar a expiração para zero.

Há comparação com MediaPipe real, vídeo controlado sem mãos e os três modos em Edge/Windows. Protocolo, números, arquivos brutos e avaliação de Worker/rVFC estão no [relatório da FASE 01](docs/performance/FASE01.md). O ganho comprovado é a remoção de trabalho redundante do Canvas; variação de tempo do modelo não é atribuída à alteração. Não há medição de CPU/RAM total nem homologação de precisão por webcam.

`detectForVideo()` continua síncrono na thread principal. Permanecem alocações de eventos, objetos e arrays; o diagnóstico aberto serializa JSON a cada frame. Worker e `requestVideoFrameCallback` não foram adotados, conforme justificativas e limites registrados no relatório.

## Webcam, privacidade e erros

No código auditado, imagens e landmarks são processados no navegador, sem rotinas de upload ou gravação automática. `audio: false` dispensa captura de microfone. O acesso à rede carrega JS, WASM, modelo e fontes; isso não significa que o site seja totalmente offline. Os imports JS e fontes começam antes do clique; inicialização do modelo/WASM e solicitação da câmera ocorrem depois.

Os únicos dados persistidos pela aplicação são os recordes nas chaves `libras-arcade:best-score` e `libras-arcade:best-score-forca`. O nome informado apenas atualiza o HUD no fluxo existente.

Se o armazenamento local falhar, os jogos continuam e o recorde permanece em memória enquanto a página estiver aberta. A falha é registrada no console. No próximo fim de sessão (Treino/Soletrar) ou vitória/fim (Forca), o jogo tenta ler e salvar o maior recorde novamente. Um recorde ainda não salvo pode ser perdido ao fechar ou recarregar a página.

Sair de uma rodada volta ao menu e mantém a câmera ativa para navegação por gesto. Ao ocultar a aba, a aplicação pausa inferência e rodada, interrompe as trilhas de vídeo e limpa gestos incompletos. Ao voltar, solicita a câmera novamente e retoma o tempo restante. Em `pagehide`, fecha o modelo; uma restauração pelo cache do navegador o carrega novamente.

Falhas de permissão, câmera ausente ou ocupada e erros de inferência mostram uma tela com **TENTAR NOVAMENTE**. A abertura da câmera aguarda dados do vídeo e a promessa de `play()`, com limite de 10 s para dados iniciais. Confira conexão, origem local/HTTPS, permissão e disponibilidade da webcam. Falhas no import remoto ainda podem ocorrer antes do tratamento do aplicativo; não há fallback de GPU para CPU. As decisões e os cenários manuais estão em [Fase 02 — câmera e recursos](docs/fase-02-camera-recursos.md).

## Testes e validação

Os testes focados das FASES 01 e 02 usam o runner nativo do Node. A versão mais antiga efetivamente verificada é **Node.js 24.18.0**; versões anteriores não foram testadas nesta integração. Execute na raiz:

```powershell
npm test
npm run test:performance
npm run test:camera
```

Sem npm, os comandos equivalentes são:

```powershell
node --experimental-vm-modules --test tests/performance.test.cjs tests/phase02.test.mjs
node --experimental-vm-modules --test tests/performance.test.cjs
node --test tests/phase02.test.mjs
```

`tests/performance.test.cjs` usa `vm.SyntheticModule` e `vm.SourceTextModule`, indisponíveis no Node 24.18.0 sem `--experimental-vm-modules`. Por isso a suíte completa e a FASE 01 usam a flag; os testes da FASE 02/02.1 rodam sem ela. Os testes cobrem FPS/latências, buffer, agendamento, Canvas, eventos dos três jogos, ciclo de câmera/modelo, pausa/retomada, falhas de armazenamento, estatísticas entre sessões e comparação sintética com a base. Os scripts de navegador usam Playwright disponível no ambiente; não há instalação automática, CI, lint, typecheck ou build. Comandos, resultados e limites estão em [specs/testing.md](specs/testing.md).

Precisão por webcam, navegação completa, acessibilidade e compatibilidade entre navegadores permanecem sem homologação. O benchmark sem mãos não mede a precisão das letras; os demais achados da auditoria seguem no roadmap.

## Evolução com Python e contribuição

A FASE 06 propõe pesquisa consentida de landmarks rotulados, normalização, separação de treino/avaliação, avaliação por letra e matriz de confusão, além de comparação entre classificadores estáticos e modelos temporais. Ferramentas e formato de exportação dependerão dos resultados. Não há dataset, classificador treinado de letras ou backend Python entregue. Não se deve gravar imagens/biometria automaticamente nem introduzir backend sem justificativa e autorização.

Antes de contribuir, leia [AGENTS.md](AGENTS.md), o [índice técnico](specs/README.md) e o [roadmap](docs/ROADMAP.md). Preserve os três jogos, a identidade visual e os dados pedagógicos. Trabalhe na branch autorizada para cada entrega, tarefa por tarefa, sem commit, push, PR ou merge sem autorização.

## Uso educacional e licença

Os diagramas são esquemas de dedos, não referências oficiais de Libras. A validação de sinais, dicas e movimentos requer especialistas em Libras. O jogo não substitui formação com profissionais e materiais pedagógicos validados.

O README anterior declarava licença MIT, mas não há arquivo `LICENSE` no conjunto versionado auditado. A formalização da licença está registrada como pendência; esta fase não adiciona nem altera termos de licença.
