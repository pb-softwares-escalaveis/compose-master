(function () {
  const LINHAS_POR_PAGINA = 100;

  async function carregarPolitica() {
    try {
      const resposta = await fetch('shrek.txt');
      if (!resposta.ok) throw new Error('Não foi possível carregar o arquivo shrek.txt.');
      const texto = await resposta.text();
      
      const linhas = texto.split('\n');
      const totalPaginas = Math.ceil(linhas.length / LINHAS_POR_PAGINA);
      
      const params = new URLSearchParams(window.location.search);
      let paginaAtual = parseInt(params.get('page')) || 1;
      
      if (paginaAtual < 1) paginaAtual = 1;
      if (paginaAtual > totalPaginas) paginaAtual = totalPaginas;
      
      const inicio = (paginaAtual - 1) * LINHAS_POR_PAGINA;
      const fim = inicio + LINHAS_POR_PAGINA;
      const linhasPagina = linhas.slice(inicio, fim);
      
      document.getElementById('texto-politica').textContent = linhasPagina.join('\n');
      
      renderizarPaginacao(paginaAtual, totalPaginas);
    } catch (e) {
      document.getElementById('texto-politica').textContent = 'Erro ao carregar a Política de Privacidade: ' + e.message;
    }
  }

  function renderizarPaginacao(atual, total) {
    const container = document.getElementById('controles-paginacao');
    if (total <= 1) return;
    
    let html = '';
    
    if (atual > 1) {
      html += '<a href="?page=' + (atual - 1) + '">&laquo; Anterior</a> ';
    }
    
    let start = Math.max(1, atual - 3);
    let end = Math.min(total, atual + 3);
    
    if (start > 1) {
      html += '<a href="?page=1">1</a> ';
      if (start > 2) html += '... ';
    }
    
    for (let i = start; i <= end; i++) {
      if (i === atual) {
        html += '<b>[' + i + ']</b> ';
      } else {
        html += '<a href="?page=' + i + '">' + i + '</a> ';
      }
    }
    
    if (end < total) {
      if (end < total - 1) html += '... ';
      html += '<a href="?page=' + total + '">' + total + '</a> ';
    }
    
    if (atual < total) {
      html += '<a href="?page=' + (atual + 1) + '">Próxima &raquo;</a>';
    }
    
    container.innerHTML = html;
  }

  document.addEventListener('DOMContentLoaded', carregarPolitica);
})();
