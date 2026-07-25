/* ============================================================
   Funções utilitárias de interface e chrome compartilhado
   (cabeçalho, menu e rodapé injetados em todas as páginas).
   ============================================================ */
(function () {
  const C = window.CONFIG;

  function esc(s) {
    if (s === null || s === undefined) return "";
    return String(s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }

  function dinheiro(v) {
    if (v === null || v === undefined || v === "") return "—";
    const n = Number(v);
    if (isNaN(n)) return esc(v);
    return "R$ " + n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function data(v) {
    if (!v) return "—";
    const d = new Date(v);
    if (isNaN(d.getTime())) return esc(v);
    return d.toLocaleString("pt-BR");
  }

  // Quanto falta até a data (ex.: "faltam 3 dias").
  function tempoRestante(v) {
    if (!v) return "";
    const d = new Date(v);
    if (isNaN(d.getTime())) return "";
    const diff = d.getTime() - Date.now();
    if (diff <= 0) return "encerrado";
    const dias = Math.floor(diff / 86400000);
    const horas = Math.floor((diff % 86400000) / 3600000);
    const min = Math.floor((diff % 3600000) / 60000);
    if (dias > 0) return "faltam " + dias + " dia(s) e " + horas + "h";
    if (horas > 0) return "faltam " + horas + "h " + min + "min";
    return "faltam " + min + " minuto(s)";
  }

  function categoria(c) { return (C.CATEGORIAS[c]) || c || "—"; }
  function status(s) { return (C.STATUS[s]) || s || "—"; }

  // Card de um lote, usado na home e na busca.
  function cartaoLote(lote) {
    const id = lote.id;
    const img = lote.mainImageUrl
      ? '<img src="' + esc(lote.mainImageUrl) + '" alt="' + esc(lote.title) + '" onerror="this.src=\'img/sem-imagem.svg\'">'
      : '<img src="img/sem-imagem.svg" alt="sem imagem">';
    return '' +
      '<div class="cartao-lote">' +
      '<a href="lote.html?id=' + encodeURIComponent(id) + '">' + img + '</a>' +
      '<div class="titulo-lote">' + esc(lote.title) + '</div>' +
      '<div class="categoria">' + esc(categoria(lote.category)) + '</div>' +
      '<div class="preco">' + dinheiro(lote.currentBidPrice) + '</div>' +
      (lote.expirationDate ? '<div class="dica">' + esc(tempoRestante(lote.expirationDate)) + '</div>' : '') +
      '<a class="botao" href="lote.html?id=' + encodeURIComponent(id) + '">Ver lote &raquo;</a>' +
      '</div>';
  }

  // Injeta cabeçalho + menu num elemento #topo.
  function montarTopo(paginaAtual) {
    const el = document.getElementById("topo");
    if (!el) return;
    const u = window.AUTH.getUsuario();
    const saudacao = (u && u.username)
      ? 'Olá, <b>' + esc(u.username) + '</b>! | <a href="perfil.html" style="color: white;">Meu Perfil</a> | <a href="#" onclick="AUTH.logout();return false;" style="color: white;">Sair</a>'
      : '<a href="login.html" style="color: white;">Entrar</a> | <a href="cadastro.html" style="color: white;">Cadastrar</a>';

    el.innerHTML = '' +
      '<div class="cabecalho">' +
      '<div style="float:right;font-size:11px;color:#fff;margin-top:6px">' + saudacao + '</div>' +
      '<h1><span class="logo-martelo">🔨</span> O Leiloeiro Online</h1>' +
      '<div class="slogan">~ O maior portal de leilões da internet brasileira desde 2001 ~</div>' +
      '</div>' +
      '<marquee class="faixa-rolante" scrollamount="5">' +
      '★ BEM-VINDO AO O LEILOEIRO ONLINE ★ Dê seu lance e arremate as melhores ofertas! ' +
      '★ Frete grátis em itens selecionados ★ Cadastre-se e ganhe ofertas exclusivas ★' +
      '</marquee>' +
      '<div class="menu">' +
      link("index.html", "🏠 Início", paginaAtual) +
      link("busca.html", "🔍 Buscar Lotes", paginaAtual) +
      link("criar-anuncio.html", "➕ Criar Anúncio", paginaAtual) +
      link("perfil.html", "👤 Meu Perfil", paginaAtual) +
      (u && u.username ? "" : link("cadastro.html", "📝 Cadastre-se", paginaAtual)) +
      (u && u.username ? "" : link("login.html", "🔑 Entrar", paginaAtual)) +
      '</div>';
  }

  function link(href, texto, atual) {
    const ativo = (href === atual) ? ' style="background:linear-gradient(180deg,#ffff80,#ffd000);color:#ff0000"' : '';
    return '<a href="' + href + '"' + ativo + '>' + texto + '</a>';
  }

  function montarRodape() {
    const el = document.getElementById("rodape");
    if (!el) return;
    el.innerHTML = '' +
      '<div class="rodape">' +
      '🚧 ' +
      'Você é o visitante número <span class="contador-visitas" id="contador-visitas">...</span> 🚧<br>' +
      '© 2001-2026 O Leiloeiro Online — Melhor visualizado em 800x600 com Internet Explorer 6.0<br>' +
      'Sede: Abraham de Veerstraat 9, Willemstad, Curaçao - Registration No. 149201<br>' +
      '<a href="quem-somos.html">Quem Somos</a> | <a href="politica-privacidade.html">Política de Privacidade</a> | ' +
      '<a href="https://github.com/pb-softwares-escalaveis" target="_blank"><img src="https://img.icons8.com/?size=100&id=3R1xLIHPgzn5&format=png&color=000000" width="16" height="16" alt="GitHub" border="0" align="absmiddle"> Código Fonte (GitHub)</a> | <a href="#topo">Voltar ao topo ↑</a>' +
      '</div>';

    // Contador de visitas universal via CountAPI
    // Usa sessionStorage para evitar contar o mesmo usuário várias vezes na mesma sessão
    var jaContou = sessionStorage.getItem("visitaContada");
    var endpoint = jaContou
      ? "https://countapi.mileshilliard.com/api/v1/get/oleiloeiroonline_visitas"
      : "https://countapi.mileshilliard.com/api/v1/hit/oleiloeiroonline_visitas";

    function renderFlipDigits(text, animate) {
      var padded = String(text).padStart(10, "0");
      var container = document.getElementById("contador-visitas");
      var oldDigits = container ? container.querySelectorAll(".flip-digit") : [];
      var html = "";
      for (var i = 0; i < padded.length; i++) {
        var ch = padded[i];
        var changed = animate && oldDigits.length === padded.length && oldDigits[i].textContent !== ch;
        html += '<span class="flip-digit' + (changed ? ' flip-anim' : '') + '">' + ch + '</span>';
      }
      return html;
    }

    // Primeira chamada: hit ou get dependendo da sessão
    fetch(endpoint)
      .then(function (r) { return r.json(); })
      .then(function (data) {
        var el = document.getElementById("contador-visitas");
        if (el && data.value) el.innerHTML = renderFlipDigits(data.value, false);
        if (!jaContou) sessionStorage.setItem("visitaContada", "1");
      })
      .catch(function () { /* mantém "..." se offline */ });

    // Polling a cada 5 segundos (somente leitura)
    setInterval(function () {
      fetch("https://countapi.mileshilliard.com/api/v1/get/oleiloeiroonline_visitas")
        .then(function (r) { return r.json(); })
        .then(function (data) {
          var el = document.getElementById("contador-visitas");
          if (el && data.value) el.innerHTML = renderFlipDigits(data.value, true);
        })
        .catch(function () { });
    }, 5000);
  }

  // Renderiza o chrome completo da página.
  function iniciarPagina(paginaAtual) {
    montarTopo(paginaAtual);
    montarRodape();

    // Favicon com martelo sombreado
    const favicon = document.createElement("link");
    favicon.rel = "icon";
    favicon.href = "data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2280%22 filter=%22drop-shadow(3px 3px 5px rgba(0,0,0,0.7))%22>🔨</text></svg>";
    document.head.appendChild(favicon);

    // Efeito de marquee no título simulando páginas antigas
    let tituloOriginal = document.title || "O Leiloeiro Online - Leilões na Internet";
    let tituloText = " 🔨 " + tituloOriginal + " *** ";
    setInterval(function () {
      tituloText = tituloText.substring(1) + tituloText.charAt(0);
      document.title = tituloText;
    }, 250);
  }

  window.UI = {
    esc: esc, dinheiro: dinheiro, data: data, tempoRestante: tempoRestante,
    categoria: categoria, status: status, cartaoLote: cartaoLote,
    iniciarPagina: iniciarPagina
  };
})();
