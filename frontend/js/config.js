/* ============================================================
   Configuração global do O Leiloeiro Online
   ============================================================ */
window.CONFIG = {
  // Todas as chamadas passam pelo API Gateway.
  API_BASE: "http://oleiloeiroonline.top:9999",

  // Login é feito pelo Keycloak via OAuth2 do gateway.
  // O Spring Security inicia o fluxo nesta rota e redireciona para o Keycloak.
  LOGIN_URL: "http://oleiloeiroonline.top:9999/oauth2/authorization/keycloak",
  LOGOUT_URL: "http://oleiloeiroonline.top:9999/logout",

  // Para onde o gateway deve devolver o navegador após o login.
  // (precisa estar entre os Redirect URIs permitidos no realm do Keycloak)
  FRONTEND_BASE: "http://oleiloeiroonline.top",

  // Categorias aceitas pelo listing-service (enum AuctionLotCategory).
  CATEGORIAS: {
    ELECTRONICS: "Eletrônicos",
    VEHICLES: "Veículos",
    FASHION: "Moda",
    COLLECTIBLES_AND_ART: "Colecionáveis e Arte",
    SPORTS: "Esportes",
    HEALTH_AND_BEAUTY: "Saúde e Beleza",
    BOOKS: "Livros",
    MOVIE: "Filmes",
    INDUSTRIAL: "Industrial",
    JEWELRY: "Joias",
    PETS: "Animais",
    TOYS: "Brinquedos",
    HOME_AND_GARDEN: "Casa e Jardim",
    MUSIC: "Música",
    OTHER: "Outros"
  },

  // Status do leilão (enum AuctionStatus).
  STATUS: {
    PENDING_REVIEW: "Em análise",
    ACTIVE: "Ativo",
    EXPIRED: "Expirado",
    SOLD: "Vendido",
    REMOVED: "Removido",
    CANCELED: "Cancelado",
    REJECTED: "Rejeitado"
  },

  // Campos de ordenação aceitos pela busca.
  ORDENACAO: {
    _score: "Mais relevantes",
    created: "Mais recentes",
    price: "Preço",
    title: "Título",
    date: "Data de encerramento"
  }
};
