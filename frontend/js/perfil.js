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

      renderizar(uuid, perfil, seller, payments, me);
    } catch (e) {
      root.innerHTML = '<div class="caixa"><div class="titulo">Meu Perfil</div>' +
        '<div class="corpo mensagem-erro">Não foi possível carregar este perfil: ' +
        UI.esc(e.message) + '</div></div>';
    }
  }

  function renderizar(uuid, perfil, seller, payments, me) {
    const nomeCompleto = seller ? [seller.nome, seller.sobrenome].filter(Boolean).join(" ") : "";
    const local = seller ? [seller.cidade, seller.estado, seller.pais].filter(Boolean).join(", ") : "";

    let foto = perfil.profilePicture || (seller && seller.fotoPerfil) || "";
    foto = foto.replace(/^"|"$/g, ''); 

    const nota = (perfil.reputacao !== undefined && perfil.reputacao !== null)
        ? perfil.reputacao
        : (seller ? seller.nota : null);

    const email = me ? (me.email || me.emailAddress) : null;
    const cpf = me ? (me.cpf || me.document) : null;

    let html = '' +
        '<table class="layout"><tbody><tr>' +
        '<td class="coluna-lateral">' +
        '<div class="caixa"><div class="titulo">👤 Meu Perfil</div>' +
        '<div class="corpo centro">' +
        (foto ? '<img src="' + foto + '" style="width:100px;height:100px;border-radius:50%;border:3px outset #fff" onerror="this.src=\'img/sem-imagem.svg\'">'
            : '<img src="img/sem-imagem.svg" style="width:100px;height:100px">') +
        '<div style="font-size:16px;font-weight:bold;margin-top:6px">' + UI.esc(perfil.username || "—") + '</div>' +
        (nota !== null && nota !== undefined ? '<div>Reputação: ⭐ ' + UI.esc(nota) + '</div>' : '') +
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
        (email ? linha("E-mail", UI.esc(email)) : "") +
        (cpf ? linha("CPF", UI.esc(cpf)) : "") +
        (nomeCompleto ? linha("Nome", UI.esc(nomeCompleto)) : "") +
        (local ? linha("Localização", UI.esc(local)) : "") +
        linha("Código (UUID)", '<span class="dica">' + UI.esc(uuid) + '</span>') +
        '</table>' +
        '<p class="dica">Estas informações sensíveis não são exibidas publicamente para outros usuários.</p>' +
        '</div></div>';

    html += '<div class="caixa" style="margin-top:15px"><div class="titulo">💳 Meus Pagamentos</div><div class="corpo">';
    if (!payments || payments.length === 0) {
      html += '<span class="dica">Nenhum pagamento encontrado.</span>';
    } else {
      html += '<table class="tabela-dados" style="width: 100%; text-align: left;">' +
              '<tr><th>ID</th><th>Lote</th><th>Valor</th><th>Status</th><th>Ação</th></tr>';
      payments.forEach(function(p) {
        const statusStr = UI.esc(p.status);
        let acaoHtml = "-";
        if ((p.status === "PENDING" || p.status === "WAITING_PAYMENT") && p.id) {
          acaoHtml = '<button type="button" class="btn-simular-pgto" data-pid="' + UI.esc(p.id) + '" style="font-size:0.8em; padding: 3px 8px; cursor: pointer;">Pagar (Simular)</button>';
        }
        let idStr = p.id ? String(p.id).substring(0, 8) + "..." : "N/A";
        let valorNum = p.amountInCents ? (p.amountInCents / 100) : 0;
        
        html += '<tr>' +
                '<td><span title="' + UI.esc(p.id) + '" style="cursor:help;">' + UI.esc(idStr) + '</span></td>' +
                '<td>' + UI.esc(p.auctionId) + '</td>' +
                '<td>' + UI.dinheiro(valorNum) + '</td>' +
                '<td>' + statusStr + '</td>' +
                '<td>' + acaoHtml + '</td>' +
                '</tr>';
      });
      html += '</table><div id="msg-pgto" style="margin-top:10px;"></div>';
    }
    html += '</div></div>';
    html += '</td></tr></tbody></table>';
    root.innerHTML = html;
    
    ligarPagamentos();
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
