// --- Sanitização básica contra XSS (frontend) ---
function sanitizeInput(str) {
  if (!str) return "";
  // Escapa caracteres especiais para neutralizar tags/atributos
  return str
    .replace(/&/g, "&amp;") // (importante fazer & primeiro)
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// Sanitização em tempo real (evita colar/ditar tags)
function enableRealtimeSanitize(form) {
  const campos = ["nome", "assunto", "mensagem"]; //email de fora para não quebrar endereços válidos
  campos.forEach((id) => {
    const campo = form[id];
    if (campo) {
      campo.addEventListener("input", () => {
        const pos = campo.selectionStart; // preserva posição do cursor
        campo.value = sanitizeInput(campo.value);
        try {
          campo.setSelectionRange(pos, pos);
        } catch {}
      });
      campo.addEventListener("paste", (e) => {
        e.preventDefault();
        const text = (e.clipboardData || window.clipboardData).getData("text");
        document.execCommand("insertText", false, sanitizeInput(text));
      });
    }
  });
}

// Toast acessível
function showToast(message, { variant = "success", timeout = 3500 } = {}) {
  const t = document.createElement("div");
  t.className = `toast toast-${variant}`;
  t.setAttribute("role", "status");
  t.setAttribute("aria-live", "polite");
  t.innerHTML = `
    <span>${message}</span>
    <button type="button" aria-label="Fechar notificação">×</button>
  `;
  document.body.appendChild(t);

  const remove = () => t.remove();
  t.querySelector("button")?.addEventListener("click", remove);
  setTimeout(remove, timeout);
}

document.addEventListener("DOMContentLoaded", () => {
  // ano no rodapé
  const ano = document.getElementById("ano");
  if (ano) ano.textContent = new Date().getFullYear();

  // menu mobile
  const toggle = document.querySelector(".nav-toggle");
  const nav = document.getElementById("site-nav");
  if (toggle && nav) {
    toggle.addEventListener("click", () => {
      const expanded = toggle.getAttribute("aria-expanded") === "true";
      toggle.setAttribute("aria-expanded", String(!expanded));
      nav.classList.toggle("open");
    });
  }

  // formulário de contato
  const form = document.getElementById("form-contato");
  if (!form) return;

  const status = document.getElementById("status");
  enableRealtimeSanitize(form);
  console.log("Listener de submit ligado no #form-contato");

  form.addEventListener("submit", (e) => {
    e.preventDefault();

    // sanitiza apenas os campos de texto livres
    const nome = sanitizeInput(form.nome.value.trim());
    const email = form.email.value.trim(); // valida com regex, sem escapar aqui
    const assunto = sanitizeInput(form.assunto.value.trim());
    const mensagem = sanitizeInput(form.mensagem.value.trim());
    const consent = form.consent;

    let ok = true;

    ["erro-nome", "erro-email", "erro-assunto", "erro-mensagem"].forEach(
      (id) => {
        const el = document.getElementById(id);
        if (el) el.textContent = "";
      }
    );

    if (!nome) {
      document.getElementById("erro-nome").textContent = "Informe seu nome.";
      ok = false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      document.getElementById("erro-email").textContent =
        "Informe um e-mail válido.";
      ok = false;
    }
    if (!assunto) {
      document.getElementById("erro-assunto").textContent =
        "Informe o assunto.";
      ok = false;
    }
    if (mensagem.length < 10) {
      document.getElementById("erro-mensagem").textContent =
        "A mensagem deve ter ao menos 10 caracteres.";
      ok = false;
    }
    if (!consent?.checked) {
      alert("É necessário autorizar o uso dos dados para contato.");
      ok = false;
    }

    if (!ok) {
      if (status)
        status.textContent =
          "Erros encontrados no formulário. Verifique os campos.";
      return;
    }

    if (status) status.textContent = "Enviando...";
    const submitBtn = form.querySelector('button[type="submit"]');
    if (submitBtn) submitBtn.disabled = true;

    // Simulação de envio
    setTimeout(() => {
      if (status)
        status.textContent =
          "Mensagem enviada com sucesso! Em breve entraremos em contato.";
      // Nunca interpolamos dados do usuário aqui; mensagem é constante → sem XSS
      showToast("Mensagem enviada com sucesso ✅");
      form.reset();
      if (submitBtn) submitBtn.disabled = false;
    }, 600);
  });

  // destaca o link do nav conforme URL
  const current = location.pathname.split("/").pop() || "index.html";
  document.querySelectorAll("#site-nav a, .footer-nav a").forEach((a) => {
    const href = a.getAttribute("href");
    if (href === current || (current === "" && href === "index.html")) {
      a.setAttribute("aria-current", "page");
    }
  });

  // === Leitura em voz (Web Speech API) ===
  (function setupVoice() {
    if (!("speechSynthesis" in window)) {
      console.warn("Web Speech API não suportada neste navegador.");
      return;
    }

    const btn = document.getElementById("toggle-voz");
    if (!btn) return;

    let ativo = false;
    let vozPt = null;

    // tenta selecionar uma voz pt-BR/pt-PT quando disponível
    function escolherVoz() {
      const vozes = window.speechSynthesis.getVoices();
      vozPt =
        vozes.find((v) => /pt(-|_)?(BR|PT)/i.test(v.lang)) ||
        vozes.find((v) => v.lang.startsWith("pt")) ||
        null;
    }
    escolherVoz();
    // Alguns navegadores carregam as vozes de forma assíncrona
    window.speechSynthesis.onvoiceschanged = escolherVoz;

    function textoDoElemento(el) {
      // prioridade: data-tts > aria-label > texto visível
      const t =
        el.getAttribute("data-tts") ||
        el.getAttribute("aria-label") ||
        el.innerText ||
        el.textContent ||
        "";
      return t.replace(/\s+/g, " ").trim();
    }

    function speak(texto) {
      if (!texto) return;
      window.speechSynthesis.cancel(); // interrompe leitura anterior
      const u = new SpeechSynthesisUtterance(texto);
      u.lang = (vozPt && vozPt.lang) || "pt-BR";
      if (vozPt) u.voice = vozPt;
      u.rate = 1.0; // velocidade
      u.pitch = 1.0; // tom
      window.speechSynthesis.speak(u);
    }

    // Evita repetir leitura do mesmo elemento em hover
    const ultimoLido = new WeakMap();

    function tentarLer(el) {
      if (!ativo) return;
      const texto = textoDoElemento(el);
      if (texto.length < 2) return;
      const agora = Date.now();
      const ultimo = ultimoLido.get(el) || 0;
      if (agora - ultimo < 1200) return; // throttling
      ultimoLido.set(el, agora);
      speak(texto);
    }

    // Liga/desliga
    btn.addEventListener("click", () => {
      ativo = !ativo;
      btn.setAttribute("aria-pressed", String(ativo));
      if (!ativo) window.speechSynthesis.cancel();
      btn.innerText = ativo ? "Leitura de voz: ON" : "Leitura de voz";
      // dica falada ao ligar
      if (ativo)
        speak(
          "Leitura de voz ativada. Passe o mouse ou use a tecla Tab para ouvir os conteúdos."
        );
    });

    // Leitura por foco (teclado) — muito importante para acessibilidade
    document.addEventListener("focusin", (e) => {
      const el = e.target;
      if (!(el instanceof HTMLElement)) return;
      // lê somente itens com papel interativo ou marcados
      if (
        el.matches(
          "a, button, input, textarea, select, [tabindex], [data-tts], .card, .svc"
        )
      ) {
        tentarLer(el);
      }
    });

    // Leitura por hover (mouse)
    document.addEventListener("mouseover", (e) => {
      const el = e.target;
      if (!(el instanceof HTMLElement)) return;
      // evita poluição: lê itens mais relevantes
      if (
        el.matches(
          "a, button, [data-tts], .card, .svc, header .brand, .hero-copy, .cta-inner"
        )
      ) {
        tentarLer(el);
      }
    });

    // Opcional: atalho de teclado para ligar/desligar (Ctrl+Alt+L)
    document.addEventListener("keydown", (e) => {
      if (e.ctrlKey && e.altKey && e.key.toLowerCase() === "l") {
        btn.click();
      }
    });
  })();
});
