# 🤟 LIBRAS ARCADE — Jogo Educativo de Datilologia por Gestos

Um jogo educativo, no mesmo estilo visual e técnico do
[`jarvis-hud`](.) (interface holográfica controlada por gestos), que ensina
o **alfabeto manual (datilologia) da Libras** transformando sua webcam em
controle de jogo: você forma o sinal com a mão de verdade e o próprio app
reconhece a letra.

Projeto irmão de [`jarvis-hud`](.) e inspirado na ideia de reconhecimento de
gestos do repositório
[`CristianSena17/Reconhecimento-Libras`](https://github.com/CristianSena17/Reconhecimento-Libras),
mas reimplementado **100% no navegador** (sem Python, sem backend, sem passo
de treinamento) — ver seção [Método adotado](#-método-adotado-e-diferença-para-o-projeto-de-referência) para
entender exatamente o que foi reaproveitado e o que foi refeito.

---

## ⚡ A EXPERIÊNCIA

Na tela inicial você escolhe um modo e um nível apontando + fechando a
pinça sobre o cartão (ou clicando, se preferir mouse/touch):

- **🔤 Modo Treino** — o jogo mostra uma letra; você forma o sinal
  correspondente com a mão e segura por ~0,7s até a barra circular
  completar. Acertou, ganha pontos e cai a próxima letra.
- **🧩 Modo Soletrar** — o jogo sorteia uma palavra e você soletra letra por
  letra, contra um cronômetro. Completar a palavra dá um bônus de pontos.

Sequências de acertos (streak) multiplicam sua pontuação. Errou ou o tempo
acabou? A sequência zera, mas o jogo continua — sem "vidas", pra manter o
foco em aprender, não em punir.

---

## 🛠 REQUISITOS DO SISTEMA

- **Navegador:** Chrome ou Edge recomendados (também funciona em Firefox e Safari)
- **Hardware:** Webcam
- **Conexão:** Internet na primeira execução (baixa o runtime WASM e o
  modelo `.task` do MediaPipe via CDN — depois fica em cache do navegador)
- Não precisa de Python, Node no runtime, nem instalação de dependências —
  é um site estático puro, igual ao `jarvis-hud`

---

## 🚀 COMO RODAR LOCALMENTE

Câmeras só funcionam em contexto seguro (`localhost` ou `https`), então
**não abra o `index.html` com duplo clique** — sirva por um servidor local:

### Opção 1 — Node.js (recomendado)
```bash
npx serve
```

### Opção 2 — VSCode
Instale a extensão **Live Server** e clique em "Go Live" com o `index.html` aberto.

### Opção 3 — Python (se já tiver instalado)
```bash
python3 -m http.server 8000
```

Depois acesse o endereço mostrado no terminal e permita o acesso à câmera.

---

## 📂 ESTRUTURA DO PROJETO

```
libras-arcade/
├── index.html          # Estrutura da interface (HUD, menu, telas de jogo)
├── css/
│   └── style.css       # Tema visual (herdado do jarvis-hud + componentes de jogo)
├── js/
│   ├── vision.js        # Carrega o MediaPipe HandLandmarker e a webcam (igual jarvis-hud)
│   ├── libras.js          # Classificador geométrico do alfabeto manual (o "cérebro" novo)
│   ├── game.js              # Motor de gamificação: modos, pontuação, streak, timer
│   ├── data.js                # Dicas de cada letra + banco de palavras do modo Soletrar
│   ├── ui.js                    # Liga reconhecimento + jogo à interface (telas, feedback)
│   └── app.js                     # Ponto de entrada: boot, câmera, loop, orquestração
└── README.md
```

---

## 🖐 COMO INTERAGIR

| Ação                                    | Como fazer                                                        |
| ---------------------------------------- | ------------------------------------------------------------------ |
| Escolher modo/nível no menu               | Aponte com o indicador + feche a pinça sobre o cartão (ou clique)   |
| Sinalizar uma letra                       | Forme o sinal com a mão e **segure** até a barra circular completar |
| Ver o guia do alfabeto                    | Botão "📖 GUIA DO ALFABETO" no rodapé                                |
| Sair do jogo e voltar ao menu             | Botão "🚪 SAIR" no rodapé (ou tecla `Esc`)                           |
| Ver dados brutos do classificador (debug) | Tecla `d`                                                          |

> Por que sair não é por gesto? Porque o gesto de "punho fechado" é
> literalmente a forma da letra **A** neste alfabeto — usar punho como
> atalho de saída faria o jogo te tirar da tela toda vez que você tentasse
> acertar o sinal de A. Por isso, dentro do jogo, sair é sempre uma ação
> explícita (botão ou tecla), e a navegação por gesto fica só no menu, onde
> não há sinais sendo avaliados.

---

## 🔤 LETRAS SUPORTADAS NESTA V1

`A · B · D · F · I · L · O · U · V · W · Y`

Este classificador reconhece **sinais estáticos** (uma "foto" da mão já
formada). Letras que dependem de **movimento** (H, J, K, X, Z, entre outras)
ou de diferenças muito finas de toque/orientação (C, E, G, M, N, P, Q, R, S,
T) ficam fora da v1 — veja como estender isso na seção abaixo.

Todas as palavras do banco do modo Soletrar (`js/data.js`) usam só essas
letras, então tudo é jogável de ponta a ponta.

---

## 🧠 COMO FUNCIONA

1. `vision.js` carrega o **MediaPipe Tasks Vision** (`HandLandmarker`) e
   liga a webcam — exatamente como no `jarvis-hud`. Nenhum vídeo sai do seu
   navegador; toda a inferência roda localmente (WASM/GPU).
2. `app.js` chama `detectForVideo()` em loop, desenha o esqueleto da mão no
   `<canvas>` e repassa os landmarks para dois lugares:
   - `libras.js`, que classifica a letra;
   - um cálculo simples de cursor/pinça (só para navegar no menu).
3. `libras.js` (`LibrasEngine`) normaliza os 21 pontos da mão pela escala
   do próprio punho (igual `gestures.js` do `jarvis-hud`) e calcula, por
   sinal candidato, o quanto o formato da mão "bate" com o padrão esperado
   daquela letra (dedos estendidos/fechados, polegar afastado/cruzado,
   dedos juntos/separados, pinça polegar-indicador etc). A letra com maior
   pontuação acima de `MIN_SCORE` vira candidata; se ela for sustentada por
   `HOLD_MS`, dispara o evento `signconfirmed`.
4. `game.js` (`Game`) recebe a letra confirmada, compara com o alvo atual
   (uma letra solta no Treino, ou a próxima letra da palavra no Soletrar),
   atualiza pontuação/streak/timer e emite eventos (`correct`, `wrong`,
   `wordcomplete`, `timeout`, `tick`, `sessionend`).
5. `ui.js` escuta tudo isso e atualiza a tela: cartão da letra-alvo, anel de
   "segurando o sinal", barra de tempo, placar, flashes de acerto/erro e as
   telas de menu/jogo/resultado/guia.

---

## 🔬 MÉTODO ADOTADO (E DIFERENÇA PARA O PROJETO DE REFERÊNCIA)

O repositório [`CristianSena17/Reconhecimento-Libras`](https://github.com/CristianSena17/Reconhecimento-Libras)
usa **Python + OpenCV + MediaPipe (Python) + uma rede neural treinada
(TFLite)** sobre um histórico de coordenadas gravado em CSV — ele grava
gestos com a própria webcam, gera um dataset e treina um classificador.
Isso dá alta precisão e cobre o alfabeto completo + gestos dinâmicos, mas
exige um passo de coleta de dados e treinamento, e roda como um app
Python de desktop.

Para manter a filosofia **100% client-side / zero backend / zero passo de
treinamento** do `jarvis-hud`, este projeto usa em vez disso um
**classificador geométrico por regras**: calcula distâncias entre pontos
da mão (a mesma técnica de normalização por escala do `gestures.js`
original) e compara com um "padrão esperado" de cada letra. Funciona sem
dataset, sem servidor, sem passo de treino — mas cobre só um subconjunto
de letras estáticas e é mais sensível a variações de mão/câmera do que um
modelo treinado.

### Como evoluir para reconhecimento treinado (opcional)

Se quiser precisão de nível "modelo treinado" mantendo tudo no navegador,
dá pra trocar só o `libras.js` por um modelo em **TensorFlow.js**, sem
mexer no resto do app (a interface só espera que `LibrasEngine` emita
`signconfirmed` com uma letra):

1. Grave seu próprio dataset (landmarks + rótulo da letra) usando o mesmo
   `HandLandmarker` já carregado aqui, salvando em `localStorage` ou como
   download de CSV.
2. Treine um classificador simples (rede densa pequena, como no notebook
   `gesture_sign_classificationN.ipynb` do projeto de referência) usando
   TensorFlow/Keras em Python.
3. Converta o modelo para o formato TensorFlow.js
   (`tensorflowjs_converter`).
4. Carregue esse modelo em `libras.js` com `@tensorflow/tfjs` (via CDN,
   igual o MediaPipe) e substitua a função `classify()` por uma chamada
   `model.predict(features)`.

Isso cobriria também letras dinâmicas (H, J, K, X, Z), desde que você
alimente o modelo com uma janela de histórico de landmarks (como o array
de "histórico" descrito no projeto de referência), em vez de um único
frame.

---

## ✏️ COMO PERSONALIZAR

- **Adicionar/trocar palavras:** edite `WORDS` em `js/data.js` — use só
  letras de `LETTER_POOL`.
- **Adicionar uma letra nova ao classificador:** edite `RULES` em
  `js/libras.js`, seguindo o padrão das regras existentes (combinação de
  extensão de dedos + posição do polegar + distância entre pontas), e
  adicione a dica/diagrama em `LETTERS` no `js/data.js`.
- **Ajustar sensibilidade do reconhecimento:** os limiares (`FINGER_EXT_ON`,
  `PINCH_ON`, `HOLD_MS` etc.) estão no objeto `CONFIG`, no topo de
  `js/libras.js`. Use a tecla `d` para abrir o painel de diagnóstico e ver
  os valores brutos em tempo real — ótimo para recalibrar na sua
  iluminação/câmera.
- **Trocar o visual:** cores e tipografia estão centralizadas em variáveis
  CSS no topo de `css/style.css` (`:root`).
- **Mudar tempo por rodada ou fórmula de pontuação:** `ROUND_MS` e a lógica
  de `_onCorrectLetter()` em `js/game.js`.

---

## ⚠️ SOLUÇÃO DE PROBLEMAS

### A tela de carregamento trava
Verifique sua conexão com a internet — o navegador precisa baixar o modelo
`.task` e o runtime WASM do MediaPipe na primeira execução.

### Permissão de câmera negada / "FALHA AO INICIAR CÂMERA"
Confirme que está acessando via `http://localhost` ou `https://`, permita a
câmera no ícone de cadeado da barra de endereço e recarregue.

### As letras não são reconhecidas direito
- Garanta boa iluminação e a mão inteira visível no quadro, de frente para
  a câmera.
- Abra o painel de diagnóstico (tecla `d`) e compare os valores mostrados
  com os limiares em `CONFIG` no `js/libras.js` — ajuste conforme
  necessário.
- Lembre-se: este é um classificador **geométrico**, não um modelo
  treinado — ele é mais sensível a ângulo de mão e distância da câmera do
  que uma rede neural treinada com muitos exemplos. Aproxime a mão da
  câmera e mantenha os dedos bem definidos (evite ângulos de perfil).

---

## 📚 IMPORTANTE — SOBRE APRENDER LIBRAS COM ESTE APP

Os diagramas de mão mostrados no jogo (e no guia do alfabeto) são
**esquemas simplificados** gerados a partir da própria lógica do
classificador (dedo estendido vs. fechado) — eles servem para o jogo, não
são referência oficial de como formar cada sinal. Para aprender Libras de
verdade, com a forma, movimento e uso correto de cada sinal, consulte
materiais oficiais como o **VLibras** (vlibras.gov.br) ou o **INES —
Instituto Nacional de Educação de Surdos** (ines.gov.br), ou aulas com
instrutores surdos/fluentes em Libras.

---

## 💻 STACK TECNOLÓGICO

- **JavaScript (vanilla, módulos ES)** — sem frameworks, sem bundler
- **MediaPipe Tasks Vision (`HandLandmarker`)** — carregado via CDN, inferência local na GPU
- **HTML5 Canvas & `getUserMedia`** — captura de vídeo e desenho do esqueleto da mão em tempo real
- **CSS3 (custom properties)** — tema HUD responsivo, sem biblioteca de UI
- **`localStorage`** — persistência simples do recorde de pontuação

Todo o processamento de visão computacional roda no navegador — nenhuma
imagem da câmera é enviada para qualquer servidor.

---

## LICENÇA

MIT — livre para usar, modificar e compartilhar.
