/* ============================================================
   Lógica da página do lote (leilão)

   Esta página combina três fontes:
   - GET /auctions/{auctionId}            -> auction-service (dados do leilão)
   - GET /usuarios/{sellerId}/seller-info -> user-service   (dados do vendedor)
   - GET /api/qa/auctions/{auctionId}/questions -> qa-service (perguntas)

   OBS: o contrato do auction-service não está disponível neste repositório,
   então a renderização é DEFENSIVA: tentamos vários nomes de campo comuns
   e mostramos o que existir. Ajuste os "pega(...)" se os nomes diferirem.
   ============================================================ */
(async function () {
  await window.AUTH.init();
  UI.iniciarPagina("");

  const root = document.getElementById("conteudo-lote");
  const params = new URLSearchParams(window.location.search);
  const id = params.get("id");

  if (!id) {
    root.innerHTML = '<div class="caixa"><div class="corpo mensagem-erro">' +
      'Lote não informado. Volte para a <a href="busca.html">busca</a>.</div></div>';
    return;
  }

  // Tenta achar o primeiro campo existente entre várias chaves possíveis.
  function pega(obj, chaves, padrao) {
    for (let i = 0; i < chaves.length; i++) {
      const k = chaves[i];
      if (obj && obj[k] !== undefined && obj[k] !== null && obj[k] !== "") return obj[k];
    }
    return padrao;
  }

  carregar();

  async function carregar() {
    let lote;
    try {
      lote = await API.auction(id);
    } catch (e) {
      root.innerHTML = '<div class="caixa"><div class="corpo mensagem-erro">' +
        'Não foi possível carregar este lote: ' + UI.esc(e.message) + '<br><br>' +
        '<a class="botao" href="busca.html">&laquo; Voltar à busca</a></div></div>';
      return;
    }

    const titulo = pega(lote, ["title", "titulo", "name"], "Lote #" + id);
    const descricao = pega(lote, ["description", "descricao"], "Sem descrição.");
    const img = pega(lote, ["mainImageUrl", "imageUrl", "imagem"], "");
    const imagens = pega(lote, ["images", "imagens", "imageUrls"], null);
    const lanceAtual = pega(lote, ["currentBidPrice", "currentBid", "lanceAtual"], null);
    const lanceInicial = pega(lote, ["initialBidPrice", "initialBid", "lanceInicial"], null);
    const compreJa = pega(lote, ["buyNowPrice", "buyNow", "compreJa"], null);
    const categoria = pega(lote, ["category", "categoria"], "");
    const status = pega(lote, ["status"], "");
    const expira = pega(lote, ["expirationDate", "endDate", "dataExpiracao"], null);
    const sellerId = pega(lote, ["sellerId", "seller", "vendedorId", "userId"], null);
    const lances = pega(lote, ["bids", "lances", "bidHistory"], null);

    const galeria = montarGaleria(img, imagens, titulo);

    root.innerHTML = '' +
      '<div class="dica"><a href="busca.html">&laquo; Voltar à busca</a></div>' +
      '<table class="layout"><tbody><tr>' +

      // Coluna esquerda: imagem + descrição + perguntas
      '<td class="conteudo">' +
      '<div class="caixa">' +
      '<div class="titulo">' + UI.esc(titulo) + '</div>' +
      '<div class="corpo">' +
      galeria +
      '<table class="tabela-dados" style="margin-top:8px">' +
      linha("Categoria", UI.categoria(categoria)) +
      linha("Situação", UI.status(status)) +
      linha("Encerramento", UI.data(expira) + (expira ? " (" + UI.esc(UI.tempoRestante(expira)) + ")" : "")) +
      linha("Código do lote", UI.esc(id)) +
      '</table>' +
      '</div>' +
      '</div>' +
      '<div class="caixa">' +
      '<div class="titulo">📝 Descrição</div>' +
      '<div class="corpo">' + UI.esc(descricao).replace(/\n/g, "<br>") + '</div>' +
      '</div>' +
      '<div class="caixa">' +
      '<div class="titulo">❓ Perguntas e Respostas</div>' +
      '<div class="corpo" id="qa">Carregando perguntas...</div>' +
      '</div>' +
      '</td>' +

      // Coluna direita: lance + vendedor
      '<td class="coluna-lateral">' +
      '<div class="caixa">' +
      '<div class="titulo">💰 Dê seu Lance</div>' +
      '<div class="corpo">' +
      (lanceAtual !== null ? '<div>Lance atual:</div><div class="preco" style="font-size:22px">' + UI.dinheiro(lanceAtual) + '</div>' : '') +
      (lanceInicial !== null ? '<div class="dica">Lance inicial: ' + UI.dinheiro(lanceInicial) + '</div>' : '') +
      (compreJa !== null ? '<div class="dica">Compre já: ' + UI.dinheiro(compreJa) + '</div>' : '') +
      '<div id="area-lance" style="margin-top:8px"></div>' +
      '</div>' +
      '</div>' +
      '<div class="caixa">' +
      '<div class="titulo">🏪 Vendedor</div>' +
      '<div class="corpo" id="vendedor">' +
      (sellerId ? 'Carregando...' : '<span class="dica">Vendedor não informado.</span>') +
      '</div>' +
      '</div>' +
      (lances ? '<div class="caixa"><div class="titulo">📜 Histórico de Lances</div>' +
        '<div class="corpo" id="historico"></div></div>' : '') +
      '</td>' +

      '</tr></tbody></table>';

    montarAreaLance(status);
    if (sellerId) carregarVendedor(sellerId);
    if (lances) montarHistorico(lances);
    carregarPerguntas();
  }

  function linha(rotulo, valor) {
    return '<tr><th style="width:140px">' + rotulo + '</th><td>' + valor + '</td></tr>';
  }

  function montarGaleria(principal, lista, titulo) {
    let urls = [];
    if (Array.isArray(lista)) urls = lista.filter(Boolean);
    if (principal && urls.indexOf(principal) === -1) urls.unshift(principal);
    if (!urls.length) {
      return '<div class="centro"><img src="img/sem-imagem.svg" alt="sem imagem" style="max-width:100%"></div>';
    }
    const grande = '<div class="centro"><img id="img-principal" src="' + UI.esc(urls[0]) +
      '" alt="' + UI.esc(titulo) + '" style="max-width:100%;max-height:320px;border:2px inset #808080" ' +
      'onerror="this.src=\'img/sem-imagem.svg\'"></div>';
    let miniaturas = "";
    if (urls.length > 1) {
      miniaturas = '<div class="centro" style="margin-top:4px">' + urls.map(function (u) {
        return '<img src="' + UI.esc(u) + '" style="width:54px;height:54px;object-fit:cover;border:1px solid #808080;cursor:pointer;margin:2px" ' +
          'onclick="document.getElementById(\'img-principal\').src=this.src" onerror="this.style.display=\'none\'">';
      }).join("") + '</div>';
    }
    return grande + miniaturas;
  }

  function montarAreaLance(status) {
    const el = document.getElementById("area-lance");
    if (!el) return;
    const ativo = !status || status === "ACTIVE";
    if (!ativo) {
      el.innerHTML = '<span class="dica">Este lote não está aceitando lances no momento (' + UI.status(status) + ').</span>';
      return;
    }
    if (!AUTH.estaIdentificado()) {
      el.innerHTML = '<span class="dica">Você precisa estar logado para dar um lance.</span><br>' +
        '<a class="botao botao-lance" href="login.html">Entrar para dar lance</a>';
      return;
    }
    el.innerHTML =
      '<input type="number" id="valor-lance" min="0" step="0.01" placeholder="Valor do seu lance">' +
      '<button type="button" id="btn-lance" class="botao-lance" style="margin-top:6px;width:100%">Dar Lance!</button>' +
      '<div id="msg-lance"></div>';
    document.getElementById("btn-lance").addEventListener("click", darLance);
  }

  async function darLance() {
    const msg = document.getElementById("msg-lance");
    const valor = document.getElementById("valor-lance").value;
    if (!valor || Number(valor) <= 0) { msg.innerHTML = '<span class="mensagem-erro">Informe um valor válido.</span>'; return; }
    msg.innerHTML = '<span class="carregando">Enviando lance...</span>';
    try {
      // O contrato exato do corpo pode variar; enviamos os campos mais prováveis.
      await API.placeBid(id, { amount: Number(valor), value: Number(valor), bidAmount: Number(valor) });
      msg.innerHTML = '<span class="mensagem-ok">Lance enviado com sucesso! Atualizando...</span>';
      setTimeout(function () { window.location.reload(); }, 1200);
    } catch (e) {
      if (e.status === 401 || e.status === 403) {
        msg.innerHTML = '<span class="mensagem-erro">Sua sessão expirou. <a href="login.html">Entre novamente</a>.</span>';
      } else {
        msg.innerHTML = '<span class="mensagem-erro">Não foi possível enviar o lance: ' + UI.esc(e.message) + '</span>';
      }
    }
  }

  async function carregarVendedor(sellerId) {
    const el = document.getElementById("vendedor");
    try {
      const v = await API.sellerInfo(sellerId);
      const nome = [v.nome, v.sobrenome].filter(Boolean).join(" ");
      const local = [v.cidade, v.estado, v.pais].filter(Boolean).join(", ");
      el.innerHTML =
        (v.fotoPerfil ? '<div class="centro"><img src="' + UI.esc(v.fotoPerfil) + '" style="width:60px;height:60px;border-radius:50%;border:2px solid #808080" onerror="this.style.display=\'none\'"></div>' : '') +
        '<table class="tabela-dados">' +
        (v.username ? linha("Usuário", UI.esc(v.username)) : "") +
        (nome ? linha("Nome", UI.esc(nome)) : "") +
        (v.nota !== undefined && v.nota !== null ? linha("Reputação", "⭐ " + UI.esc(v.nota)) : "") +
        (local ? linha("Localização", UI.esc(local)) : "") +
        '</table>' +
        '<a class="botao" href="perfil.html?id=' + encodeURIComponent(sellerId) + '">Ver perfil do vendedor</a>';
    } catch (e) {
      el.innerHTML = '<span class="dica">Não foi possível carregar os dados do vendedor.</span>';
    }
  }

  function montarHistorico(lances) {
    const el = document.getElementById("historico");
    if (!el) return;
    if (!Array.isArray(lances) || !lances.length) { el.innerHTML = '<span class="dica">Nenhum lance ainda.</span>'; return; }
    el.innerHTML = '<table class="tabela-dados"><tr><th>Valor</th><th>Quando</th></tr>' +
      lances.slice(0, 15).map(function (b) {
        const v = pega(b, ["amount", "value", "bidAmount", "valor"], null);
        const q = pega(b, ["createdAt", "date", "timestamp", "data"], null);
        return '<tr><td>' + UI.dinheiro(v) + '</td><td>' + UI.data(q) + '</td></tr>';
      }).join("") + '</table>';
  }

  async function carregarPerguntas() {
    const el = document.getElementById("qa");
    let perguntas;
    try {
      perguntas = await API.questions(id);
    } catch (e) {
      el.innerHTML = '<span class="dica">Não foi possível carregar as perguntas.</span>' + caixaPerguntar();
      ligarPerguntar();
      return;
    }
    const lista = Array.isArray(perguntas) ? perguntas : ((perguntas && perguntas.content) || []);
    let html = "";
    if (!lista.length) {
      html = '<span class="dica">Nenhuma pergunta ainda. Seja o primeiro a perguntar!</span>';
    } else {
      html = lista.map(function (p) {
        const texto = pega(p, ["question", "text", "pergunta", "content"], "");
        const autor = pega(p, ["username", "author", "autor", "askedBy"], "Usuário");
        const quando = pega(p, ["createdAt", "date", "data"], null);
        const respostas = pega(p, ["answers", "respostas"], null);
        let respHtml = "";
        if (Array.isArray(respostas)) {
          respHtml = respostas.map(function (r) {
            const rt = pega(r, ["answer", "text", "resposta", "content"], "");
            const ra = pega(r, ["username", "author", "autor", "answeredBy"], "Vendedor");
            return '<div class="resposta"><b>' + UI.esc(ra) + ':</b> ' + UI.esc(rt) + '</div>';
          }).join("");
        }
        return '<div class="pergunta">' +
          '<div><b>' + UI.esc(autor) + '</b> perguntou:</div>' +
          '<div>' + UI.esc(texto) + '</div>' +
          '<div class="meta">' + UI.data(quando) + '</div>' +
          respHtml +
          '</div>';
      }).join("");
    }
    el.innerHTML = html + caixaPerguntar();
    ligarPerguntar();
  }

  function caixaPerguntar() {
    if (!AUTH.estaIdentificado()) {
      return '<hr><span class="dica">Faça <a href="login.html">login</a> para enviar uma pergunta ao vendedor.</span>';
    }
    return '<hr>' +
      '<label for="nova-pergunta">Faça uma pergunta ao vendedor</label>' +
      '<textarea id="nova-pergunta" rows="2" placeholder="Escreva sua pergunta..."></textarea>' +
      '<button type="button" id="btn-perguntar" style="margin-top:6px">Enviar pergunta</button>' +
      '<div id="msg-pergunta"></div>';
  }

  function ligarPerguntar() {
    const btn = document.getElementById("btn-perguntar");
    if (!btn) return;
    btn.addEventListener("click", async function () {
      const msg = document.getElementById("msg-pergunta");
      const texto = document.getElementById("nova-pergunta").value.trim();
      if (!texto) { msg.innerHTML = '<span class="mensagem-erro">Escreva sua pergunta.</span>'; return; }
      msg.innerHTML = '<span class="carregando">Enviando...</span>';
      try {
        await API.askQuestion(id, { question: texto, text: texto, content: texto });
        msg.innerHTML = '<span class="mensagem-ok">Pergunta enviada!</span>';
        setTimeout(carregarPerguntas, 1000);
      } catch (e) {
        msg.innerHTML = '<span class="mensagem-erro">Não foi possível enviar: ' + UI.esc(e.message) + '</span>';
      }
    });
  }
})();
