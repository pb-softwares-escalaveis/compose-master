/* ============================================================
   Lógica da página de perfil

   Como o backend não tem endpoint "/me", o perfil é exibido a partir
   de um UUID:
   - ?id=<uuid> na URL (ex.: ao ver o perfil de um vendedor), OU
   - o UUID guardado localmente após o cadastro / login.

   Se o usuário não estiver identificado, mostramos a tela de
   "entre ou cadastre-se".
   ============================================================ */
(async function () {
  await window.AUTH.init();
  UI.iniciarPagina("perfil.html");

  const root = document.getElementById("conteudo-perfil");
  const params = new URLSearchParams(window.location.search);
  const usuarioLocal = AUTH.getUsuario();

  // Prioriza o id da URL; senão usa o do usuário identificado.
  const id = params.get("id") || (usuarioLocal && usuarioLocal.userId);
  const ehProprioPerfil = !params.get("id") && AUTH.estaIdentificado();

  if (!id) {
    mostrarConvite();
    return;
  }

  carregar(id);

  async function carregar(uuid) {
    try {
      // Perfil público (username, foto, reputação).
      const perfil = await API.profile(uuid);
      // seller-info traz nome completo e localização (também público).
      let seller = null;
      try { seller = await API.sellerInfo(uuid); } catch (_) { /* opcional */ }
      renderizar(uuid, perfil, seller);
    } catch (e) {
      root.innerHTML = '<div class="caixa"><div class="titulo">Perfil</div>' +
        '<div class="corpo mensagem-erro">Não foi possível carregar este perfil: ' +
        UI.esc(e.message) + '</div></div>';
    }
  }

  function renderizar(uuid, perfil, seller) {
    const nomeCompleto = seller ? [seller.nome, seller.sobrenome].filter(Boolean).join(" ") : "";
    const local = seller ? [seller.cidade, seller.estado, seller.pais].filter(Boolean).join(", ") : "";

    // 🔥 LIMPA O LINK DA FOTO (remove aspas)
    let foto = perfil.profilePicture || (seller && seller.fotoPerfil) || "";
    foto = foto.replace(/^"|"$/g, '');  // Remove aspas do início e fim

    const nota = (perfil.reputacao !== undefined && perfil.reputacao !== null)
        ? perfil.reputacao
        : (seller ? seller.nota : null);

    root.innerHTML = '' +
        '<table class="layout"><tbody><tr>' +
        '<td class="coluna-lateral">' +
        '<div class="caixa"><div class="titulo">' + (ehProprioPerfil ? '👤 Meu Perfil' : '👤 Perfil') + '</div>' +
        '<div class="corpo centro">' +
        (foto ? '<img src="' + foto + '" style="width:100px;height:100px;border-radius:50%;border:3px outset #fff" onerror="this.src=\'img/sem-imagem.svg\'">'
            : '<img src="img/sem-imagem.svg" style="width:100px;height:100px">') +
        '<div style="font-size:16px;font-weight:bold;margin-top:6px">' + UI.esc(perfil.username || "—") + '</div>' +
        (nota !== null && nota !== undefined ? '<div>Reputação: ⭐ ' + UI.esc(nota) + '</div>' : '') +
        '</div>' +
        '</div>' +
        (ehProprioPerfil ? '<div class="caixa"><div class="titulo">⚙️ Conta</div><div class="corpo">' +
            '<button type="button" onclick="window.abrirModalFoto()" style="width:100%;margin-bottom:8px">📷 Trocar foto de perfil</button>' +
            '<button type="button" onclick="AUTH.logout()" style="width:100%">Sair (logout)</button>' +
            '</div></div>' : '') +
        '</td>' +

        '<td class="conteudo">' +
        '<div class="caixa"><div class="titulo">📇 Dados</div><div class="corpo">' +
        '<table class="tabela-dados">' +
        linha("Usuário", UI.esc(perfil.username)) +
        (nomeCompleto ? linha("Nome", UI.esc(nomeCompleto)) : "") +
        (local ? linha("Localização", UI.esc(local)) : "") +
        (nota !== null && nota !== undefined ? linha("Reputação", "⭐ " + UI.esc(nota)) : "") +
        linha("Código (UUID)", '<span class="dica">' + UI.esc(uuid) + '</span>') +
        '</table>' +
        (ehProprioPerfil ? '<p class="dica">Para alterar dados sensíveis (e-mail, telefone, endereço) ' +
            'utilize as opções da sua conta. Estas informações privadas não são exibidas publicamente.</p>' : '') +
        '</div></div>' +

        '</td>' +
        '</tr></tbody></table>';
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

  // 🔥 FUNÇÃO 1: Abrir modal com as fotos disponíveis
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
        // 🔥 Remove QUAISQUER aspas extras do link
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

// 🔥 FUNÇÃO 2: Salvar a foto selecionada
  window.salvarFoto = async function (imgElement) {
    // 🔥 Pega o link do atributo data-link
    let link = imgElement.dataset.link;

    // 🔥 Remove aspas extras
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
