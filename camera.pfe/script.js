
const camera = document.getElementById("camera");
const moldura = document.getElementById("moldura");

const ligarCamera = document.getElementById("ligar-camera");
const tirarFoto = document.getElementById("tirar-foto");
const desligarCamera = document.getElementById("desligar-camera");
const trocarPokemon = document.getElementById("trocar-pokemon");

const mensagem = document.getElementById("mensagem");
const mensagemCamera = document.getElementById("mensagem-camera");
const statusCamera = document.getElementById("status-camera");
const efeitoCaptura = document.getElementById("efeito-captura");
const indicador = document.getElementById("indicador");

const resultado = document.getElementById("resultado");
const fotoFinal = document.getElementById("foto-final");
const baixarFoto = document.getElementById("baixar-foto");
const novaFoto = document.getElementById("nova-foto");
const verGaleria = document.getElementById("ver-galeria");

const galeria = document.getElementById("galeria");
const totalFotos = document.getElementById("total-fotos");
const galeriaFotos = document.getElementById("galeria-fotos");
const galeriaVazia = document.getElementById("galeria-vazia");

const visualizador = document.getElementById("visualizador");
const fotoAmpliada = document.getElementById("foto-ampliada");
const dataAmpliada = document.getElementById("data-ampliada");
const fecharVisualizador = document.getElementById("fechar-visualizador");
const baixarAmpliada = document.getElementById("baixar-ampliada");
const excluirAmpliada = document.getElementById("excluir-ampliada");

const imagensPokemon = [
  document.getElementById("poke1"),
  document.getElementById("poke2"),
  document.getElementById("poke3"),
  document.getElementById("poke4"),
  document.getElementById("poke5")
];

let fluxoCamera = null;
let filtroAtual = "original";
let pokemonAtual = [];
let trocandoPokemons = false;
let fotoAtual = null;
let idFotoSelecionada = null;

const CHAVE_GALERIA = "pokecam_galeria_v1";
const QUANTIDADE_POKEMON = 5;
const MAXIMO_FOTOS = 8;

const filtros = {
  original: "none",
  retro: "sepia(0.65) contrast(1.1) saturate(0.85)",
  pb: "grayscale(1)",
  vibrante: "saturate(1.65) contrast(1.08)",
  frio: "hue-rotate(15deg) saturate(1.1)",
  quente: "sepia(0.2) saturate(1.25)"
};

// --------------------------------------------------
// MENSAGENS
// --------------------------------------------------

function mostrarMensagem(texto) {
  mensagem.textContent = texto;
}

function atualizarStatusCamera(ligada) {
  if (ligada) {
    statusCamera.classList.add("ligada");
    statusCamera.innerHTML =
      '<span class="status-ponto"></span> Câmera ligada';

    indicador.classList.add("ativo");
  } else {
    statusCamera.classList.remove("ligada");
    statusCamera.innerHTML =
      '<span class="status-ponto"></span> Câmera desligada';

    indicador.classList.remove("ativo");
  }
}

// --------------------------------------------------
// CÂMERA
// --------------------------------------------------

