(async function () {
  await window.AUTH.init();

  // 1. Verificar se está logado. Se não, exibir convite de login.
  if (!window.AUTH.estaIdentificado()) {
    window.UI.iniciarPagina("criar-anuncio.html");
    const container = document.querySelector(".caixa");
    container.innerHTML = '' +
      '<div class="titulo">🔒 Área restrita</div>' +
      '<div class="corpo centro">' +
      '<p style="font-size:15px">Você precisa estar conectado para criar um anúncio.</p>' +
      '<p>' +
      '<a class="botao botao-grande" href="login.html">🔑 Entrar</a> &nbsp; ' +
      '<a class="botao botao-grande" href="cadastro.html">📝 Criar uma conta</a>' +
      '</p>' +
      '</div>';
    return;
  }

  // 2. Iniciar chrome da página
  window.UI.iniciarPagina("criar-anuncio.html");

  // 3. Preencher select de categorias
  const selectCat = document.getElementById("categoria");
  Object.keys(window.CONFIG.CATEGORIAS).forEach(key => {
    const option = document.createElement("option");
    option.value = key;
    option.textContent = window.CONFIG.CATEGORIAS[key];
    selectCat.appendChild(option);
  });

  const form = document.getElementById("form-anuncio");
  const msgBox = document.getElementById("msg-anuncio");
  const btnSalvar = document.getElementById("btn-salvar");

  function mostrarErro(html) {
    msgBox.innerHTML = '<div class="erro">' + html + '</div>';
    msgBox.scrollIntoView({ behavior: "smooth" });
  }

  function mostrarSucesso(html) {
    msgBox.innerHTML = '<div class="sucesso">' + html + '</div>';
    msgBox.scrollIntoView({ behavior: "smooth" });
  }

  form.addEventListener("submit", async function (e) {
    e.preventDefault();
    msgBox.innerHTML = "";

    const titulo = document.getElementById("titulo").value.trim();
    const categoria = document.getElementById("categoria").value;
    const descricao = document.getElementById("descricao").value.trim();
    const precoInicial = parseFloat(document.getElementById("preco-inicial").value);
    const duracao = parseInt(document.getElementById("duracao").value, 10);
    const arquivoImagem = document.getElementById("imagem").files[0];
    
    let compreJa = document.getElementById("compre-ja").value;
    compreJa = compreJa ? parseFloat(compreJa) : null;

    if (!arquivoImagem) {
      mostrarErro("Por favor, selecione uma foto para o anúncio.");
      return;
    }

    const payload = {
      title: titulo,
      description: descricao,
      initialBidPrice: precoInicial,
      buyNowPrice: compreJa,
      durationInDays: duracao,
      category: categoria
    };

    const formData = new FormData();
    // O Spring Boot espera a parte "data" como application/json
    formData.append("data", new Blob([JSON.stringify(payload)], { type: "application/json" }));
    formData.append("image", arquivoImagem);

    btnSalvar.disabled = true;
    btnSalvar.textContent = "Salvando...";

    try {
      const resp = await window.API.createAuction(formData);
      mostrarSucesso("Anúncio criado com sucesso! Redirecionando para o lote...");
      
      setTimeout(() => {
        window.location.href = "lote.html?id=" + encodeURIComponent(resp.id);
      }, 2000);

    } catch (err) {
      console.error(err);
      let erroHtml = "<b>Erro ao criar anúncio:</b> " + window.UI.esc(err.message);
      if (err.data && typeof err.data === "object") {
        erroHtml += "<ul>";
        for (const k in err.data) {
          if (k !== "message" && k !== "error" && typeof err.data[k] === "string") {
            erroHtml += "<li>" + window.UI.esc(err.data[k]) + "</li>";
          }
        }
        erroHtml += "</ul>";
      }
      mostrarErro(erroHtml);
      btnSalvar.disabled = false;
      btnSalvar.textContent = "✔ Publicar Anúncio";
    }
  });

})();
