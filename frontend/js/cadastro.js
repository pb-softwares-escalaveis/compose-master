/* ============================================================
   Cadastro multi-etapas.
   Monta um único payload para POST /usuarios/novo:
   { nome, sobrenome, email, cpf, dataNascimento, telefone,
     username, senha, enderecos: [ { pais, estado, cidade,
     bairro, rua, numero, complemento, cep } ] }
   ============================================================ */
(async function () {
  await window.AUTH.init();
  UI.iniciarPagina("cadastro.html");

  let passo = 1;
  const TOTAL = 4;

  const form = document.getElementById("form-cadastro");
  const btnVoltar = document.getElementById("btn-voltar");
  const btnAvancar = document.getElementById("btn-avancar");
  const btnFinalizar = document.getElementById("btn-finalizar");
  const msg = document.getElementById("msg-cadastro");

  function val(id) { return document.getElementById(id).value.trim(); }

  // ---- Validação por passo (retorna lista de erros) ----
  function validarPasso(p) {
    const erros = [];
    limparErros();
    if (p === 1) {
      if (val("nome").length < 2) erros.push(["nome", "Informe o nome (mín. 2 caracteres)."]);
      if (val("sobrenome").length < 2) erros.push(["sobrenome", "Informe o sobrenome (mín. 2 caracteres)."]);
      const cpf = soNumeros(val("cpf"));
      if (cpf.length !== 11) erros.push(["cpf", "O CPF deve ter 11 dígitos."]);
      const nasc = val("dataNascimento");
      if (!nasc) erros.push(["dataNascimento", "Informe a data de nascimento."]);
      else if (idade(nasc) < 18) erros.push(["dataNascimento", "É necessário ter pelo menos 18 anos."]);
      const tel = soNumeros(val("telefone"));
      if (tel.length < 10 || tel.length > 11) erros.push(["telefone", "Telefone deve ter 10 ou 11 dígitos."]);
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(val("email"))) erros.push(["email", "E-mail inválido."]);
    } else if (p === 2) {
      if (!/^\d{5}-?\d{3}$/.test(val("cep"))) erros.push(["cep", "CEP inválido (use 00000-000)."]);
      ["pais", "estado", "cidade", "bairro", "rua"].forEach(function (campo) {
        if (!val(campo)) erros.push([campo, "Campo obrigatório."]);
      });
    } else if (p === 3) {
      if (val("username").length < 4) erros.push(["username", "Usuário deve ter ao menos 4 caracteres."]);
      if (val("senha").length < 8) erros.push(["senha", "Senha deve ter ao menos 8 caracteres."]);
      if (val("senha") !== val("senha2")) erros.push(["senha2", "As senhas não conferem."]);
    }
    return erros;
  }

  function soNumeros(s) { return (s || "").replace(/\D/g, ""); }
  function idade(dataStr) {
    const d = new Date(dataStr);
    const hoje = new Date();
    let a = hoje.getFullYear() - d.getFullYear();
    const m = hoje.getMonth() - d.getMonth();
    if (m < 0 || (m === 0 && hoje.getDate() < d.getDate())) a--;
    return a;
  }

  function limparErros() {
    msg.innerHTML = "";
    document.querySelectorAll(".campo-erro").forEach(function (e) { e.classList.remove("campo-erro"); });
  }
  function mostrarErros(erros) {
    erros.forEach(function (par) {
      const el = document.getElementById(par[0]);
      if (el) el.classList.add("campo-erro");
    });
    msg.innerHTML = '<div class="mensagem-erro">⚠ ' + erros.map(function (e) { return UI.esc(e[1]); }).join("<br>") + '</div>';
  }

  // ---- Navegação ----
  function mostrarPasso(p) {
    document.querySelectorAll(".bloco-passo").forEach(function (bloco) {
      bloco.style.display = Number(bloco.getAttribute("data-passo")) === p ? "" : "none";
    });
    document.querySelectorAll(".passos .passo").forEach(function (ind) {
      const n = Number(ind.getAttribute("data-passo"));
      ind.classList.toggle("ativo", n === p);
      ind.classList.toggle("feito", n < p);
    });
    btnVoltar.style.display = p > 1 ? "" : "none";
    btnAvancar.style.display = p < TOTAL ? "" : "none";
    btnFinalizar.style.display = p === TOTAL ? "" : "none";
    if (p === TOTAL) montarResumo();
    window.scrollTo(0, 0);
  }

  btnAvancar.addEventListener("click", function () {
    const erros = validarPasso(passo);
    if (erros.length) { mostrarErros(erros); return; }
    limparErros();
    passo = Math.min(TOTAL, passo + 1);
    mostrarPasso(passo);
  });
  btnVoltar.addEventListener("click", function () {
    limparErros();
    passo = Math.max(1, passo - 1);
    mostrarPasso(passo);
  });

  // ---- Sugestão de usernames (usa /usuarios/listar-usernames?nome=) ----
  document.getElementById("nome").addEventListener("blur", sugerirUsernames);
  let sugTimer = null;
  function sugerirUsernames() {
    const nome = val("nome");
    if (!nome) return;
    clearTimeout(sugTimer);
    sugTimer = setTimeout(async function () {
      try {
        const lista = await API.suggestUsernames(nome);
        const box = document.getElementById("sugestoes-username");
        if (Array.isArray(lista) && lista.length) {
          box.innerHTML = "Sugestões: " + lista.slice(0, 5).map(function (u) {
            return '<a href="#" class="sug-user">' + UI.esc(u) + '</a>';
          }).join(" · ");
          box.querySelectorAll(".sug-user").forEach(function (a) {
            a.addEventListener("click", function (ev) {
              ev.preventDefault();
              document.getElementById("username").value = this.textContent;
            });
          });
        }
      } catch (_) { /* ignora */ }
    }, 300);
  }

  // ---- Busca de CEP ----
  document.getElementById("cep").addEventListener("blur", buscarCep);
  async function buscarCep() {
    const cep = soNumeros(val("cep"));
    if (cep.length !== 8) return;
    
    try {
      const resp = await fetch("https://viacep.com.br/ws/" + cep + "/json/");
      const data = await resp.json();
      if (!data.erro) {
        if (data.logradouro) document.getElementById("rua").value = data.logradouro;
        if (data.bairro) document.getElementById("bairro").value = data.bairro;
        if (data.localidade) document.getElementById("cidade").value = data.localidade;
        if (data.uf) document.getElementById("estado").value = data.uf;
      }
    } catch (e) {
      console.error("Erro ao consultar CEP:", e);
    }
  }

  // ---- Resumo final ----
  function montarResumo() {
    const tel = soNumeros(val("telefone"));
    const cpf = soNumeros(val("cpf"));
    document.getElementById("resumo-cadastro").innerHTML =
      '<table class="tabela-dados">' +
        l("Nome", val("nome") + " " + val("sobrenome")) +
        l("CPF", cpf) +
        l("Nascimento", val("dataNascimento")) +
        l("Telefone", tel) +
        l("E-mail", val("email")) +
        l("Endereço", [val("rua"), val("numero"), val("bairro"), val("cidade"), val("estado"), val("cep"), val("pais")].filter(Boolean).join(", ")) +
        l("Usuário", val("username")) +
      '</table>';
  }
  function l(k, v) { return '<tr><th style="width:140px">' + k + '</th><td>' + UI.esc(v) + '</td></tr>'; }

  // ---- Envio ----
  form.addEventListener("submit", async function (ev) {
    ev.preventDefault();
    // Revalida todos os passos por segurança.
    for (let p = 1; p <= 3; p++) {
      const erros = validarPasso(p);
      if (erros.length) { passo = p; mostrarPasso(p); mostrarErros(erros); return; }
    }

    const endereco = {
      pais: val("pais"), estado: val("estado"), cidade: val("cidade"),
      bairro: val("bairro"), rua: val("rua"),
      numero: val("numero"), complemento: val("complemento"),
      cep: normalizarCep(val("cep"))
    };
    const payload = {
      nome: val("nome"), sobrenome: val("sobrenome"), email: val("email"),
      cpf: soNumeros(val("cpf")), dataNascimento: val("dataNascimento"),
      telefone: soNumeros(val("telefone")), username: val("username"),
      senha: val("senha"), enderecos: [endereco]
    };

    btnFinalizar.disabled = true;
    msg.innerHTML = '<span class="carregando">Criando sua conta...</span>';
    try {
      const resp = await API.createUser(payload);
      // Guarda o UUID/username para o front reconhecer o usuário.
      if (resp && resp.userId) {
        AUTH.setUsuario({ userId: resp.userId, username: payload.username });
      }
      msg.innerHTML = '<div class="mensagem-ok">✔ ' +
        UI.esc((resp && resp.message) || "Usuário criado com sucesso!") +
        '</div><p>Agora você já pode <a href="login.html">entrar</a> com seu usuário e senha.</p>';
      btnFinalizar.style.display = "none";
      btnVoltar.style.display = "none";
    } catch (e) {
      btnFinalizar.disabled = false;
      let detalhe = e.message;
      // Tenta extrair erros de validação do corpo de resposta.
      if (e.data && typeof e.data === "object") {
        const campos = e.data.errors || e.data.fieldErrors || e.data;
        if (campos && typeof campos === "object") {
          const partes = Object.keys(campos).map(function (k) { return k + ": " + campos[k]; });
          if (partes.length) detalhe = partes.join("; ");
        }
      }
      msg.innerHTML = '<div class="mensagem-erro">Não foi possível criar a conta: ' + UI.esc(detalhe) + '</div>';
    }
  });

  function normalizarCep(cep) {
    const n = soNumeros(cep);
    return n.length === 8 ? n.slice(0, 5) + "-" + n.slice(5) : cep;
  }

  mostrarPasso(1);
})();
