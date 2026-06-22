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
      ? 'Olá, <b>' + esc(u.username) + '</b>! | <a href="perfil.html">Meu Perfil</a> | <a href="#" onclick="AUTH.logout();return false;">Sair</a>'
      : '<a href="login.html">Entrar</a> | <a href="cadastro.html">Cadastrar</a>';

    el.innerHTML = '' +
      '<div class="cabecalho">' +
        '<div style="float:right;font-size:11px;color:#fff;margin-top:6px">' + saudacao + '</div>' +
        '<h1><span class="logo-martelo">🔨</span> O Leiloeiro Online</h1>' +
        '<div class="slogan">~ O maior portal de leilões da internet brasileira desde 2001 ~</div>' +
      '</div>' +
      '<marquee class="faixa-rolante" scrollamount="5">' +
        '★ BEM-VINDO AO OLEILOEIRO ONLINE ★ Dê seu lance e arremate as melhores ofertas! ' +
        '★ Frete grátis em itens selecionados ★ Cadastre-se e ganhe ofertas exclusivas ★' +
      '</marquee>' +
      '<div class="menu">' +
        link("index.html", "🏠 Início", paginaAtual) +
        link("busca.html", "🔍 Buscar Lotes", paginaAtual) +
        link("criar-anuncio.html", "➕ Criar Anúncio", paginaAtual) +
        link("perfil.html", "👤 Meu Perfil", paginaAtual) +
        link("cadastro.html", "📝 Cadastre-se", paginaAtual) +
        link("login.html", "🔑 Entrar", paginaAtual) +
      '</div>';
  }

  function link(href, texto, atual) {
    const ativo = (href === atual) ? ' style="background:linear-gradient(180deg,#ffff80,#ffd000);color:#ff0000"' : '';
    return '<a href="' + href + '"' + ativo + '>' + texto + '</a>';
  }

  function montarRodape() {
    const el = document.getElementById("rodape");
    if (!el) return;
    const visitas = 1000000 + Math.floor((Date.now() / 1000) % 99999);
    el.innerHTML = '' +
      '<div class="rodape">' +
        '🚧 ' +
        'Você é o visitante número <span class="contador-visitas">' + visitas + '</span> 🚧<br>' +
        '© 2001-2026 Oleiloeiro Online — Melhor visualizado em 800x600 com Internet Explorer 6.0<br>' +
        '<a href="#">Quem Somos</a> | <a href="#">Fale Conosco</a> | <a href="#">Política de Privacidade</a> | ' +
        '<a href="#">Ajuda</a> | <a href="#topo">Voltar ao topo ↑</a>' +
      '</div>';
  }

  // Renderiza o chrome completo da página.
  function iniciarPagina(paginaAtual) {
    montarTopo(paginaAtual);
    montarRodape();
  }

  window.UI = {
    esc: esc, dinheiro: dinheiro, data: data, tempoRestante: tempoRestante,
    categoria: categoria, status: status, cartaoLote: cartaoLote,
    iniciarPagina: iniciarPagina
  };
})();
