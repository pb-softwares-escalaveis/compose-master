/* ============================================================
   Lógica da página de busca
   Espelha os parâmetros aceitos pelo /listings/auctions/search:
   q, category, minPrice, maxPrice, endingSoon, page, size, sortBy, sortDir
   ============================================================ */
(async function () {
  await window.AUTH.init();
  UI.iniciarPagina("busca.html");

  const form = document.getElementById("form-busca");
  const elResultados = document.getElementById("resultados");
  const elResumo = document.getElementById("resumo");
  const elPagTopo = document.getElementById("paginacao-topo");
  const elPagBase = document.getElementById("paginacao-base");
  const elSugestoes = document.getElementById("sugestoes");

  let paginaAtual = 0;

  // ---- Preenche os selects de categoria e ordenação ----
  (function preencherSelects() {
    const cat = document.getElementById("category");
    cat.innerHTML = '<option value="">Todas as categorias</option>';
    const cats = window.CONFIG.CATEGORIAS;
    Object.keys(cats).forEach(function (k) {
      cat.innerHTML += '<option value="' + k + '">' + UI.esc(cats[k]) + '</option>';
    });

    const ord = document.getElementById("sortBy");
    const ords = window.CONFIG.ORDENACAO;
    Object.keys(ords).forEach(function (k) {
      ord.innerHTML += '<option value="' + k + '">' + UI.esc(ords[k]) + '</option>';
    });
  })();

  // ---- Lê o estado do formulário ----
  function lerParametros() {
    return {
      q: document.getElementById("q").value.trim(),
      category: document.getElementById("category").value,
      minPrice: document.getElementById("minPrice").value,
      maxPrice: document.getElementById("maxPrice").value,
      endingSoon: document.getElementById("endingSoon").checked ? "true" : "",
      sortBy: document.getElementById("sortBy").value,
      sortDir: document.getElementById("sortDir").value,
      size: document.getElementById("size").value
    };
  }

  // ---- Aplica parâmetros vindos da URL (links externos) ----
  function aplicarUrl() {
    const sp = new URLSearchParams(window.location.search);
    if (sp.get("q")) document.getElementById("q").value = sp.get("q");
    if (sp.get("category")) document.getElementById("category").value = sp.get("category");
    if (sp.get("minPrice")) document.getElementById("minPrice").value = sp.get("minPrice");
    if (sp.get("maxPrice")) document.getElementById("maxPrice").value = sp.get("maxPrice");
    if (sp.get("endingSoon") === "true") document.getElementById("endingSoon").checked = true;
    if (sp.get("sortBy")) document.getElementById("sortBy").value = sp.get("sortBy");
    if (sp.get("sortDir")) document.getElementById("sortDir").value = sp.get("sortDir");
    // Dispara a busca se algum parâmetro estiver presente.
    if ([...sp.keys()].length) buscar(0);
  }

  // ---- Executa a busca ----
  async function buscar(pagina) {
    paginaAtual = pagina || 0;
    const params = lerParametros();
    params.page = paginaAtual;

    elResultados.innerHTML = '<span class="carregando">Buscando lotes...</span>';
    elResumo.textContent = "";
    elPagTopo.innerHTML = elPagBase.innerHTML = "";

    try {
      const resp = await API.search(params);
      const itens = (resp && resp.content) || [];
      const total = (resp && resp.totalElements) || 0;
      const totalPaginas = (resp && resp.totalPages) || 0;

      if (!itens.length) {
        elResultados.innerHTML = '<span class="dica">Nenhum lote encontrado com esses filtros. Tente ampliar a busca.</span>';
        elResumo.textContent = "0 resultado(s).";
        return;
      }

      elResumo.innerHTML = "Encontrado(s) <b>" + total + "</b> lote(s). Página " +
        (paginaAtual + 1) + " de " + totalPaginas + ".";
      elResultados.innerHTML = itens.map(UI.cartaoLote).join("");
      const pag = montarPaginacao(paginaAtual, totalPaginas);
      elPagTopo.innerHTML = elPagBase.innerHTML = pag;
    } catch (e) {
      elResultados.innerHTML = '<span class="mensagem-erro">Erro na busca: ' + UI.esc(e.message) + '</span>';
    }
  }

  function montarPaginacao(atual, total) {
    if (total <= 1) return "";
    let html = "";
    html += atual > 0
      ? '<button type="button" data-pag="' + (atual - 1) + '">&laquo; Anterior</button>'
      : '<button type="button" disabled>&laquo; Anterior</button>';
    html += '<span>' + (atual + 1) + ' / ' + total + '</span>';
    html += atual < total - 1
      ? '<button type="button" data-pag="' + (atual + 1) + '">Próxima &raquo;</button>'
      : '<button type="button" disabled>Próxima &raquo;</button>';
    return html;
  }

  // ---- Autocomplete da palavra-chave ----
  let timer = null;
  document.getElementById("q").addEventListener("input", function () {
    const q = this.value.trim();
    clearTimeout(timer);
    if (q.length < 2) { elSugestoes.innerHTML = ""; return; }
    timer = setTimeout(async function () {
      try {
        const lista = await API.autocomplete(q);
        if (!Array.isArray(lista) || !lista.length) { elSugestoes.innerHTML = ""; return; }
        const itensHtml = lista.slice(0, 8).map(function (s) {
          return '<div class="sugestao" data-id="' + UI.esc(s.id) + '" ' +
            'style="padding:3px;cursor:pointer;border-bottom:1px solid #ccc">' +
            UI.esc(s.title) + '</div>';
        }).join("");
        elSugestoes.innerHTML =
          '<div style="position:absolute;z-index:10;background:#fff;border:2px solid #000080;width:100%">' +
          itensHtml + '</div>';
      } catch (_) { elSugestoes.innerHTML = ""; }
    }, 250);
  });

  // Clicar numa sugestão leva direto ao lote.
  elSugestoes.addEventListener("click", function (ev) {
    const alvo = ev.target.closest(".sugestao");
    if (alvo) window.location.href = "lote.html?id=" + encodeURIComponent(alvo.getAttribute("data-id"));
  });
  document.addEventListener("click", function (ev) {
    if (!elSugestoes.contains(ev.target) && ev.target.id !== "q") elSugestoes.innerHTML = "";
  });

  // ---- Eventos ----
  form.addEventListener("submit", function (ev) { ev.preventDefault(); buscar(0); });
  document.getElementById("btn-limpar").addEventListener("click", function () {
    form.reset();
    elResultados.innerHTML = '<span class="dica">Use os filtros ao lado e clique em "Buscar".</span>';
    elResumo.textContent = "";
    elPagTopo.innerHTML = elPagBase.innerHTML = "";
  });
  [elPagTopo, elPagBase].forEach(function (el) {
    el.addEventListener("click", function (ev) {
      const b = ev.target.closest("button[data-pag]");
      if (b) { buscar(Number(b.getAttribute("data-pag"))); window.scrollTo(0, 0); }
    });
  });

  aplicarUrl();
})();