async function ligarCameraFuncao() {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    mostrarMensagem(
      "Seu navegador não liberou a câmera. Abra o projeto em localhost ou HTTPS."
    );
    return;
  }

  if (fluxoCamera) {
    return;
  }

  ligarCamera.disabled = true;
  mostrarMensagem("Solicitando acesso à câmera...");

  try {
    fluxoCamera = await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: {
        facingMode: "user",
        width: { ideal: 1280 },
        height: { ideal: 960 }
      }
    });

    camera.srcObject = fluxoCamera;
    camera.style.display = "block";

    await new Promise((resolve, reject) => {
      if (camera.readyState >= 2 && camera.videoWidth > 0) {
        resolve();
        return;
      }

      const aoCarregar = () => {
        limparEventos();
        resolve();
      };

      const aoFalhar = () => {
        limparEventos();
        reject(new Error("Não foi possível iniciar o vídeo."));
      };

      function limparEventos() {
        camera.removeEventListener("loadedmetadata", aoCarregar);
        camera.removeEventListener("error", aoFalhar);
      }

      camera.addEventListener("loadedmetadata", aoCarregar, { once: true });
      camera.addEventListener("error", aoFalhar, { once: true });
    });

    await camera.play();

    mensagemCamera.style.display = "none";
    ligarCamera.disabled = true;
    tirarFoto.disabled = false;
    desligarCamera.disabled = false;

    atualizarStatusCamera(true);
    mostrarMensagem("Câmera pronta! Faça sua pose de treinador Pokémon.");
  } catch (erro) {
    if (fluxoCamera) {
      fluxoCamera.getTracks().forEach((track) => track.stop());
      fluxoCamera = null;
    }

    camera.srcObject = null;
    camera.style.display = "none";

    ligarCamera.disabled = false;
    tirarFoto.disabled = true;
    desligarCamera.disabled = true;

    atualizarStatusCamera(false);

    if (erro.name === "NotAllowedError" || erro.name === "PermissionDeniedError") {
      mostrarMensagem(
        "Acesso negado. Permita o uso da câmera nas configurações do navegador."
      );
    } else if (erro.name === "NotFoundError") {
      mostrarMensagem("Nenhuma câmera foi encontrada neste dispositivo.");
    } else {
      mostrarMensagem(
        "Não foi possível ligar a câmera. Confira a conexão e as permissões."
      );
    }

    console.error("Erro ao ligar a câmera:", erro);
  }
}

function desligarCameraFuncao() {
  if (fluxoCamera) {
    fluxoCamera.getTracks().forEach((track) => track.stop());
    fluxoCamera = null;
  }

  camera.pause();
  camera.srcObject = null;
  camera.style.display = "none";

  mensagemCamera.style.display = "flex";

  ligarCamera.disabled = false;
  tirarFoto.disabled = true;
  desligarCamera.disabled = true;

  atualizarStatusCamera(false);
  mostrarMensagem("Câmera desligada. Ative-a novamente quando quiser.");
}

// --------------------------------------------------
// POKÉAPI
// Os Pokémon só mudam quando o botão é clicado.
// --------------------------------------------------

function numeroPokemonAleatorio() {
  return Math.floor(Math.random() * 1025) + 1;
}

async function buscarPokemon(id) {
  const resposta = await fetch(
    `https://pokeapi.co/api/v2/pokemon/${id}`
  );

  if (!resposta.ok) {
    throw new Error("Não foi possível buscar o Pokémon.");
  }

  const dados = await resposta.json();

  const imagem =
    dados.sprites.other?.["official-artwork"]?.front_default ||
    dados.sprites.front_default;

  if (!imagem) {
    throw new Error("Este Pokémon não possui imagem disponível.");
  }

  return {
    id: dados.id,
    nome: dados.name,
    imagem
  };
}

function carregarImagem(url) {
  return new Promise((resolve, reject) => {
    const imagem = new Image();

    imagem.crossOrigin = "anonymous";

    imagem.onload = () => resolve(imagem);
    imagem.onerror = () => reject(new Error("Falha ao carregar a imagem."));

    imagem.src = url;
  });
}

