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
      (AUTH.estaIdentificado() ?
        '<div style="text-align: right; margin: 6px 0;">' +
          '<button type="button" id="btn-denunciar-leilao">⚠️ Denunciar este lote</button>' +
        '</div>' : '') +
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
    carregarPerguntas(sellerId);
    ligarDenunciarLeilao(lote, sellerId);
  }

  function linha(rotulo, valor) {
    return '<tr><th style="width:140px">' + rotulo + '</th><td>' + valor + '</td></tr>';
  }

  // ===================== MODAL DE DENÚCIA =====================
  function exibirModalDenuncia(tituloModal, callback) {
    let overlay = document.getElementById("modal-denuncia-overlay");
    if (!overlay) {
      overlay = document.createElement("div");
      overlay.id = "modal-denuncia-overlay";
      Object.assign(overlay.style, {
        position: "fixed", top: 0, left: 0, width: "100%", height: "100%",
        backgroundColor: "rgba(0,0,128,0.45)", display: "flex",
        alignItems: "center", justifyContent: "center", zIndex: 9999
      });
      const box = document.createElement("div");
      box.className = "caixa";
      Object.assign(box.style, {
        width: "90%", maxWidth: "420px"
      });
      box.innerHTML =
        '<div class="titulo" id="modal-denuncia-titulo">⚠️ Denúncia</div>' +
        '<div class="corpo">' +
          '<label for="modal-denuncia-contexto">Descreva o motivo da denúncia:</label>' +
          '<textarea id="modal-denuncia-contexto" rows="4" placeholder="Ex.: conteúdo ofensivo, fraude, informações falsas..."></textarea>' +
          '<div style="text-align:right; margin-top:10px;">' +
            '<button type="button" id="btn-cancelar-denuncia" style="margin-right:6px;">Cancelar</button>' +
            '<button type="button" id="btn-enviar-denuncia">✉ Enviar Denúncia</button>' +
          '</div>' +
        '</div>';
      overlay.appendChild(box);
      document.body.appendChild(overlay);
    }

    document.getElementById("modal-denuncia-titulo").innerText = tituloModal;
    document.getElementById("modal-denuncia-contexto").value = "";
    overlay.style.display = "flex";

    // Re-bind buttons (clone trick removes old listeners)
    ["btn-cancelar-denuncia", "btn-enviar-denuncia"].forEach(function (bid) {
      const old = document.getElementById(bid);
      const clone = old.cloneNode(true);
      old.parentNode.replaceChild(clone, old);
    });

    document.getElementById("btn-cancelar-denuncia").addEventListener("click", function () {
      overlay.style.display = "none";
    });

    document.getElementById("btn-enviar-denuncia").addEventListener("click", function () {
      const contexto = document.getElementById("modal-denuncia-contexto").value.trim();
      if (!contexto) {
        document.getElementById("modal-denuncia-contexto").style.borderColor = "#ff0000";
        return;
      }
      overlay.style.display = "none";
      callback(contexto);
    });
  }

  function mostrarToast(msg, ok) {
    let el = document.getElementById("toast-denuncia");
    if (!el) {
      el = document.createElement("div");
      el.id = "toast-denuncia";
      Object.assign(el.style, {
        position: "fixed", bottom: "20px", right: "20px", zIndex: 10000,
        padding: "8px 14px", border: "2px outset #ffffff",
        fontFamily: "Verdana, sans-serif", fontSize: "13px", fontWeight: "bold",
        background: "#c0c0c0", display: "none"
      });
      document.body.appendChild(el);
    }
    el.className = ok ? "mensagem-ok" : "mensagem-erro";
    el.style.background = "#c0c0c0";
    el.style.border = "2px outset #ffffff";
    el.style.padding = "8px 14px";
    el.textContent = msg;
    el.style.display = "block";
    setTimeout(function () { el.style.display = "none"; }, 3000);
  }

  // ===================== DENÚCIA DO LEILÃO =====================
  function ligarDenunciarLeilao(lote, sellerId) {
    const btn = document.getElementById("btn-denunciar-leilao");
    if (!btn) return;
    btn.addEventListener("click", function () {
      exibirModalDenuncia("⚠️ Denunciar Lote", async function (razao) {
        const uLogado = AUTH.getUsuario();
        const payload = {
          userId: uLogado.userId,
          sellerId: sellerId,
          auctionId: lote.id,
          auctionTitle: lote.title,
          auctionDescription: pega(lote, ["description", "descricao"], ""),
          reportReason: razao,
          auctionThumb: pega(lote, ["mainImageUrl", "imageUrl", "imagem"], "")
        };
        try {
          await API.reportAuction(payload);
          mostrarToast("✅ Denúncia do lote enviada com sucesso!", true);
        } catch (e) {
          mostrarToast("❌ Falha ao denunciar lote: " + e.message, false);
        }
      });
    });
  }

  // ===================== DENÚCIA DE MENSAGEM =====================
  function ligarDenunciarMensagens(sellerId) {
    document.querySelectorAll(".link-denunciar-msg").forEach(function (link) {
      link.addEventListener("click", function () {
        const mid = this.getAttribute("data-mid");
        const msgText = this.getAttribute("data-msg");
        const tipo = this.getAttribute("data-tipo"); // "pergunta" or "resposta"

        exibirModalDenuncia("⚠️ Denunciar " + (tipo === "resposta" ? "Resposta" : "Pergunta"), async function (razao) {
          const uLogado = AUTH.getUsuario();
          const payload = {
            userId: uLogado.userId,
            auctionId: Number(id),
            sellerId: sellerId,
            messageId: Number(mid),
            message: msgText,
            reportReason: razao
          };
          try {
            await API.reportMessage(payload);
            if (tipo === "resposta") {
              const el = link.closest(".resposta");
              if (el) {
                el.innerHTML = '<span class="dica" style="font-style:italic;">Resposta denunciada e removida.</span>';
              }
            }
            mostrarToast("✅ Denúncia enviada com sucesso!", true);
          } catch (e) {
            mostrarToast("❌ Falha ao denunciar: " + e.message, false);
          }
        });
      });
    });
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
      let perfil = null;
      let v = null;
      try { perfil = await API.profile(sellerId); } catch (e) { }
      try { v = await API.sellerInfo(sellerId); } catch (e) { }

      if (!perfil && !v) throw new Error("Falha ao carregar vendedor");

      perfil = perfil || {};
      v = v || {};

      const nome = [v.nome, v.sobrenome].filter(Boolean).join(" ");
      const local = [v.cidade, v.estado, v.pais].filter(Boolean).join(", ");

      let foto = perfil.profilePicture || v.profilePicture || v.fotoPerfil || v.foto || "";
      if (foto) foto = foto.replace(/^"|"$/g, '');

      let username = perfil.username || v.username;
      let nota = (perfil.reputacao !== undefined && perfil.reputacao !== null) ? perfil.reputacao : v.nota;

      el.innerHTML =
        (foto ? '<div class="centro"><img src="' + UI.esc(foto) + '" style="width:60px;height:60px;border-radius:50%;border:2px solid #808080" onerror="this.style.display=\'none\'"></div>' : '') +
        '<table class="tabela-dados">' +
        (username ? linha("Usuário", UI.esc(username)) : "") +
        (nome ? linha("Nome", UI.esc(nome)) : "") +
        (nota !== undefined && nota !== null ? linha("Reputação", "⭐ " + UI.esc(nota)) : "") +
        (local ? linha("Localização", UI.esc(local)) : "") +
        '</table>' +
        '<a class="botao" href="perfil-vendedor.html?id=' + encodeURIComponent(sellerId) + '">Ver perfil do vendedor</a>';
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

  async function carregarPerguntas(sellerId) {
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
      const uLogado = AUTH.getUsuario();
      const ehVendedor = (uLogado && sellerId && uLogado.userId === sellerId);

      const profiles = {};
      const uidsToFetch = new Set();
      function collectUid(obj) {
        if (!obj) return;
        const u = obj.user || obj.author || obj.autor || obj.askedBy || obj.answeredBy;
        if (u && typeof u === "object") {
          if (u.id) uidsToFetch.add(u.id);
          if (u.userId) uidsToFetch.add(u.userId);
        } else if (typeof u === "string" && u.length > 20) {
          uidsToFetch.add(u);
        }
        const id = obj.userId || obj.authorId || obj.autorId || obj.askedById || obj.answeredById;
        if (typeof id === "string" && id.length > 20) uidsToFetch.add(id);
      }
      lista.forEach(p => {
        collectUid(p);
        let resps = p.answers || p.respostas;
        if (Array.isArray(resps)) resps.forEach(collectUid);
        let r = p.answer || p.resposta || p.reply;
        if (r && !Array.isArray(r)) collectUid(r);
      });
      if (uidsToFetch.size > 0) {
        await Promise.all(Array.from(uidsToFetch).map(async (uid) => {
          try {
            const prof = await API.profile(uid);
            if (prof) profiles[uid] = prof;
          } catch (e) { }
        }));
      }

      function extractUserInfo(obj, defaultName) {
        if (!obj) return { name: defaultName, pic: "" };
        let foundName = null;
        let foundPic = null;
        let uid = obj.userId || obj.authorId || obj.autorId || obj.askedById || obj.answeredById;
        const u = obj.user || obj.author || obj.autor || obj.askedBy || obj.answeredBy;

        if (!uid) {
          if (u && typeof u === "object") {
            uid = u.id || u.userId;
            foundName = u.username || u.name || u.nome;
            foundPic = u.profilePicture || u.fotoPerfil || u.avatar;
          } else if (typeof u === "string" && u.length > 20) {
            uid = u;
          }
        }
        if (uid && profiles[uid]) {
          foundName = profiles[uid].username || foundName;
          foundPic = profiles[uid].profilePicture || foundPic;
        }

        if (!foundName || (typeof foundName === "string" && foundName.length > 20)) {
          if (u && typeof u === "object") foundName = u.username || u.name || u.nome;
          else if (typeof u === "string" && u.length < 20) foundName = u;
          else foundName = obj.username || obj.author || obj.autor;
        }
        if (!foundPic) {
          if (u && typeof u === "object") foundPic = u.profilePicture || u.fotoPerfil || u.avatar;
          else foundPic = obj.profilePicture || obj.fotoPerfil || obj.avatar || "";
        }
        return { name: foundName || defaultName, pic: foundPic || "" };
      }

      html = lista.map(function (p) {
        const qid = pega(p, ["id", "questionId"], "");
        const texto = pega(p, ["question", "text", "pergunta", "content"], "");
        const qInfo = extractUserInfo(p, "Usuário");
        const autor = qInfo.name;
        const autorPic = qInfo.pic ? '<img src="' + UI.esc(qInfo.pic.replace(/^"|"$/g, '')) + '" style="width:24px;height:24px;border-radius:50%;vertical-align:middle;margin-right:5px;object-fit:cover" onerror="this.src=\'img/sem-imagem.svg\'">' : '<img src="img/sem-imagem.svg" style="width:24px;height:24px;border-radius:50%;vertical-align:middle;margin-right:5px;object-fit:cover">';
        const quando = pega(p, ["createdAt", "date", "data"], null);

        const respostasArray = pega(p, ["answers", "respostas"], null);
        const respostaUnica = pega(p, ["answer", "resposta", "reply"], null);

        let respHtml = "";

        if (Array.isArray(respostasArray)) {
          respHtml += respostasArray.map(function (r) {
            const rt = typeof r === "string" ? r : pega(r, ["answer", "text", "resposta", "content"], "");
            let ra = "Vendedor";
            let raPic = '<img src="img/sem-imagem.svg" style="width:20px;height:20px;border-radius:50%;vertical-align:middle;margin-right:5px;object-fit:cover">';
            if (typeof r !== "string") {
              const rInfo = extractUserInfo(r, "Vendedor");
              ra = rInfo.name;
              if (rInfo.pic) {
                raPic = '<img src="' + UI.esc(rInfo.pic.replace(/^"|"$/g, '')) + '" style="width:20px;height:20px;border-radius:50%;vertical-align:middle;margin-right:5px;object-fit:cover" onerror="this.src=\'img/sem-imagem.svg\'">';
              }
            }
            let btnDenResp = '';
            if (AUTH.estaIdentificado()) {
              btnDenResp = ' <a href="javascript:void(0)" class="link-denunciar-msg" data-mid="' + UI.esc(qid) + '" data-msg="' + UI.esc(rt) + '" data-tipo="resposta" style="text-decoration:none; color:#cc0000; font-size:0.85em; margin-left:5px;">[Denunciar]</a>';
            }
            return '<div class="resposta" style="margin-left: 15px; border-left: 2px solid #ccc; padding-left: 10px; margin-top: 5px;">' + raPic + '<b>' + UI.esc(ra) + ':</b> ' + UI.esc(rt) + btnDenResp + '</div>';
          }).join("");
        }

        if (respostaUnica && (!Array.isArray(respostaUnica) || respostaUnica.length > 0)) {
          const rt = typeof respostaUnica === "string" ? respostaUnica : pega(respostaUnica, ["answer", "text", "resposta", "content", "reply"], "");
          let ra = "Vendedor";
          let raPic = '<img src="img/sem-imagem.svg" style="width:20px;height:20px;border-radius:50%;vertical-align:middle;margin-right:5px;object-fit:cover">';
          if (typeof respostaUnica !== "string") {
            const rInfo = extractUserInfo(respostaUnica, "Vendedor");
            ra = rInfo.name;
            if (rInfo.pic) {
              raPic = '<img src="' + UI.esc(rInfo.pic.replace(/^"|"$/g, '')) + '" style="width:20px;height:20px;border-radius:50%;vertical-align:middle;margin-right:5px;object-fit:cover" onerror="this.src=\'img/sem-imagem.svg\'">';
            }
          }

          let btnDenResp2 = '';
          if (AUTH.estaIdentificado()) {
            btnDenResp2 = ' <a href="javascript:void(0)" class="link-denunciar-msg" data-mid="' + UI.esc(qid) + '" data-msg="' + UI.esc(rt) + '" data-tipo="resposta" style="text-decoration:none; color:#cc0000; font-size:0.85em; margin-left:5px;">[Denunciar]</a>';
          }
          if (rt) {
            respHtml += '<div class="resposta" style="margin-left: 15px; border-left: 2px solid #ccc; padding-left: 10px; margin-top: 5px;">' + raPic + '<b>' + UI.esc(ra) + ':</b> ' + UI.esc(rt) + btnDenResp2 + '</div>';
          }
        }

        let areaResposta = "";
        // Só exibe a caixa de resposta se o vendedor estiver logado e ainda NÃO houver resposta
        if (ehVendedor && qid && !respHtml) {
          areaResposta = '<div style="margin-top: 4px; margin-left: 15px;">' +
            '<a href="javascript:void(0)" id="link-abrir-' + UI.esc(qid) + '" class="link-abrir-resposta" data-qid="' + UI.esc(qid) + '" style="font-size: 0.9em; text-decoration: none; color: #0066cc;">[responder]</a>' +
            '<div id="caixa-resposta-' + UI.esc(qid) + '" class="caixa-resposta" style="display: none; margin-top: 8px;">' +
            '<div style="text-align: right;"><a href="javascript:void(0)" class="link-fechar-resposta" data-qid="' + UI.esc(qid) + '" style="color: red; font-weight: bold; text-decoration: none; font-size: 1.1em;" title="Cancelar">✖</a></div>' +
            '<textarea id="nova-resposta-' + UI.esc(qid) + '" rows="2" placeholder="Escreva sua resposta..." style="width: 100%;"></textarea>' +
            '<button type="button" class="btn-responder" data-qid="' + UI.esc(qid) + '" style="margin-top:4px">Enviar Resposta</button>' +
            '<div id="msg-resposta-' + UI.esc(qid) + '"></div>' +
            '</div></div>';
        }

        return '<div class="pergunta" style="margin-bottom: 15px;">' +
          '<div style="margin-bottom:4px">' + autorPic + '<b>' + UI.esc(autor) + '</b> perguntou:</div>' +
          '<div>' + UI.esc(texto) + '</div>' +
          '<div class="meta" style="font-size: 0.85em; color: #666; margin-top: 2px;">' + UI.data(quando) +
            (AUTH.estaIdentificado() ? ' | <a href="javascript:void(0)" class="link-denunciar-msg" data-mid="' + UI.esc(qid) + '" data-msg="' + UI.esc(texto) + '" data-tipo="pergunta" style="text-decoration:none; color:#cc0000;">[Denunciar]</a>' : '') +
          '</div>' +
          respHtml +
          areaResposta +
          '</div>';
      }).join("<hr style='border: 0; border-top: 1px solid #eee;'/>");
    }
    el.innerHTML = html + caixaPerguntar(sellerId);
    ligarPerguntar();
    ligarRespostas(sellerId);
    ligarDenunciarMensagens(sellerId);
  }

  function caixaPerguntar(sellerId) {
    if (!AUTH.estaIdentificado()) {
      return '<hr><span class="dica">Faça <a href="login.html">login</a> para enviar uma pergunta ao vendedor.</span>';
    }
    const uLogado = AUTH.getUsuario();
    if (uLogado && sellerId && uLogado.userId === sellerId) {
      return '<hr><span class="dica">Você é o vendedor deste lote.</span>';
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
        setTimeout(function () { window.location.reload(); }, 1000);
      } catch (e) {
        msg.innerHTML = '<span class="mensagem-erro">Não foi possível enviar: ' + UI.esc(e.message) + '</span>';
      }
    });
  }

  function ligarRespostas(sellerId) {
    const links = document.querySelectorAll(".link-abrir-resposta");
    links.forEach(function (link) {
      link.addEventListener("click", function () {
        const qid = this.getAttribute("data-qid");
        const caixa = document.getElementById("caixa-resposta-" + qid);
        if (caixa.style.display === "none") {
          caixa.style.display = "block";
          this.style.display = "none";
        }
      });
    });

    const linksFechar = document.querySelectorAll(".link-fechar-resposta");
    linksFechar.forEach(function (link) {
      link.addEventListener("click", function () {
        const qid = this.getAttribute("data-qid");
        const caixa = document.getElementById("caixa-resposta-" + qid);
        const linkAbrir = document.getElementById("link-abrir-" + qid);
        if (caixa) caixa.style.display = "none";
        if (linkAbrir) linkAbrir.style.display = "inline";
      });
    });

    const btns = document.querySelectorAll(".btn-responder");
    btns.forEach(function (btn) {
      btn.addEventListener("click", async function () {
        const qid = this.getAttribute("data-qid");
        const msg = document.getElementById("msg-resposta-" + qid);
        const texto = document.getElementById("nova-resposta-" + qid).value.trim();
        if (!texto) { msg.innerHTML = '<span class="mensagem-erro">Escreva sua resposta.</span>'; return; }
        msg.innerHTML = '<span class="carregando">Enviando...</span>';
        try {
          await API.answerQuestion(qid, { answer: texto, text: texto, content: texto });
          msg.innerHTML = '<span class="mensagem-ok">Resposta enviada!</span>';
          setTimeout(function () { window.location.reload(); }, 1000);
        } catch (e) {
          msg.innerHTML = '<span class="mensagem-erro">Não foi possível enviar: ' + UI.esc(e.message) + '</span>';
        }
      });
    });
  }
})();
