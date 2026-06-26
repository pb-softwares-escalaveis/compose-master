# O Leiloeiro Online — Frontend

Frontend estático (HTML + CSS + JavaScript puro, sem build) com visual
retrô dos anos 2000 para o backend de leilões. Conversa com o **API Gateway**
em `http://localhost:9999`.

## Como rodar

O frontend precisa ser servido em **`http://localhost:3000`**, porque esse é
um dos *Redirect URIs* permitidos no realm do Keycloak (`leilao-service`) e nas
configurações de CORS/logout do gateway. Abrir os arquivos com `file://` **não
funciona** para o login.

Suba o backend (compose) e, na pasta `frontend/`, rode qualquer servidor
estático na porta 3000. Exemplos:

```bash
# Python 3
python -m http.server 3000

# Node (npx)
npx serve -l 3000
# ou
npx http-server -p 3000
```

Depois acesse: <http://localhost:3000/index.html>

## Páginas

| Arquivo          | Descrição                                                        |
|------------------|------------------------------------------------------------------|
| `index.html`     | Início — últimos lotes (`/listings/auctions/latest`) + espaço para recomendações |
| `busca.html`     | Busca com todos os filtros do `listing-service` (q, categoria, faixa de preço, "encerrando em 24h", ordenação, paginação) e autocomplete |
| `lote.html?id=`  | Página do lote: dados do leilão, vendedor, perguntas e lances    |
| `perfil.html`    | Perfil do usuário logado ou de um vendedor (`?id=<uuid>`)         |
| `cadastro.html`  | Cadastro multi-etapas (`POST /usuarios/novo`)                    |
| `login.html`     | Inicia o login OAuth2/Keycloak via gateway                       |

## Arquivos JS

- `js/config.js` — URLs base, categorias, status e ordenações.
- `js/api.js` — camada de acesso à API (todas as chamadas usam `credentials: "include"`).
- `js/auth.js` — estado de sessão no navegador e login/logout.
- `js/ui.js` — cabeçalho, menu, rodapé e helpers de formatação.
- `js/home.js`, `js/busca.js`, `js/lote.js`, `js/perfil.js`, `js/cadastro.js` — lógica de cada página.

## Endpoints usados (via gateway)

- `GET /listings/auctions/latest` — home.
- `GET /listings/auctions/search` — busca (`q, category, minPrice, maxPrice, endingSoon, page, size, sortBy, sortDir`).
- `GET /listings/auctions/search/autocomplete?q=` — sugestões.
- `GET /auctions/{auctionId}` — detalhe do lote.
- `POST /auctions/{auctionId}/bids/place` — dar lance (autenticado).
- `GET /usuarios/{id}/perfil` e `GET /usuarios/{id}/seller-info` — perfil/vendedor.
- `POST /usuarios/novo` — cadastro.
- `GET /usuarios/listar-usernames?nome=` — sugestões de usuário no cadastro.
- `GET /api/qa/auctions/{auctionId}/questions` e `POST` — perguntas (autenticado para enviar).
- `GET /recommendations` — tentado na home (recurso futuro; ignora erro).

## Decisões e limitações importantes

1. **Login Keycloak (com redirects).** O login não é feito por JS: o botão
   redireciona para `http://localhost:9999/oauth2/authorization/keycloak`, o
   gateway leva ao Keycloak e devolve o navegador ao site. A sessão fica num
   cookie httpOnly do gateway, então as chamadas autenticadas usam
   `credentials: "include"` e o gateway repassa o token (token relay).

2. **Não existe endpoint "quem sou eu" (`/me`).** O backend busca perfis por
   UUID (`/usuarios/{id}/perfil`). Como o JS não lê o cookie de sessão, o
   front guarda no `localStorage` o `userId` (UUID) e o `username` quando os
   conhece — hoje isso acontece **após o cadastro**. Por isso, a barra superior
   só mostra "Olá, fulano" depois de um cadastro neste navegador, ou quando se
   informa um UUID manualmente na página de perfil. Se o backend passar a
   expor um endpoint de identidade, basta preenchê-lo em `auth.js`.

3. **Contrato do `auction-service` não está no repositório.** A página do lote
   (`lote.js`) renderiza de forma **defensiva**: tenta vários nomes de campo
   comuns (`title`/`titulo`, `currentBidPrice`/`currentBid`, `sellerId`/`vendedorId`,
   `bids`/`lances`, etc.). Se o JSON real do `/auctions/{id}` usar outros nomes,
   ajuste as listas na função `pega(...)` em `js/lote.js`. O mesmo vale para o
   corpo do lance e das perguntas (enviamos chaves alternativas).

4. **CORS.** O gateway permite `credentials: true`. Navegadores não aceitam
   credenciais com `Access-Control-Allow-Origin: *`; servir o front em
   `http://localhost:3000` (origem prevista no realm) evita esse problema.

5. **Imagens retrô.** Há um `img/sem-imagem.svg` de placeholder. Os GIFs de
   "em construção"/contador são simulados com emojis e CSS para não depender de
   binários externos.

> O backend (`../backend`) não é alterado por este frontend.