async function trocarPokemonsFuncao() {
  if (trocandoPokemons) {
    return;
  }

  trocandoPokemons = true;
  trocarPokemon.disabled = true;

  mostrarMensagem("A Poké Bola está abrindo...");

  try {
    const ids = new Set();

    while (ids.size < QUANTIDADE_POKEMON) {
      ids.add(numeroPokemonAleatorio());
    }

    const novosPokemons = await Promise.all(
      Array.from(ids).map((id) => buscarPokemon(id))
    );

    // Pré-carrega todas as imagens antes de trocar os Pokémon da tela.
    await Promise.all(
      novosPokemons.map((pokemon) => carregarImagem(pokemon.imagem))
    );

    pokemonAtual = novosPokemons;

    imagensPokemon.forEach((imagem) => {
      imagem.classList.remove("visivel");
      imagem.removeAttribute("src");
      imagem.alt = "Pokémon parceiro";
    });

    efeitoCaptura.classList.remove("executando");

    // Reinicia a animação sem criar nenhum temporizador automático.
    void efeitoCaptura.offsetWidth;
    efeitoCaptura.classList.add("executando");

    await new Promise((resolve) => setTimeout(resolve, 1150));

    novosPokemons.forEach((pokemon, indice) => {
      imagensPokemon[indice].src = pokemon.imagem;
      imagensPokemon[indice].alt = pokemon.nome;
      imagensPokemon[indice].classList.add("visivel");
    });

    mostrarMensagem("Novos parceiros chegaram! Prepare sua foto.");
  } catch (erro) {
    console.error("Erro ao carregar os Pokémon:", erro);
    mostrarMensagem(
      "Não foi possível carregar os Pokémon. Confira sua conexão com a internet e tente novamente."
    );
  } finally {
    setTimeout(() => {
      efeitoCaptura.classList.remove("executando");
    }, 700);

    trocandoPokemons = false;
    trocarPokemon.disabled = false;
  }
}

// --------------------------------------------------
// FILTROS
// --------------------------------------------------

document.querySelectorAll("[data-filtro]").forEach((botao) => {
  botao.addEventListener("click", () => {
    filtroAtual = botao.dataset.filtro;

    document.querySelectorAll("[data-filtro]").forEach((outro) => {
      outro.classList.remove("ativo");
    });

    botao.classList.add("ativo");

    camera.style.filter = filtros[filtroAtual] || "none";

    mostrarMensagem(
      `Filtro "${botao.textContent}" selecionado. Ele também será aplicado à foto.`
    );
  });
});

// --------------------------------------------------
// CAPTURA DA IMAGEM
// --------------------------------------------------

function desenharVideoCoberto(contexto, video, largura, altura) {
  // IMPORTANTE:
  // Vídeos usam videoWidth e videoHeight, não width e height.
  const larguraOrigem = video.videoWidth;
  const alturaOrigem = video.videoHeight;

  if (!larguraOrigem || !alturaOrigem) {
    throw new Error("A câmera ainda não está pronta para tirar a foto.");
  }

  const proporcaoOrigem = larguraOrigem / alturaOrigem;
  const proporcaoDestino = largura / altura;

  let sx = 0;
  let sy = 0;
  let sw = larguraOrigem;
  let sh = alturaOrigem;

  // Recorta a imagem para preencher a moldura sem distorcer.
  if (proporcaoOrigem > proporcaoDestino) {
    sw = alturaOrigem * proporcaoDestino;
    sx = (larguraOrigem - sw) / 2;
  } else {
    sh = larguraOrigem / proporcaoDestino;
    sy = (alturaOrigem - sh) / 2;
  }

  contexto.save();

  // Espelha a foto para combinar com a prévia da câmera.
  contexto.translate(largura, 0);
  contexto.scale(-1, 1);

  contexto.drawImage(
    video,
    sx,
    sy,
    sw,
    sh,
    0,
    0,
    largura,
    altura
  );

  contexto.restore();
}

function desenharImagemAjustada(contexto, imagem, x, y, largura, altura) {
  const proporcao = Math.min(
    largura / imagem.width,
    altura / imagem.height
  );

  const w = imagem.width * proporcao;
  const h = imagem.height * proporcao;

  contexto.drawImage(
    imagem,
    x + (largura - w) / 2,
    y + (altura - h) / 2,
    w,
    h
  );
}

