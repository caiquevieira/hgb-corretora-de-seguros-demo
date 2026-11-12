/* Configuração do projeto: preencher a partir do briefing.md.
   IDs vazios = nenhum script de terceiros é carregado e o banner de cookies não aparece. */
const CONFIG = {
  ga4Id: '', // ex.: 'G-XXXXXXXXXX'
  metaPixelId: '', // ex.: '123456789012345'
};

const CHAVE_CONSENTIMENTO = 'ul-consentimento';

// data-track → eventos disparados (ver _docs/padrao-whatsapp.md)
const EVENTOS = {
  whatsapp: { ga: 'generate_lead', gaParams: { method: 'whatsapp' }, meta: 'Contact' },
  instagram: { ga: 'click_instagram' },
  'avaliar-google': { ga: 'click_avaliar_google' },
  'como-chegar': { ga: 'click_como_chegar', meta: 'FindLocation' },
};

let analyticsCarregado = false;

// Consent Mode v2: os 4 sinais seguem juntos a escolha do banner
function sinaisConsentimento(aceito) {
  const valor = aceito ? 'granted' : 'denied';
  return { analytics_storage: valor, ad_storage: valor, ad_user_data: valor, ad_personalization: valor };
}

function lerConsentimento() {
  try {
    return localStorage.getItem(CHAVE_CONSENTIMENTO);
  } catch {
    return null;
  }
}

function salvarConsentimento(valor) {
  try {
    localStorage.setItem(CHAVE_CONSENTIMENTO, valor);
  } catch {
    // Sem armazenamento (aba anônima restrita): vale só para esta visita.
  }
  if (window.gtag) window.gtag('consent', 'update', sinaisConsentimento(valor === 'aceito'));
}

