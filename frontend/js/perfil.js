/* ============================================================
   Lógica da página Meu Perfil (apenas para o usuário logado)
   ============================================================ */
(async function () {
  await window.AUTH.init();
  UI.iniciarPagina("perfil.html");

  const root = document.getElementById("conteudo-perfil");
  const usuarioLocal = AUTH.getUsuario();

  if (!usuarioLocal || !usuarioLocal.userId) {
    mostrarConvite();
    return;
  }

  carregar(usuarioLocal.userId);

  async function carregar(uuid) {
    try {
      const perfil = await API.profile(uuid);
      let seller = null;
      try { seller = await API.sellerInfo(uuid); } catch (_) { /* opcional */ }
      
      let me = null;
      try { me = await API.me(); } catch (_) { /* opcional */ }

      let payments = null;
      try { payments = await API.getPayments(uuid); } catch (_) { /* opcional */ }

      let transactions = [];
      if (payments && payments.length > 0) {
        try {
          const txPromises = payments
            .filter(p => p.transactionId)
            .map(p => API.getTransaction(p.transactionId));
          const txResults = await Promise.allSettled(txPromises);
          transactions = txResults
            .filter(res => res.status === "fulfilled" && res.value)
            .map(res => res.value);
        } catch (_) {}
      }

      renderizar(uuid, perfil, seller, payments, me, transactions);
    } catch (e) {
      root.innerHTML = '<div class="caixa"><div class="titulo">Meu Perfil</div>' +
        '<div class="corpo mensagem-erro">Não foi possível carregar este perfil: ' +
        UI.esc(e.message) + '</div></div>';
    }
  }

  function obterDadosStatus(perfil, me, seller, usuarioLocal, uuid) {
    const userId = uuid || (usuarioLocal && usuarioLocal.userId);
    let savedStatus = localStorage.getItem("user_status_" + userId) ||
                      localStorage.getItem("user_status");
    let savedFim = localStorage.getItem("suspenso_ate_" + userId) ||
                   localStorage.getItem("suspenso_ate");

    let rawStatus = (perfil && perfil.status) ||
                    (me && me.status) ||
                    (seller && seller.status) ||
                    (usuarioLocal && usuarioLocal.status) ||
                    savedStatus ||
                    null;

    let tipo = "DESCONHECIDO";

    if (rawStatus) {
      const upper = String(rawStatus).toUpperCase();
      if (upper.includes("BAN") || upper.includes("INATIV")) {
        tipo = "BANIDO";
      } else if (upper.includes("SUSP")) {
        tipo = "SUSPENSO";
      } else if (upper.includes("ATIV") || upper.includes("ACTIV")) {
        tipo = "ATIVO";
      }
    }

    if (tipo === "DESCONHECIDO") {
      if (
        (me && me.isAllowed === false) ||
        (perfil && perfil.isAllowed === false)
      ) {
        tipo = "SUSPENSO";
      } else if (
        (me && me.isAllowed === true) ||
        (perfil && perfil.isAllowed === true)
      ) {
        tipo = "ATIVO";
      }
    }

    let dataFimSuspensao = (perfil && (perfil.suspensoAte || perfil.suspendedUntil)) ||
                           (me && (me.suspensoAte || me.suspendedUntil)) ||
                           (usuarioLocal && (usuarioLocal.suspensoAte || usuarioLocal.suspendedUntil)) ||
                           savedFim;

    return { tipo, rawStatus, dataFimSuspensao };
  }

  function renderizar(uuid, perfil, seller, payments, me, transactions) {
    const nomeCompleto = seller ? [seller.nome, seller.sobrenome].filter(Boolean).join(" ") : "";
    const local = seller ? [seller.cidade, seller.estado, seller.pais].filter(Boolean).join(", ") : "";

    let foto = perfil.profilePicture || (seller && seller.fotoPerfil) || "";
    foto = foto.replace(/^"|"$/g, ''); 

    const nota = (perfil.reputacao !== undefined && perfil.reputacao !== null)
        ? perfil.reputacao
        : (seller ? seller.nota : null);

    const email = me ? (me.email || me.emailAddress) : null;
    const cpf = me ? (me.cpf || me.document) : null;

    const statusInfo = obterDadosStatus(perfil, me, seller, usuarioLocal, uuid);

    let htmlStatusCard = '';
    let badgeTabela = '';

    if (statusInfo.tipo === "BANIDO") {
      htmlStatusCard =
        '<div style="margin-top:10px;">' +
        '<span class="botao botao-status" data-tipo="BANIDO" style="font-size:11px; padding:3px 10px; cursor:pointer; font-weight:bold; background:linear-gradient(180deg, #ffcdd2 0%, #ef9a9a 100%); color:#b71c1c;">' +
        'BANIDO' +
        '</span>' +
        '<div style="font-size:10px; color:#b71c1c; margin-top:4px;">CONTA DESATIVADA</div>' +
        '</div>';

      badgeTabela =
        '<span class="botao botao-status" data-tipo="BANIDO" style="font-size:10px; padding:2px 8px; cursor:pointer; font-weight:bold; background:linear-gradient(180deg, #ffcdd2 0%, #ef9a9a 100%); color:#b71c1c;">' +
        'BANIDO' +
        '</span>';
    } else if (statusInfo.tipo === "SUSPENSO") {
      htmlStatusCard =
        '<div style="margin-top:10px; width:100%;">' +
        '<span class="botao botao-status" data-tipo="SUSPENSO" style="font-size:11px; padding:3px 10px; cursor:pointer; font-weight:bold; background:linear-gradient(180deg, #fff9c4 0%, #ffe082 100%); color:#8d6e63;">' +
        'SUSPENSO' +
        '</span>' +
        (statusInfo.dataFimSuspensao ?
          '<div style="margin-top:6px; padding:5px; background:#fffde7; border:1px solid #fbc02d; border-radius:3px; font-size:10px; color:#555;">' +
          '<div style="font-weight:bold; color:#795548; margin-bottom:2px;">TEMPO RESTANTE:</div>' +
          '<div id="suspensao-cronometro" style="font-weight:bold; color:#c62828; font-size:12px;">CALCULANDO...</div>' +
          '</div>' : '') +
        '</div>';

      badgeTabela =
        '<span class="botao botao-status" data-tipo="SUSPENSO" style="font-size:10px; padding:2px 8px; cursor:pointer; font-weight:bold; background:linear-gradient(180deg, #fff9c4 0%, #ffe082 100%); color:#8d6e63;">' +
        'SUSPENSO' +
        '</span>';
    } else if (statusInfo.tipo === "ATIVO") {
      htmlStatusCard =
        '<div style="margin-top:10px;">' +
        '<span class="botao botao-status" data-tipo="ATIVO" style="font-size:11px; padding:3px 10px; cursor:pointer; font-weight:bold; background:linear-gradient(180deg, #c8e6c9 0%, #a5d6a7 100%); color:#1b5e20;">' +
        'ATIVO' +
        '</span>' +
        '</div>';

      badgeTabela =
        '<span class="botao botao-status" data-tipo="ATIVO" style="font-size:10px; padding:2px 8px; cursor:pointer; font-weight:bold; background:linear-gradient(180deg, #c8e6c9 0%, #a5d6a7 100%); color:#1b5e20;">' +
        'ATIVO' +
        '</span>';
    } else {
      htmlStatusCard =
        '<div style="margin-top:10px;">' +
        '<span class="botao botao-status" data-tipo="DESCONHECIDO" style="font-size:11px; padding:3px 10px; cursor:pointer; font-weight:bold; background:linear-gradient(180deg, #e0e0e0 0%, #bdbdbd 100%); color:#424242;">' +
        'DESCONHECIDO' +
        '</span>' +
        '</div>';

      badgeTabela =
        '<span class="botao botao-status" data-tipo="DESCONHECIDO" style="font-size:10px; padding:2px 8px; cursor:pointer; font-weight:bold; background:linear-gradient(180deg, #e0e0e0 0%, #bdbdbd 100%); color:#424242;">' +
        'DESCONHECIDO' +
        '</span>';
    }

    let html = '' +
        '<table class="layout"><tbody><tr>' +
        '<td class="coluna-lateral">' +
        '<div class="caixa"><div class="titulo">👤 Meu Perfil</div>' +
        '<div class="corpo centro">' +
        (foto ? '<img src="' + foto + '" style="width:100px;height:100px;border-radius:50%;border:3px outset #fff" onerror="this.src=\'img/sem-imagem.svg\'">'
            : '<img src="img/sem-imagem.svg" style="width:100px;height:100px">') +
        '<div style="font-size:16px;font-weight:bold;margin-top:6px">' + UI.esc(perfil.username || "—") + '</div>' +
        (nota !== null && nota !== undefined ? '<div>Reputação: ⭐ ' + UI.esc(nota) + '</div>' : '') +
        htmlStatusCard +
        '</div>' +
        '</div>' +
        '<div class="caixa"><div class="titulo">⚙️ Conta</div><div class="corpo">' +
        '<button type="button" onclick="window.abrirModalFoto()" style="width:100%;margin-bottom:8px">📷 Trocar foto de perfil</button>' +
        '<button type="button" onclick="AUTH.logout()" style="width:100%">Sair (logout)</button>' +
        '</div></div>' +
        '</td>' +

        '<td class="conteudo">' +
        '<div class="caixa"><div class="titulo">📇 Dados Pessoais (Privado)</div><div class="corpo">' +
        '<table class="tabela-dados">' +
        linha("Usuário", UI.esc(perfil.username)) +
        linha("Status da Conta", badgeTabela) +
        (email ? linha("E-mail", UI.esc(email)) : "") +
        (cpf ? linha("CPF", UI.esc(cpf)) : "") +
        (nomeCompleto ? linha("Nome", UI.esc(nomeCompleto)) : "") +
        (local ? linha("Localização", UI.esc(local)) : "") +
        linha("Código (UUID)", '<span class="dica">' + UI.esc(uuid) + '</span>') +
        '</table>' +
        '<p class="dica">Estas informações sensíveis não são exibidas publicamente para outros usuários.</p>' +
        '</div></div>';

    html += '<div class="caixa" style="margin-top:15px"><div class="titulo">💳 Meus Pagamentos & Transações</div><div class="corpo">';
    if (!payments || payments.length === 0) {
      html += '<span class="dica">Nenhum pagamento ou transação encontrado.</span>';
    } else {
      html += '<table class="tabela-dados" style="width: 100%; text-align: left;">' +
              '<tr><th>Lote</th><th>Valor</th><th>Pagamento</th><th>Transação</th><th>Ações</th></tr>';
      payments.forEach(function(p) {
        const t = transactions ? transactions.find(tx => tx.id === p.transactionId) : null;
        const pStatusStr = UI.esc(p.status);
        const tStatusStr = t ? UI.esc(t.status) : "N/A";

        let acaoHtml = [];
        if ((p.status === "PENDING" || p.status === "WAITING_PAYMENT") && p.providerPaymentId) {
          acaoHtml.push('<button type="button" class="btn-simular-pgto" data-pid="' + UI.esc(p.providerPaymentId) + '" style="font-size:0.8em; padding: 3px 8px; cursor: pointer;">Pagar (Simular)</button>');
        }
        if (t && t.status === "DELIVERY_PENDING") {
          acaoHtml.push('<button type="button" class="btn-confirmar-entrega" data-tid="' + UI.esc(t.id) + '" style="font-size:0.8em; padding: 3px 8px; cursor: pointer;">Confirmar Recebimento</button>');
        }
        
        let actions = acaoHtml.length > 0 ? acaoHtml.join(" ") : "-";
        let valorNum = p.amountInCents ? (p.amountInCents / 100) : 0;
        
        html += '<tr>' +
                '<td>' + UI.esc(p.auctionId) + '</td>' +
                '<td>' + UI.dinheiro(valorNum) + '</td>' +
                '<td>' + pStatusStr + '</td>' +
                '<td><span title="' + (t ? UI.esc(t.id) : '') + '" style="cursor:help;">' + tStatusStr + '</span></td>' +
                '<td>' + actions + '</td>' +
                '</tr>';
      });
      html += '</table><div id="msg-pgto" style="margin-top:10px;"></div><div id="msg-transacao" style="margin-top:10px;"></div>';
    }
    html += '</div></div>';
    html += '<div class="caixa" style="margin-top:15px"><div class="titulo">📦 Meus Anúncios</div><div class="corpo">' +
        '<div style="margin-bottom: 10px;">' +
        '<select id="filtro-status-anuncios" style="padding: 5px;">' +
        '<option value="ACTIVE">Ativos</option>' +
        '<option value="PENDING_REVIEW">Pendentes de Revisão</option>' +
        '<option value="REJECTED">Recusados</option>' +
        '<option value="SOLD">Vendidos</option>' +
        '<option value="EXPIRED">Expirados (Não vendidos)</option>' +
        '<option value="CANCELED">Cancelados</option>' +
        '</select>' +
        '</div>' +
        '<div id="meus-anuncios" class="grade-lotes"></div>' +
        '<div id="area-carregar-mais-anuncios" class="centro" style="margin-top:15px"></div>' +
        '</div></div>';

    html += '</td></tr></tbody></table>';
    root.innerHTML = html;

    document.querySelectorAll(".botao-status").forEach(btn => {
      btn.style.cursor = "pointer";
      btn.title = "Clique para soltar emojis!";
      btn.addEventListener("click", (ev) => {
        soltarEmotes(ev, btn.getAttribute("data-tipo"));
      });
    });

    if (statusInfo.tipo === "SUSPENSO") {
      iniciarCronometroSuspensao(statusInfo.dataFimSuspensao);
    }
    
    ligarPagamentos();
    ligarTransacoes();
    const dropdown = document.getElementById("filtro-status-anuncios");
    if (dropdown) {
      dropdown.addEventListener("change", () => {
        carregarAnuncios(uuid, 0);
      });
    }
    carregarAnuncios(uuid, 0);
  }

  function soltarEmotes(ev, tipo) {
    let emotes = ['😄', '🎉', '✨', '🟢', '👍', '🥳', '🌟'];
    if (tipo === 'SUSPENSO') {
      emotes = ['⏳', '⚠️', '😔', '🟡', '🔒', '⏰', '😢'];
    } else if (tipo === 'BANIDO') {
      emotes = ['🚫', '⛔', '😭', '🔴', '❌', '💔', '😡'];
    } else if (tipo === 'DESCONHECIDO') {
      emotes = ['❓', '🤔', '🌫️', '❔', '🧐'];
    }

    const rect = ev.currentTarget.getBoundingClientRect();
    const startX = rect.left + rect.width / 2;
    const startY = rect.top + rect.height / 2;

    for (let i = 0; i < 10; i++) {
      const el = document.createElement("span");
      const emote = emotes[Math.floor(Math.random() * emotes.length)];
      el.textContent = emote;
      el.style.position = "fixed";
      el.style.left = startX + "px";
      el.style.top = startY + "px";
      el.style.fontSize = (16 + Math.random() * 14) + "px";
      el.style.pointerEvents = "none";
      el.style.zIndex = "99999";
      el.style.transition = "transform 1.2s cubic-bezier(0.1, 0.8, 0.3, 1), opacity 1.2s ease-out";
      el.style.transform = "translate(-50%, -50%) scale(1)";
      el.style.opacity = "1";

      document.body.appendChild(el);

      const vx = (Math.random() - 0.5) * 140;
      const vy = -60 - Math.random() * 90;
      const rot = (Math.random() - 0.5) * 80;

      requestAnimationFrame(() => {
        el.style.transform = `translate(calc(-50% + ${vx}px), calc(-50% + ${vy}px)) rotate(${rot}deg) scale(${0.8 + Math.random() * 0.5})`;
        el.style.opacity = "0";
      });

      setTimeout(() => {
        if (el.parentNode) el.parentNode.removeChild(el);
      }, 1250);
    }
  }

  function iniciarCronometroSuspensao(dataFimStr) {
    const el = document.getElementById("suspensao-cronometro");
    if (!el) return;

    if (!dataFimStr) {
      el.innerText = "Reativação pendente";
      return;
    }

    function atualizar() {
      const agora = new Date().getTime();
      const fim = new Date(dataFimStr).getTime();
      const diff = fim - agora;

      if (isNaN(fim) || diff <= 0) {
        el.innerText = "Reativação iminente";
        return;
      }

      const segsTotal = Math.floor(diff / 1000);
      const dias = Math.floor(segsTotal / 86400);
      const horas = Math.floor((segsTotal % 86400) / 3600);
      const mins = Math.floor((segsTotal % 3600) / 60);
      const segs = segsTotal % 60;

      let res = "";
      if (dias > 0) res += dias + "d ";
      res += (horas < 10 ? "0" : "") + horas + "h ";
      res += (mins < 10 ? "0" : "") + mins + "m ";
      res += (segs < 10 ? "0" : "") + segs + "s";

      el.innerText = res;
    }

    atualizar();
    setInterval(atualizar, 1000);
  }

  async function carregarAnuncios(uuid, paginaAtual = 0) {
    const el = document.getElementById("meus-anuncios");
    const areaBtn = document.getElementById("area-carregar-mais-anuncios");
    const statusFiltro = document.getElementById("filtro-status-anuncios") ? document.getElementById("filtro-status-anuncios").value : "ACTIVE";
    
    areaBtn.innerHTML = '<span class="carregando">Buscando lotes...</span>';

    try {
      const tamanhoPagina = 12;
      const pagina = await API.sellerListings(uuid, paginaAtual, tamanhoPagina, statusFiltro);
      const itens = (pagina && pagina.content) || [];

      areaBtn.innerHTML = ''; 

      if (!itens.length && paginaAtual === 0) {
        el.innerHTML = '<span class="dica">Você não possui anúncios com este status.</span>';
        return;
      }

      if (paginaAtual === 0) {
        el.innerHTML = '';
      }

      el.insertAdjacentHTML('beforeend', itens.map(UI.cartaoLote).join(""));

      const isLast = pagina.last !== undefined ? pagina.last : (itens.length < tamanhoPagina);

      if (!isLast) {
        areaBtn.innerHTML = '<button type="button" class="botao botao-grande" id="btn-carregar-mais-meus-anuncios">Carregar mais anúncios ⬇</button>';
        document.getElementById("btn-carregar-mais-meus-anuncios").addEventListener("click", () => {
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

  function ligarPagamentos() {
    const btns = document.querySelectorAll(".btn-simular-pgto");
    btns.forEach(function (btn) {
      btn.addEventListener("click", async function () {
        const pid = this.getAttribute("data-pid");
        const msg = document.getElementById("msg-pgto");
        msg.innerHTML = '<span class="carregando">Simulando pagamento...</span>';
        this.disabled = true;
        try {
          await API.simulatePayment(pid);
          msg.innerHTML = '<span class="mensagem-ok">Pagamento simulado com sucesso! Atualizando...</span>';
          setTimeout(function() { window.location.reload(); }, 1500);
        } catch (e) {
          msg.innerHTML = '<span class="mensagem-erro">Falha ao simular: ' + UI.esc(e.message) + '</span>';
          this.disabled = false;
        }
      });
    });
  }

  function ligarTransacoes() {
    const btns = document.querySelectorAll(".btn-confirmar-entrega");
    btns.forEach(function (btn) {
      btn.addEventListener("click", async function () {
        const tid = this.getAttribute("data-tid");
        const msg = document.getElementById("msg-transacao");
        msg.innerHTML = '<span class="carregando">Confirmando recebimento...</span>';
        this.disabled = true;
        try {
          await API.confirmDelivery(tid);
          msg.innerHTML = '<span class="mensagem-ok">Recebimento confirmado com sucesso! Atualizando...</span>';
          setTimeout(function() { window.location.reload(); }, 1500);
        } catch (e) {
          msg.innerHTML = '<span class="mensagem-erro">Falha ao confirmar: ' + UI.esc(e.message) + '</span>';
          this.disabled = false;
        }
      });
    });
  }

  function linha(rotulo, valor) {
    return '<tr><th style="width:150px">' + rotulo + '</th><td>' + valor + '</td></tr>';
  }

  function mostrarConvite() {
    root.innerHTML = '' +
      '<div class="caixa">' +
      '<div class="titulo">🔒 Área restrita</div>' +
      '<div class="corpo centro">' +
      '<p style="font-size:15px">Você precisa estar conectado para ver o seu perfil.</p>' +
      '<p>' +
      '<a class="botao botao-grande" href="login.html">🔑 Entrar</a> &nbsp; ' +
      '<a class="botao botao-grande" href="cadastro.html">📝 Criar uma conta</a>' +
      '</p>' +
      '</div>' +
      '</div>';
  }

  window.abrirModalFoto = async function () {
    try {
      const pfps = await API.listPfps();

      if (!pfps || pfps.length === 0) {
        alert("Nenhuma imagem disponível no momento.");
        return;
      }

      let html = '<div id="modal-foto-overlay" style="position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.7);z-index:9999;display:flex;align-items:center;justify-content:center;">' +
          '<div class="caixa" style="max-width:500px;width:90%;background:#fff;padding:20px;">' +
          '<div class="titulo">Escolha sua nova foto</div>' +
          '<div class="corpo" style="display:flex;flex-wrap:wrap;gap:15px;justify-content:center;max-height:60vh;overflow-y:auto;padding:15px 0;">';

      pfps.forEach(link => {
        const linkLimpo = link.replace(/^"|"$/g, '');
        html += '<img src="' + linkLimpo + '" ' +
            'data-link="' + linkLimpo + '" ' +
            'style="width:80px;height:80px;border-radius:50%;cursor:pointer;border:3px solid transparent;transition:transform 0.2s" ' +
            'onmouseover="this.style.borderColor=\'#0056b3\';this.style.transform=\'scale(1.1)\'" ' +
            'onmouseout="this.style.borderColor=\'transparent\';this.style.transform=\'scale(1)\'" ' +
            'onclick="window.salvarFoto(this)">';
      });

      html += '</div>' +
          '<div style="text-align:center;margin-top:15px;">' +
          '<button type="button" onclick="document.getElementById(\'modal-foto-overlay\').remove()" style="background:#dc3545">Cancelar</button>' +
          '</div>' +
          '</div></div>';

      document.body.insertAdjacentHTML('beforeend', html);
    } catch (e) {
      alert("Erro ao carregar fotos: " + e.message);
    }
  };

  window.salvarFoto = async function (imgElement) {
    let link = imgElement.dataset.link;
    link = link.replace(/^"|"$/g, '');

    if (!link || link.trim() === '') {
      alert("Erro: link da imagem inválido.");
      return;
    }

    imgElement.style.opacity = '0.5';
    try {
      await API.changePfp(link);
      window.location.reload();
    } catch (e) {
      alert("Erro ao alterar foto: " + e.message);
      imgElement.style.opacity = '1';
    }
  };
})();
