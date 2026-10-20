/* ==========================================================================
   data.js
   O "dataset" pedagógico do jogo: dica de como formar cada letra e o banco
   de palavras usado nos modos Soletrar e Forca. Edite livremente para
   adicionar palavras novas — use só letras presentes em LETTERS (o motor
   geométrico só reconhece esse subconjunto, ver libras.js).

   NOTA sobre `shape` (usado só no diagrama esquemático de referência):
   é uma aproximação visual simplificada (dedo "levantado" vs "recolhido"),
   não uma foto fiel do sinal oficial da Libras — ver aviso no próprio
   painel de guia (index.html). Várias letras de "punho fechado" (C, E, M,
   N, S, T, X) acabam com o mesmo esquema, já que a diferença real entre
   elas está na posição fina do polegar, algo que um ícone de 5 barras não
   consegue representar — isso é intencional, não um bug.
   ========================================================================== */

import { SUPPORTED_LETTERS } from "./libras.js";

// dica de como formar o sinal + padrão esquemático dos dedos para o
// diagrama de referência: 1 = estendido, 0 = fechado (ordem: pol,ind,méd,anel,mind)
// difficulty: 1 = mais fácil/confiável (formas bem distintas), 2 = estático
// mas com alguma ambiguidade, 3 = depende de orientação fina da mão ou de
// movimento (J, Z) — usado para filtrar o Modo Treino por nível.
export const LETTERS = {
  A: { tip: 'Feche a mão (punho) e apoie o polegar ao lado, sem cruzar sobre os dedos.', shape: [1, 0, 0, 0, 0], difficulty: 1 },
  B: { tip: 'Palma aberta, os quatro dedos juntos e esticados, polegar dobrado sobre a palma.', shape: [0, 1, 1, 1, 1], difficulty: 1 },
  C: { tip: 'Curve todos os dedos formando um "C", como segurando um copo; o polegar não toca as pontas.', shape: [0, 0, 0, 0, 0], difficulty: 2 },
  D: { tip: 'Só o indicador esticado para cima; polegar toca a ponta do dedo médio dobrado.', shape: [1, 1, 0, 0, 0], difficulty: 2 },
  E: { tip: 'Feche a mão dobrando as pontas dos quatro dedos sobre o polegar recolhido.', shape: [0, 0, 0, 0, 0], difficulty: 2 },
  F: { tip: 'Polegar e indicador se tocam formando um círculo; médio, anelar e mindinho esticados.', shape: [1, 0, 1, 1, 1], difficulty: 2 },
  G: { tip: 'Indicador e polegar esticados, quase paralelos, apontando de lado.', shape: [1, 1, 0, 0, 0], difficulty: 3 },
  H: { tip: 'Indicador e médio esticados e juntos, na horizontal (mão deitada).', shape: [0, 1, 1, 0, 0], difficulty: 2 },
  I: { tip: 'Só o dedo mindinho esticado para cima, os outros fechados.', shape: [0, 0, 0, 0, 1], difficulty: 1 },
  J: { tip: 'Como o "I" (só o mindinho esticado), mas desenhando um gancho no ar.', shape: [0, 0, 0, 0, 1], difficulty: 3 },
  K: { tip: 'Indicador e médio em "V", com o polegar tocando a base entre eles, mão apontando para cima.', shape: [1, 1, 1, 0, 0], difficulty: 3 },
  L: { tip: 'Indicador para cima e polegar bem aberto para o lado, formando um "L".', shape: [1, 1, 0, 0, 0], difficulty: 1 },
  M: { tip: 'Punho fechado com o polegar bem escondido sob os três primeiros dedos.', shape: [0, 0, 0, 0, 0], difficulty: 3 },
  N: { tip: 'Punho fechado com o polegar escondido só sob os dois primeiros dedos.', shape: [0, 0, 0, 0, 0], difficulty: 3 },
  O: { tip: 'Todos os dedos curvados tocando a ponta do polegar, formando um "O".', shape: [1, 0, 0, 0, 0], difficulty: 2 },
  P: { tip: 'Como o "K", mas com a mão apontando para baixo.', shape: [1, 1, 1, 0, 0], difficulty: 3 },
  Q: { tip: 'Como o "G", mas com a mão apontando para baixo.', shape: [1, 1, 0, 0, 0], difficulty: 3 },
  R: { tip: 'Indicador e médio esticados e cruzados.', shape: [0, 1, 1, 0, 0], difficulty: 3 },
  S: { tip: 'Punho fechado com o polegar cruzado na frente dos dedos.', shape: [0, 0, 0, 0, 0], difficulty: 2 },
  T: { tip: 'Punho fechado com o polegar saindo entre o indicador e o médio.', shape: [0, 0, 0, 0, 0], difficulty: 3 },
  U: { tip: 'Indicador e médio esticados e juntos, apontando para cima.', shape: [0, 1, 1, 0, 0], difficulty: 2 },
  V: { tip: 'Indicador e médio esticados em "V", bem separados um do outro.', shape: [0, 1, 1, 0, 0], difficulty: 1 },
  W: { tip: 'Indicador, médio e anelar esticados e separados; polegar e mindinho fechados.', shape: [0, 1, 1, 1, 0], difficulty: 3 },
  X: { tip: 'Indicador dobrado em formato de gancho; os demais dedos, fechados.', shape: [0, 0, 0, 0, 0], difficulty: 2 },
  Y: { tip: 'Polegar e mindinho esticados para os lados ("hang loose"), os outros fechados.', shape: [1, 0, 0, 0, 1], difficulty: 2 },
  Z: { tip: 'Como o "D" (indicador esticado), desenhando a letra "Z" no ar.', shape: [1, 1, 0, 0, 0], difficulty: 3 },
};