function carregarAnalytics() {
  if (analyticsCarregado) return;
  analyticsCarregado = true;

  if (CONFIG.ga4Id) {
    const s = document.createElement('script');
    s.async = true;
    s.src = `https://www.googletagmanager.com/gtag/js?id=${CONFIG.ga4Id}`;
    document.head.appendChild(s);
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () {
      window.dataLayer.push(arguments);
    };
    // Só chega aqui com a escolha "aceito" salva ou recém-feita
    window.gtag('consent', 'default', sinaisConsentimento(true));
    window.gtag('js', new Date());
    window.gtag('config', CONFIG.ga4Id);
  }

  if (CONFIG.metaPixelId) {
    /* Snippet oficial do Meta Pixel */
    !(function (f, b, e, v, n, t, s) {
      if (f.fbq) return;
      n = f.fbq = function () {
        n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
      };
      if (!f._fbq) f._fbq = n;
      n.push = n;
      n.loaded = !0;
      n.version = '2.0';
      n.queue = [];
      t = b.createElement(e);
      t.async = !0;
      t.src = v;
      s = b.getElementsByTagName(e)[0];
      s.parentNode.insertBefore(t, s);
    })(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');
    window.fbq('init', CONFIG.metaPixelId);
    window.fbq('track', 'PageView');
  }
}

function iniciarConsentimento() {
  const usaAnalytics = Boolean(CONFIG.ga4Id || CONFIG.metaPixelId);
  const banner = document.getElementById('consentimento');
  const botoesAbrir = document.querySelectorAll('[data-abrir-consentimento]');

  if (!usaAnalytics) {
    botoesAbrir.forEach((b) => (b.hidden = true));
    return;
  }

  const abrir = () => {
    if (!banner) return;
    banner.hidden = false;
    document.body.classList.add('consentimento-aberto');
  };
  const fechar = () => {
    if (!banner) return;
    banner.hidden = true;
    document.body.classList.remove('consentimento-aberto');
  };

  const escolha = lerConsentimento();
  if (escolha === 'aceito') carregarAnalytics();
  else if (!escolha) abrir();

  banner?.querySelector('[data-consentimento="aceitar"]')?.addEventListener('click', () => {
    salvarConsentimento('aceito');
    fechar();
    carregarAnalytics();
  });

  banner?.querySelector('[data-consentimento="recusar"]')?.addEventListener('click', () => {
    salvarConsentimento('recusado');
    fechar();
    // Scripts já carregados só saem da página com um recarregamento.
    if (analyticsCarregado) location.reload();
  });

  botoesAbrir.forEach((b) => b.addEventListener('click', abrir));
}

function iniciarTracking() {
  document.addEventListener('click', (e) => {
    const link = e.target.closest('[data-track]');
    if (!link || !analyticsCarregado) return;
    const evento = EVENTOS[link.dataset.track];
    if (!evento) return;
    const origem = link.dataset.origem || '';
    if (window.gtag && evento.ga) window.gtag('event', evento.ga, { ...evento.gaParams, origem });
    if (window.fbq && evento.meta) window.fbq('track', evento.meta, { origem });
  });
}

/* Galeria com "Ver mais": sem JS a grade aparece completa; com JS mostra as 6 primeiras. */
function iniciarGaleria() {
  document.querySelectorAll('[data-galeria-grade]').forEach((grade) => {
    const botao = document.querySelector(`[data-galeria-mais="${grade.id}"]`);
    if (!botao) return;
    grade.classList.add('galeria-recolhida');
    botao.hidden = false;
    botao.addEventListener('click', () => {
      grade.classList.remove('galeria-recolhida');
      botao.hidden = true;
    });
  });
}

/* Galeria ampliada: cada foto da galeria é um link [data-lightbox] para a versão de 1200px.
   Sem JS (ou sem suporte a <dialog>), o link só abre a foto. Com JS, abre o <dialog id="lightbox">
   com anterior/próxima (botões, setas do teclado e deslize no celular). Esc fecha (nativo do dialog). */
function iniciarLightbox() {
  const dialogo = document.getElementById('lightbox');
  const links = [...document.querySelectorAll('[data-lightbox]')];
  if (!dialogo || !links.length || typeof dialogo.showModal !== 'function') return;

  const img = dialogo.querySelector('[data-lightbox-img]');
  const legenda = dialogo.querySelector('[data-lightbox-legenda]');
  const contador = dialogo.querySelector('[data-lightbox-contador]');
  const unica = links.length === 1;
  let atual = 0;

  dialogo.querySelectorAll('[data-lightbox-anterior], [data-lightbox-proxima]').forEach((b) => {
    b.hidden = unica;
  });

  function mostrar(indice) {
    atual = (indice + links.length) % links.length;
    const link = links[atual];
    const miniatura = link.querySelector('img');
    img.src = link.href;
    img.alt = miniatura?.alt || '';
    // Mesma proporção da miniatura: evita salto de leiaute enquanto a foto grande carrega
    const largura = miniatura?.getAttribute('width');
    const altura = miniatura?.getAttribute('height');
    if (largura && altura) {
      img.setAttribute('width', largura);
      img.setAttribute('height', altura);
    }
    legenda.textContent = link.closest('figure')?.querySelector('figcaption')?.textContent.trim() || '';
    contador.textContent = unica ? '' : `${atual + 1} de ${links.length}`;
    // Pré-carrega as vizinhas para a navegação não piscar
    [atual + 1, atual - 1].forEach((i) => {
      new Image().src = links[(i + links.length) % links.length].href;
    });
  }

  links.forEach((link, i) => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      mostrar(i);
      dialogo.showModal();
      document.documentElement.classList.add('lightbox-aberto');
    });
  });

  function fechar() {
    dialogo.close();
    document.documentElement.classList.remove('lightbox-aberto');
  }

  dialogo.querySelector('[data-lightbox-fechar]')?.addEventListener('click', fechar);
  dialogo.querySelector('[data-lightbox-anterior]')?.addEventListener('click', () => mostrar(atual - 1));
  dialogo.querySelector('[data-lightbox-proxima]')?.addEventListener('click', () => mostrar(atual + 1));

  dialogo.addEventListener('keydown', (e) => {
    if (unica) return;
    if (e.key === 'ArrowRight') mostrar(atual + 1);
    if (e.key === 'ArrowLeft') mostrar(atual - 1);
  });

  // Clique fora da foto e dos botões fecha
  dialogo.addEventListener('click', (e) => {
    if (e.target === dialogo || e.target.classList.contains('lightbox-quadro')) fechar();
  });

  // Deslizar no celular: esquerda = próxima, direita = anterior
  let toqueX = null;
  dialogo.addEventListener('touchstart', (e) => {
    toqueX = e.touches.length === 1 ? e.touches[0].clientX : null;
  }, { passive: true });
  dialogo.addEventListener('touchend', (e) => {
    if (toqueX === null || unica) return;
    const dx = e.changedTouches[0].clientX - toqueX;
    if (Math.abs(dx) > 50) mostrar(dx < 0 ? atual + 1 : atual - 1);
    toqueX = null;
  });

  // Esc fecha pelo próprio <dialog>; o evento close garante a liberação da rolagem
  dialogo.addEventListener('close', () => {
    document.documentElement.classList.remove('lightbox-aberto');
  });
}

iniciarConsentimento();
iniciarTracking();
iniciarGaleria();
iniciarLightbox();
