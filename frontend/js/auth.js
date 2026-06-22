/* ============================================================
   Estado de "sessão" no lado do navegador.

   OBSERVAÇÃO IMPORTANTE sobre a arquitetura do backend:
   - O login é feito pelo Keycloak através do OAuth2 do API Gateway.
     A sessão fica num cookie do gateway (httpOnly) que o JavaScript
     NÃO consegue ler.
   - O backend não expõe um endpoint "/me" (quem sou eu). Os perfis são
     buscados por UUID em /usuarios/{id}/perfil.
   - Por isso, guardamos localmente (localStorage) o UUID e o username do
     usuário quando os conhecemos (após o cadastro ou após o usuário
     informar o próprio ID). Isso é apenas uma conveniência de front-end.
   ============================================================ */
(function () {
  let currentUser = null;
  let isInitialized = false;

  window.AUTH = {
    init: async function () {
      if (isInitialized) return;
      try {
        const me = await window.API.me();
        if (me && me.id && !me.userId) me.userId = me.id;
        currentUser = me;
      } catch (e) {
        currentUser = null;
      }
      isInitialized = true;
    },
    getUsuario: function () {
      return currentUser;
    },
    setUsuario: function (obj) {
      currentUser = obj;
    },
    limpar: function () {
      currentUser = null;
    },
    estaIdentificado: function () {
      return !!(currentUser && currentUser.userId);
    },
    // Inicia o fluxo de login no Keycloak (redireciona o navegador).
    login: function () {
      window.location.href = window.CONFIG.LOGIN_URL;
    },
    // Encerra a sessão no gateway/Keycloak e limpa o estado local.
    logout: function () {
      this.limpar();
      window.location.href = window.CONFIG.LOGOUT_URL;
    }
  };
})();
