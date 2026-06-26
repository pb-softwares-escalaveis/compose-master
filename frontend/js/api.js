/* ============================================================
   Camada de acesso à API (fetch contra o API Gateway)
   ============================================================ */
(function () {
  const BASE = window.CONFIG.API_BASE;

  // Faz uma requisição. Endpoints autenticados dependem da sessão do
  // gateway (login Keycloak), por isso usamos credentials: "include".
  async function request(path, opts = {}) {
    const url = BASE + path;
    const cfg = {
      method: opts.method || "GET",
      credentials: "include",
      headers: { Accept: "application/json", ...(opts.headers || {}) }
    };
    if (opts.body !== undefined) {
      if (opts.body instanceof FormData) {
        cfg.body = opts.body;
      } else {
        cfg.headers["Content-Type"] = "application/json";
        cfg.body = JSON.stringify(opts.body);
      }
    }

    let resp;
    try {
      resp = await fetch(url, cfg);
    } catch (e) {
      throw new ApiError(0, "Não foi possível conectar ao servidor. Verifique se o gateway está rodando em " + BASE + ".", null);
    }

    let dados = null;
    const texto = await resp.text();
    if (texto) {
      try { dados = JSON.parse(texto); } catch (_) { dados = texto; }
    }

    if (!resp.ok) {
      const msg = (dados && (dados.message || dados.error)) || ("Erro " + resp.status);
      throw new ApiError(resp.status, msg, dados);
    }
    return dados;
  }

  class ApiError extends Error {
    constructor(status, message, data) {
      super(message);
      this.status = status;
      this.data = data;
    }
  }

  // Monta query string ignorando valores vazios/nulos.
  function qs(params) {
    const sp = new URLSearchParams();
    Object.keys(params).forEach(function (k) {
      const v = params[k];
      if (v !== undefined && v !== null && v !== "") sp.append(k, v);
    });
    const s = sp.toString();
    return s ? "?" + s : "";
  }

  window.API = {
    ApiError: ApiError,

    // ---------- LISTING-SERVICE ----------
    latest: function (page, size) {
      return request("/listings/auctions/latest" + qs({ page: page, size: size }));
    },
    search: function (params) {
      return request("/listings/auctions/search" + qs(params));
    },
    autocomplete: function (q) {
      return request("/listings/auctions/search/autocomplete" + qs({ q: q }));
    },
    sellerListings: function (sellerId, page, size) {
      return request("/listings/auctions/search" + qs({ sellerId: sellerId, page: page, size: size }));
    },

    // ---------- RECOMMENDATION-SERVICE (futuro) ----------
    recommendations: function (params) {
      return request("/recommendations" + qs(params || {}));
    },

    // ---------- AUCTION-SERVICE ----------
    auction: function (auctionId) {
      return request("/auctions/" + encodeURIComponent(auctionId));
    },
    placeBid: function (auctionId, body) {
      return request("/auctions/" + encodeURIComponent(auctionId) + "/bids/place", { method: "POST", body: body });
    },
    createAuction: function (formData) {
      return request("/auctions/create", { method: "POST", body: formData });
    },

    // ---------- USER-SERVICE ----------
    createUser: function (body) {
      return request("/usuarios/novo", { method: "POST", body: body });
    },
    profile: function (id) {
      return request("/usuarios/" + encodeURIComponent(id) + "/perfil");
    },
    me: function () {
      return request("/usuarios/me?t=" + new Date().getTime());
    },
    sellerInfo: function (id) {
      return request("/usuarios/" + encodeURIComponent(id) + "/seller-info");
    },
    suggestUsernames: function (nome) {
      return request("/usuarios/listar-usernames" + qs({ nome: nome }));
    },
    listPfps: function () {
      return request("/usuarios/listar-pfps");
    },
    changePfp: function (linkFoto) {
      return request("/usuarios/trocar-pfp", { method: "PUT", body: linkFoto });
    },

    // ---------- QA-SERVICE ----------
    questions: function (auctionId) {
      return request("/api/qa/auctions/" + encodeURIComponent(auctionId) + "/questions");
    },
    askQuestion: function (auctionId, body) {
      return request("/api/qa/auctions/" + encodeURIComponent(auctionId) + "/questions", { method: "POST", body: body });
    },
    answerQuestion: function (questionId, body) {
      return request("/api/qa/questions/" + encodeURIComponent(questionId) + "/answers", { method: "POST", body: body });
    },

    // ---------- PAYMENT-SERVICE ----------
    getPayments: function (userId) {
      return request("/payments/bidder/" + encodeURIComponent(userId));
    },
    simulatePayment: function (providerPaymentId) {
      return request("/payments/simulate/" + encodeURIComponent(providerPaymentId), { method: "POST" });
    }
  };
})();