function arredondarRetangulo(contexto, x, y, largura, altura, raio) {
  contexto.beginPath();
  contexto.moveTo(x + raio, y);
  contexto.lineTo(x + largura - raio, y);
  contexto.quadraticCurveTo(x + largura, y, x + largura, y + raio);
  contexto.lineTo(x + largura, y + altura - raio);
  contexto.quadraticCurveTo(
    x + largura,
    y + altura,
    x + largura - raio,
    y + altura
  );
  contexto.lineTo(x + raio, y + altura);
  contexto.quadraticCurveTo(x, y + altura, x, y + altura - raio);
  contexto.lineTo(x, y + raio);
  contexto.quadraticCurveTo(x, y, x + raio, y);
  contexto.closePath();
}

async function desenharPokemonNaFoto(contexto, largura, altura) {
  if (pokemonAtual.length !== QUANTIDADE_POKEMON) {
    return;
  }

  const imagensCarregadas = await Promise.all(
    pokemonAtual.map((pokemon) => carregarImagem(pokemon.imagem))
  );

  const tamanho = largura * 0.145;
  const margem = largura * 0.025;
  const tamanhoSuperior = tamanho * 0.78;

  // Dois Pokémon no canto superior esquerdo.
  desenharImagemAjustada(
    contexto,
    imagensCarregadas[3],
    margem,
    margem + 15,
    tamanhoSuperior,
    tamanhoSuperior
  );

  desenharImagemAjustada(
    contexto,
    imagensCarregadas[4],
    margem + tamanhoSuperior * 0.75,
    margem + 15,
    tamanhoSuperior,
    tamanhoSuperior
  );

  // Três Pokémon no canto inferior direito.
  const baseY = altura - tamanho - margem;

  desenharImagemAjustada(
    contexto,
    imagensCarregadas[0],
    largura - tamanho * 2.75 - margem,
    baseY,
    tamanho,
    tamanho
  );

  desenharImagemAjustada(
    contexto,
    imagensCarregadas[1],
    largura - tamanho * 1.85 - margem,
    baseY - tamanho * 0.16,
    tamanho,
    tamanho
  );

  desenharImagemAjustada(
    contexto,
    imagensCarregadas[2],
    largura - tamanho - margem,
    baseY,
    tamanho,
    tamanho
  );
}

function desenharMolduraNaFoto(contexto, largura, altura) {
  const escala = largura / 900;

  // Moldura externa azul.
  contexto.save();

  contexto.lineWidth = 10 * escala;
  contexto.strokeStyle = "#173c70";

  arredondarRetangulo(
    contexto,
    5 * escala,
    5 * escala,
    largura - 10 * escala,
    altura - 10 * escala,
    18 * escala
  );

  contexto.stroke();

  // Linha dourada interna.
  contexto.lineWidth = 4 * escala;
  contexto.strokeStyle = "#ffcb05";

  arredondarRetangulo(
    contexto,
    16 * escala,
    16 * escala,
    largura - 32 * escala,
    altura - 32 * escala,
    12 * escala
  );

  contexto.stroke();

  // Selo PokéCam.
  const caixaLargura = 112 * escala;
  const caixaAltura = 31 * escala;
  const caixaX = largura - caixaLargura - 26 * escala;
  const caixaY = 26 * escala;

  contexto.fillStyle = "#e63946";
  contexto.fillRect(caixaX, caixaY, caixaLargura, caixaAltura);

  contexto.lineWidth = 2 * escala;
  contexto.strokeStyle = "#ffffff";
  contexto.strokeRect(caixaX, caixaY, caixaLargura, caixaAltura);

  contexto.fillStyle = "#ffffff";
  contexto.textAlign = "center";
  contexto.textBaseline = "middle";
  contexto.font = `900 ${12 * escala}px sans-serif`;
  contexto.fillText(
    "POKÉCAM",
    caixaX + caixaLargura / 2,
    caixaY + caixaAltura / 2
  );

  contexto.restore();
}