// garante que só existam entradas para letras que o classificador suporta
Object.keys(LETTERS).forEach((k) => {
  if (!SUPPORTED_LETTERS.includes(k)) delete LETTERS[k];
});

export const LETTER_POOL = Object.keys(LETTERS);

// bancos de palavras — usados tanto pelo Modo Soletrar (game.js) quanto
// pelo Modo Forca (forca.js). Nível 1 usa só letras "sólidas" (mais
// confiáveis), nível 2 mistura as novas letras estáticas, nível 3 inclui
// as mais desafiadoras (orientação fina da mão e/ou movimento: G, K, P, Q,
// R, X, J, Z). Níveis 4 e 5 não usam letras novas (o alfabeto já está todo
// liberado desde o nível 3) — eles sobem a dificuldade combinando essas
// letras difíceis em palavras mais longas, e reduzindo o tempo por rodada
// no Modo Soletrar (ver ROUND_MS_BASE em game.js) — no Modo Forca, o
// desafio nesses níveis vem só de palavras mais longas/menos comuns, já
// que não há cronômetro.
export const WORDS = {
  1: ['BOLA', 'BOI', 'UVA', 'AVO', 'IDA', 'LUA', 'VIU', 'AVE', 'VELA', 'BULE', 'ALI', 'VIA', 'BOA'],
  2: [
    'VALA', 'LUVA', 'FADA', 'FALA', 'VIDA', 'BOLO', 'DADO', 'CASA', 'TESE', 'NOVE', 'MESA', 'SETE',
    'SEDA', 'SOFA', 'FEIXE', 'DEDO', 'FIVELA', 'ESCOLA', 'CIDADE', 'HOTEL', 'ESTUDO'
  ],
  3: [
    'ALVO', 'VIOLA', 'FUBA', 'LOBO', 'BAOBA', 'GATO', 'QUEIJO', 'PRAIA', 'ROXO', 'JOGO', 'ZEBRA', 'TAXI',
    'MANGA', 'JANTAR', 'ZANGADO', 'QUENTE', 'PARQUE', 'MERGULHO', 'KIWI', 'GANSO', 'TREM', 'ARROZ', 'RESTO'
  ],
  4: [
    'GAROTO', 'PIRATA', 'FOGUETE', 'MOCHILA', 'GUITARRA', 'RELOGIO', 'PASSARO', 'JANELA', 'TARTARUGA', 'CANGURU',
    'MARGARIDA', 'TANGERINA', 'ESCORPIAO', 'MARIPOSA', 'PANTERA', 'MOSQUITO', 'ZANGAO'
  ],
  5: [
    'ELEFANTE', 'GIRASSOL', 'ABACAXI', 'BORBOLETA', 'CROCODILO', 'XICARA', 'AQUARIO', 'ORQUIDEA', 'ZOOLOGICO', 'AEROPORTO',
    'HIPOPOTAMO', 'MARACUJA', 'CACHORRO', 'GENGIBRE', 'ARQUITETO', 'MEXERICA'
  ]
};

export function wordBank(level = 1) {
  return WORDS[level] || WORDS[1];
}

