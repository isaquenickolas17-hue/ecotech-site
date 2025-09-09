// função para sanitizar entrada do usuário (anti-XSS)
function sanitizeInput(str) {
  if (!str) return "";
  return str
    .replace(/</g, "&lt;")   // substitui "<" por &lt;
    .replace(/>/g, "&gt;")   // substitui ">" por &gt;
    .replace(/&/g, "&amp;")  // substitui "&" por &amp;
    .replace(/"/g, "&quot;") // substitui aspas duplas
    .replace(/'/g, "&#039;");// substitui aspas simples
}

// aplica sanitização em tempo real nos campos de texto
function enableRealtimeSanitize(form) {
  const campos = ['nome', 'email', 'assunto', 'mensagem'];
  campos.forEach(id => {
    const campo = form[id];
    if (campo) {
      campo.addEventListener('input', () => {
        campo.value = sanitizeInput(campo.value);
      });
    }
  });
}

const form = document.getElementById('form-contato');
if (form) {
  const status = document.getElementById('status');

  // já ativa sanitização em tempo real
  enableRealtimeSanitize(form);

  form.addEventListener('submit', (e) => {
    e.preventDefault();

    const nome = sanitizeInput(form.nome.value.trim());
    const email = sanitizeInput(form.email.value.trim());
    const assunto = sanitizeInput(form.assunto.value.trim());
    const mensagem = sanitizeInput(form.mensagem.value.trim());
    const consent = form.consent;

    let ok = true;

    // reset mensagens de erro
    ['erro-nome','erro-email','erro-assunto','erro-mensagem'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.textContent = '';
    });

    // validações
    if (!nome) {
      document.getElementById('erro-nome').textContent = 'Informe seu nome.';
      ok = false;
    }
    if (!email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      document.getElementById('erro-email').textContent = 'Informe um e-mail válido.';
      ok = false;
    }
    if (!assunto) {
      document.getElementById('erro-assunto').textContent = 'Informe o assunto.';
      ok = false;
    }
    if (mensagem.length < 10) {
      document.getElementById('erro-mensagem').textContent = 'A mensagem deve ter ao menos 10 caracteres.';
      ok = false;
    }
    if (!consent.checked) {
      alert('É necessário autorizar o uso dos dados para contato.');
      ok = false;
    }

    if (!ok) {
      if (status) status.textContent = 'Erros encontrados no formulário. Verifique os campos.';
      return;
    }

    // simulação de envio seguro
    if (status) status.textContent = 'Enviando...';

    setTimeout(() => {
      if (status) status.textContent = 'Mensagem enviada com sucesso! Em breve entraremos em contato.';
      form.reset();
    }, 600);
  });
}