async function criarFoto() {
  if (!fluxoCamera || camera.readyState < 2 || !camera.videoWidth) {
    throw new Error("Ligue a câmera e espere a imagem aparecer antes de fotografar.");
  }

  const largura = 1200;
  const altura = Math.round(
    largura * (camera.videoHeight / camera.videoWidth)
  );

  const canvas = document.createElement("canvas");
  canvas.width = largura;
  canvas.height = altura;

  const contexto = canvas.getContext("2d");

  if (!contexto) {
    throw new Error("Não foi possível preparar a imagem.");
  }

  // Aplica o filtro também à imagem final.
  contexto.filter = filtros[filtroAtual] || "none";

  desenharVideoCoberto(contexto, camera, largura, altura);

  contexto.filter = "none";

  await desenharPokemonNaFoto(contexto, largura, altura);
  desenharMolduraNaFoto(contexto, largura, altura);

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("Não foi possível gerar o arquivo da foto."));
          return;
        }

        resolve(blob);
      },
      "image/jpeg",
      0.92
    );
  });
}

// --------------------------------------------------
// TIRAR FOTO
// --------------------------------------------------

async function tirarFotoFuncao() {
  if (tirarFoto.disabled) {
    return;
  }

  tirarFoto.disabled = true;
  trocarPokemon.disabled = true;

  mostrarMensagem("Registrando sua aventura...");

  try {
    const blob = await criarFoto();

    if (fotoAtual) {
      URL.revokeObjectURL(fotoAtual);
    }

    fotoAtual = URL.createObjectURL(blob);
    fotoFinal.src = fotoAtual;

    resultado.hidden = false;

    // Tenta salvar a foto na galeria.
    await salvarFotoNaGaleria(blob);

    mostrarMensagem("Foto capturada com sucesso! Sua aventura foi registrada.");

    resultado.scrollIntoView({
      behavior: "smooth",
      block: "start"
    });
  } catch (erro) {
    console.error("Erro ao tirar foto:", erro);
    mostrarMensagem(erro.message || "Erro ao tirar foto. Tente novamente.");
  } finally {
    tirarFoto.disabled = !fluxoCamera;
    trocarPokemon.disabled = trocandoPokemons;
  }
}

// --------------------------------------------------
// DOWNLOAD
// --------------------------------------------------

function baixarArquivo(url, nomeArquivo) {
  const link = document.createElement("a");
  link.href = url;
  link.download = nomeArquivo;

  document.body.appendChild(link);
  link.click();
  link.remove();
}

baixarFoto.addEventListener("click", () => {
  if (!fotoAtual) {
    mostrarMensagem("Tire uma foto antes de baixar.");
    return;
  }

  baixarArquivo(fotoAtual, "minha-foto-pokecam.jpg");
});

// --------------------------------------------------
// GALERIA LOCAL
// --------------------------------------------------

function lerGaleria() {
  try {
    const dados = localStorage.getItem(CHAVE_GALERIA);
    const fotos = dados ? JSON.parse(dados) : [];

    return Array.isArray(fotos) ? fotos : [];
  } catch (erro) {
    console.error("Não foi possível ler a galeria:", erro);
    return [];
  }
}

function escreverGaleria(fotos) {
  localStorage.setItem(CHAVE_GALERIA, JSON.stringify(fotos));
}

function blobParaDataURL(blob) {
  return new Promise((resolve, reject) => {
    const leitor = new FileReader();

    leitor.onload = () => resolve(leitor.result);
    leitor.onerror = () => reject(new Error("Falha ao preparar a foto para salvar."));

    leitor.readAsDataURL(blob);
  });
}