/* ==========================================================================
   DICAS DO MODO FORCA
   Um mapa separado (palavra → dica), em vez de transformar WORDS em objetos
   `{word, hint}` — assim o Modo Soletrar (que já usa WORDS como uma lista
   simples de strings) continua funcionando sem qualquer alteração, e a
   Forca só consulta esse mapa à parte.

   COMO ADICIONAR: toda palavra nova em WORDS deveria ganhar uma entrada
   aqui também (mesma grafia, sem acento, igual está em WORDS). Se uma
   palavra não tiver dica cadastrada, `hintFor()` devolve um aviso genérico
   em vez de quebrar o jogo — então esquecer de adicionar a dica não é um
   erro fatal, só deixa a rodada menos ajudada.
   ========================================================================== */
export const WORD_HINTS = {
  // nível 1
  BOLA: 'Objeto redondo usado em jogos como futebol e vôlei.',
  BOI: 'Animal bovino grande, criado no campo, usado para carne e leite.',
  UVA: 'Fruta pequena e redonda, usada para fazer vinho e suco.',
  AVO: 'Mãe do seu pai ou da sua mãe.',
  IDA: 'Viagem só de "ida", sem volta — o oposto de "volta".',
  LUA: 'Satélite natural da Terra, visível à noite.',
  VIU: 'Passado do verbo "ver" (ex.: ele ___ o filme).',
  AVE: 'Animal com penas e bico; a maioria consegue voar.',
  VELA: 'Objeto de cera com um pavio, usado para dar luz ou em bolo de aniversário.',
  BULE: 'Recipiente usado para servir chá ou café.',
  ALI: 'Advérbio de lugar; indica um ponto não muito distante — o oposto de "aqui".',
  VIA: 'Sinônimo de estrada, caminho ou rota.',
  BOA: 'Feminino de "bom"; também é o nome de uma cobra grande, não peçonhenta.',

  // nível 2
  VALA: 'Buraco comprido e estreito cavado no chão, usado para escoar água.',
  LUVA: 'Peça de vestuário que cobre a mão, dedo por dedo.',
  FADA: 'Personagem mágico de contos, geralmente com asas e varinha.',
  FALA: 'Ato de se comunicar pela voz; discurso.',
  VIDA: 'O oposto de morte; tudo que está vivo tem isso.',
  BOLO: 'Doce assado no forno, comum em festas de aniversário.',
  DADO: 'Cubo com números de 1 a 6, usado em jogos de tabuleiro.',
  CASA: 'Lugar onde uma pessoa mora.',
  TESE: 'Trabalho acadêmico defendido para se obter um título, como o de doutor.',
  NOVE: 'Número entre o oito e o dez.',
  MESA: 'Móvel com tampo plano e pernas, usado para comer ou trabalhar.',
  SETE: 'Número entre o seis e o oito; também os dias de uma semana.',
  SEDA: 'Tecido fino e macio, produzido por um tipo de lagarta (bicho-da-seda).',
  SOFA: 'Móvel estofado da sala, onde várias pessoas podem sentar.',
  FEIXE: 'Conjunto de coisas (como raios de luz ou lenha) amarradas ou agrupadas.',
  DEDO: 'Parte do corpo na ponta da mão ou do pé; você tem cinco em cada mão.',
  FIVELA: 'Peça que prende um cinto ou uma correia.',
  ESCOLA: 'Lugar onde se estuda e aprende, com professores e alunos.',
  CIDADE: 'Área urbana grande, com ruas, prédios e muitos moradores.',
  HOTEL: 'Lugar onde se paga para dormir durante uma viagem.',
  ESTUDO: 'Ato de aprender algo, geralmente lendo ou praticando.',

  // nível 3
  ALVO: 'Aquilo que se mira para acertar, como num jogo de dardos.',
  VIOLA: 'Instrumento de cordas parecido com o violão, comum na música caipira.',
  FUBA: 'Farinha de milho, usada para fazer polenta e broa.',
  LOBO: 'Animal selvagem parecido com um cachorro grande; vive em matilha.',
  BAOBA: 'Árvore africana enorme, com o tronco muito largo (também escrita "baobá").',
  GATO: 'Animal doméstico felino; mia e gosta de caçar ratos.',
  QUEIJO: 'Alimento feito a partir do leite, muito usado em sanduíches e pizzas.',
  PRAIA: 'Faixa de areia à beira-mar, ótima para nadar e tomar sol.',
  ROXO: 'Cor que mistura azul com vermelho.',
  JOGO: 'Atividade com regras, feita para diversão ou competição.',
  ZEBRA: 'Animal parecido com o cavalo, com listras pretas e brancas.',
  TAXI: 'Carro que você paga para te levar a algum lugar.',
  MANGA: 'Fruta tropical doce, amarela por dentro; também é parte de uma camisa.',
  JANTAR: 'Refeição feita à noite.',
  ZANGADO: 'Sentimento de raiva ou irritação.',
  QUENTE: 'O oposto de frio.',
  PARQUE: 'Área com árvores e brinquedos, ótima para passear ou fazer piquenique.',
  MERGULHO: 'Ato de entrar debaixo d\u2019água, geralmente de cabeça.',
  KIWI: 'Fruta pequena, verde por dentro e com casca peluda.',
  GANSO: 'Ave grande de fazenda, parecida com o pato, faz muito barulho.',
  TREM: 'Veículo que anda sobre trilhos, usado para transportar pessoas ou cargas.',
  ARROZ: 'Grão branco, alimento básico servido quase todo dia no Brasil.',
  RESTO: 'Aquilo que sobra depois de usar ou comer uma parte.',

  // nível 4
  GAROTO: 'Sinônimo de menino.',
  PIRATA: 'Pessoa que navega nos mares roubando outros navios; geralmente usa tapa-olho.',
  FOGUETE: 'Veículo que voa usando propulsão, usado para ir ao espaço.',
  MOCHILA: 'Bolsa que se carrega nas costas, comum para levar material escolar.',
  GUITARRA: 'Instrumento musical de cordas, elétrico, muito usado no rock.',
  RELOGIO: 'Objeto usado para saber as horas.',
  PASSARO: 'Animal com penas e bico que geralmente sabe voar e cantar.',
  JANELA: 'Abertura na parede, com vidro, por onde entra luz e se pode ver para fora.',
  TARTARUGA: 'Animal de casco duro, bem lento, pode viver na terra ou na água.',
  CANGURU: 'Animal australiano que pula com as patas traseiras e carrega o filhote numa bolsa.',
  MARGARIDA: 'Flor branca com o miolo amarelo, muito comum em jardins.',
  TANGERINA: 'Fruta cítrica parecida com a laranja, mas menor e mais fácil de descascar.',
  ESCORPIAO: 'Aracnídeo com uma cauda curva e ferrão venenoso.',
  MARIPOSA: 'Inseto parecido com a borboleta, mas costuma voar à noite e é atraído pela luz.',
  PANTERA: 'Felino grande e selvagem, de pelagem geralmente preta.',
  MOSQUITO: 'Inseto pequeno que voa, zumbe e pode picar transmitindo doenças.',
  ZANGAO: 'Abelha macho, cuja função na colmeia é fecundar a rainha.',

  // nível 5
  ELEFANTE: 'O maior animal terrestre, com tromba comprida e presas de marfim.',
  GIRASSOL: 'Flor grande e amarela que acompanha a posição do sol.',
  ABACAXI: 'Fruta tropical com casca espinhosa e coroa de folhas no topo.',
  BORBOLETA: 'Inseto colorido que sai de um casulo; foi lagarta antes.',
  CROCODILO: 'Réptil grande de rio, com mandíbula forte e muitos dentes.',
  XICARA: 'Recipiente pequeno com alça, usado para tomar café ou chá.',
  AQUARIO: 'Recipiente de vidro com água, usado para criar peixes em casa.',
  ORQUIDEA: 'Flor exótica e delicada, muito apreciada por colecionadores.',
  ZOOLOGICO: 'Lugar onde se pode ver animais de várias espécies em cativeiro.',
  AEROPORTO: 'Lugar de onde os aviões decolam e pousam.',
  HIPOPOTAMO: 'Animal enorme de rio, na África, com a boca bem grande.',
  MARACUJA: 'Fruta ácida usada para fazer sucos; famosa por acalmar os nervos.',
  CACHORRO: 'Animal doméstico muito fiel, também chamado de "melhor amigo do homem".',
  GENGIBRE: 'Raiz picante usada em chás e temperos; ajuda contra o enjoo.',
  ARQUITETO: 'Profissional que projeta prédios e casas.',
  MEXERICA: 'Outro nome para a tangerina, fruta cítrica pequena e doce.'
};

export function hintFor(word) {
  return WORD_HINTS[word] || 'Sem dica cadastrada para esta palavra ainda.';
}