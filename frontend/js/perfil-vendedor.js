/* ============================================================
   Lógica da página Perfil do Vendedor
   ============================================================ */
(async function () {
  await window.AUTH.init();
  // Passa null para não deixar nenhum item do menu (como Meu Perfil) ativo
  UI.iniciarPagina(null);

  const root = document.getElementById("conteudo-perfil-vendedor");
  const params = new URLSearchParams(window.location.search);
  const id = params.get("id");

  if (!id) {
    root.innerHTML = '<div class="caixa"><div class="corpo mensagem-erro">' +
      'Vendedor não informado. Volte para a <a href="busca.html">busca</a>.</div></div>';
    return;
  }

  carregar(id);

  async function carregar(uuid) {
    try {
      const perfil = await API.profile(uuid);
      let seller = null;
      try { seller = await API.sellerInfo(uuid); } catch (_) {}

      renderizar(uuid, perfil, seller);
      carregarAnuncios(uuid, 0);
    } catch (e) {
      root.innerHTML = '<div class="caixa"><div class="titulo">Perfil do Vendedor</div>' +
        '<div class="corpo mensagem-erro">Não foi possível carregar este perfil: ' +
        UI.esc(e.message) + '</div></div>';
    }
  }

  function renderizar(uuid, perfil, seller) {
    const nomeCompleto = seller ? [seller.nome, seller.sobrenome].filter(Boolean).join(" ") : "";
    const local = seller ? [seller.cidade, seller.estado, seller.pais].filter(Boolean).join(", ") : "";

    let foto = perfil.profilePicture || (seller && seller.fotoPerfil) || "";
    foto = foto.replace(/^"|"$/g, '');

    const nota = (perfil.reputacao !== undefined && perfil.reputacao !== null)
        ? perfil.reputacao
        : (seller ? seller.nota : null);

    let html = '' +
        '<div class="dica" style="margin-bottom:10px"><a href="javascript:history.back()">&laquo; Voltar</a></div>' +
        '<table class="layout"><tbody><tr>' +
        '<td class="coluna-lateral">' +
        '<div class="caixa"><div class="titulo">🏪 Perfil do Vendedor</div>' +
        '<div class="corpo centro">' +
        (foto ? '<img src="' + foto + '" style="width:100px;height:100px;border-radius:50%;border:3px outset #fff" onerror="this.src=\'img/sem-imagem.svg\'">'
            : '<img src="img/sem-imagem.svg" style="width:100px;height:100px">') +
        '<div style="font-size:16px;font-weight:bold;margin-top:6px">' + UI.esc(perfil.username || "—") + '</div>' +
        (nota !== null && nota !== undefined ? '<div>Reputação: ⭐ ' + UI.esc(nota) + '</div>' : '') +
        '</div>' +
        '</div>' +
        '</td>' +
        '<td class="conteudo">' +
        '<div class="caixa"><div class="titulo">📇 Dados Públicos</div><div class="corpo">' +
        '<table class="tabela-dados">' +
        linha("Usuário", UI.esc(perfil.username)) +
        (nomeCompleto ? linha("Nome", UI.esc(nomeCompleto)) : "") +
        (local ? linha("Localização", UI.esc(local)) : "") +
        '</table>' +
        '</div></div>' +
        '<div class="caixa" style="margin-top:15px"><div class="titulo">📦 Anúncios do Vendedor</div><div class="corpo">' +
        '<div id="anuncios-vendedor" class="grade-lotes"></div>' +
        '<div id="area-carregar-mais" class="centro" style="margin-top:15px"></div>' +
        '</div></div>' +
        '</td></tr></tbody></table>';
    root.innerHTML = html;
  }

  async function carregarAnuncios(uuid, paginaAtual = 0) {
    const el = document.getElementById("anuncios-vendedor");
    const areaBtn = document.getElementById("area-carregar-mais");
    
    areaBtn.innerHTML = '<span class="carregando">Buscando lotes...</span>';

    try {
      const tamanhoPagina = 12;
      const pagina = await API.sellerListings(uuid, paginaAtual, tamanhoPagina);
      const itens = (pagina && pagina.content) || [];

      areaBtn.innerHTML = ''; // Limpa estado de carregamento

      if (!itens.length && paginaAtual === 0) {
        el.innerHTML = '<span class="dica">Este vendedor não possui anúncios ativos.</span>';
        return;
      }

      // Adiciona novos itens ao final
      el.insertAdjacentHTML('beforeend', itens.map(UI.cartaoLote).join(""));

      // Verifica se é a última página
      const isLast = pagina.last !== undefined ? pagina.last : (itens.length < tamanhoPagina);

      if (!isLast) {
        areaBtn.innerHTML = '<button type="button" class="botao botao-grande" id="btn-carregar-mais-vendedor">Carregar mais anúncios ⬇</button>';
        document.getElementById("btn-carregar-mais-vendedor").addEventListener("click", () => {
          carregarAnuncios(uuid, paginaAtual + 1);
        });
      }
    } catch (e) {
      if (paginaAtual === 0) {
        el.innerHTML = '<span class="mensagem-erro">Não foi possível carregar os lotes: ' + UI.esc(e.message) + '</span>';
      } else {
        areaBtn.innerHTML = '<span class="mensagem-erro">Erro ao carregar mais lotes. Tente novamente.</span>';
      }
    }
  }

  function linha(rotulo, valor) {
    return '<tr><th style="width:150px">' + rotulo + '</th><td>' + valor + '</td></tr>';
  }
})();