async function salvarFotoNaGaleria(blob) {
  try {
    const imagem = await blobParaDataURL(blob);
    const fotos = lerGaleria();

    const novaFoto = {
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      imagem,
      data: new Date().toLocaleString("pt-BR")
    };

    fotos.unshift(novaFoto);

    // Mantém apenas as fotos mais recentes.
    fotos.splice(MAXIMO_FOTOS);

    escreverGaleria(fotos);
    desenharGaleria();
  } catch (erro) {
    console.error("Não foi possível salvar a foto na galeria:", erro);
    mostrarMensagem(
      "A foto foi capturada, mas não foi possível salvá-la na galeria do navegador."
    );
  }
}

function desenharGaleria() {
  const fotos = lerGaleria();

  totalFotos.textContent = fotos.length;
  galeriaFotos.replaceChildren();
  galeriaVazia.style.display = fotos.length ? "none" : "block";

  fotos.forEach((foto) => {
    const cartao = document.createElement("article");
    cartao.className = "cartao-foto";

    const botao = document.createElement("button");
    botao.type = "button";
    botao.className = "abrir-foto";
    botao.setAttribute("aria-label", "Abrir foto salva");

    const imagem = document.createElement("img");
    imagem.src = foto.imagem;
    imagem.alt = "Foto salva na galeria";
    imagem.loading = "lazy";

    const data = document.createElement("p");
    data.textContent = foto.data;

    botao.appendChild(imagem);
    cartao.appendChild(botao);
    cartao.appendChild(data);

    botao.addEventListener("click", () => abrirFotoAmpliada(foto.id));

    galeriaFotos.appendChild(cartao);
  });
}

function abrirFotoAmpliada(id) {
  const foto = lerGaleria().find((item) => item.id === id);

  if (!foto) {
    return;
  }

  idFotoSelecionada = foto.id;
  fotoAmpliada.src = foto.imagem;
  dataAmpliada.textContent = `Registrada em ${foto.data}`;

  visualizador.hidden = false;
}

function fecharFotoAmpliada() {
  visualizador.hidden = true;
  idFotoSelecionada = null;
}

baixarAmpliada.addEventListener("click", () => {
  const foto = lerGaleria().find((item) => item.id === idFotoSelecionada);

  if (foto) {
    baixarArquivo(foto.imagem, "foto-pokecam.jpg");
  }
});

excluirAmpliada.addEventListener("click", () => {
  if (!idFotoSelecionada) {
    return;
  }

  const fotos = lerGaleria().filter(
    (foto) => foto.id !== idFotoSelecionada
  );

  escreverGaleria(fotos);
  fecharFotoAmpliada();
  desenharGaleria();

  mostrarMensagem("Foto removida da galeria.");
});

fecharVisualizador.addEventListener("click", fecharFotoAmpliada);

visualizador.addEventListener("click", (evento) => {
  if (evento.target === visualizador) {
    fecharFotoAmpliada();
  }
});

document.addEventListener("keydown", (evento) => {
  if (evento.key === "Escape") {
    fecharFotoAmpliada();
  }
});

// --------------------------------------------------
// BOTÕES E INICIALIZAÇÃO
// --------------------------------------------------

ligarCamera.addEventListener("click", ligarCameraFuncao);
desligarCamera.addEventListener("click", desligarCameraFuncao);
tirarFoto.addEventListener("click", tirarFotoFuncao);
trocarPokemon.addEventListener("click", trocarPokemonsFuncao);

novaFoto.addEventListener("click", () => {
  resultado.hidden = true;

  if (fluxoCamera) {
    mostrarMensagem("Câmera pronta! Faça outra pose.");
  } else {
    mostrarMensagem("Ligue a câmera para tirar outra foto.");
  }

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });
});

verGaleria.addEventListener("click", () => {
  galeria.scrollIntoView({
    behavior: "smooth",
    block: "start"
  });
});

window.addEventListener("beforeunload", () => {
  if (fluxoCamera) {
    fluxoCamera.getTracks().forEach((track) => track.stop());
  }

  if (fotoAtual) {
    URL.revokeObjectURL(fotoAtual);
  }
});

desenharGaleria();
atualizarStatusCamera(false);
