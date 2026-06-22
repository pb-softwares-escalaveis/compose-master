/* ============================================================
   Lógica da página inicial
   ============================================================ */
(async function () {
  await window.AUTH.init();
  UI.iniciarPagina("index.html");

  // Lista de categorias na coluna lateral.
  (function listarCategorias() {
    const el = document.getElementById("lista-categorias");
    const cats = window.CONFIG.CATEGORIAS;
    let html = '<ul style="margin:0;padding-left:18px">';
    Object.keys(cats).forEach(function (chave) {
      html += '<li><a href="busca.html?category=' + encodeURIComponent(chave) + '">' +
        UI.esc(cats[chave]) + '</a></li>';
    });
    html += '</ul>';
    el.innerHTML = html;
  })();

  // Últimos lotes.
  (async function carregarUltimos() {
    const el = document.getElementById("ultimos-lotes");
    try {
      const pagina = await API.latest(0, 12);
      const itens = (pagina && pagina.content) || [];
      if (!itens.length) {
        el.innerHTML = '<span class="dica">Nenhum lote disponível no momento.</span>';
        return;
      }
      el.innerHTML = itens.map(UI.cartaoLote).join("");
    } catch (e) {
      el.innerHTML = '<span class="mensagem-erro">Não foi possível carregar os lotes: ' +
        UI.esc(e.message) + '</span>';
    }
  })();

  // Recomendados (recommendation-service ainda não tem contrato definido).
  // Tentamos chamar; se falhar, mantemos a mensagem padrão.
  (async function carregarRecomendados() {
    const el = document.getElementById("recomendados");
    try {
      const dados = await API.recommendations();
      const itens = Array.isArray(dados) ? dados : ((dados && dados.content) || []);
      if (itens.length) {
        el.innerHTML = itens.map(UI.cartaoLote).join("");
      }
    } catch (_) {
      /* silencioso: recurso futuro */
    }
  })();
})();
