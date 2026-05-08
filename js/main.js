// ── Barra de progresso de leitura ──────────────────────────────────────────
const bar = document.getElementById('bar');
window.addEventListener('scroll', () => {
  const progress = Math.min(scrollY / (document.body.scrollHeight - innerHeight), 1);
  bar.style.transform = `scaleX(${progress})`;
}, { passive: true });

// ── Navbar: transparente no topo, sólida ao rolar ───────────────────────────
const navEl = document.querySelector('nav');
const heroEl = document.querySelector('.hero');
if (heroEl) {
  // Iniciar como transparente se o hero estiver visível
  if (window.scrollY < 50) navEl.classList.add('nav-top');

  const navObserver = new IntersectionObserver(([e]) => {
    navEl.classList.toggle('nav-top', e.isIntersecting && window.scrollY < 50);
  }, { threshold: 0.1 });
  navObserver.observe(heroEl);

  // Fallback via scroll para maior controle
  window.addEventListener('scroll', () => {
    const heroBottom = heroEl.getBoundingClientRect().bottom;
    navEl.classList.toggle('nav-top', heroBottom > 80);
  }, { passive: true });
}

// ── Tema claro/escuro ───────────────────────────────────────────────────────
const btn = document.getElementById('themeBtn');

function applyTheme(dark) {
  if (dark) {
    document.documentElement.setAttribute('data-dark', '');
  } else {
    document.documentElement.removeAttribute('data-dark');
  }
  btn.textContent = dark ? '☀️' : '🌙';
}

btn.addEventListener('click', () => {
  const dark = !document.documentElement.hasAttribute('data-dark');
  applyTheme(dark);
  localStorage.setItem('theme', dark ? 'dark' : 'light');
});

// Aplicar tema salvo ou preferência do sistema
const saved = localStorage.getItem('theme');
applyTheme(saved ? saved === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches);

// ── Topic pills ─────────────────────────────────────────────────────────────
document.querySelectorAll('.topic-pill').forEach(pill => {
  pill.addEventListener('click', () => {
    document.querySelectorAll('.topic-pill').forEach(p => p.classList.remove('on'));
    pill.classList.add('on');
    filterArticles(pill.textContent.trim());
  });
});

// Filtragem básica de artigos por tópico
function filterArticles(topic) {
  const articles = document.querySelectorAll('.art');
  articles.forEach(art => {
    if (topic === 'Todos') {
      art.style.display = '';
      return;
    }
    const tags = art.querySelectorAll('.tag');
    let match = false;
    tags.forEach(tag => {
      if (tag.textContent.toLowerCase().includes(topic.toLowerCase())) match = true;
    });
    art.style.display = match ? '' : 'none';
  });
}

// ── Fade-in com IntersectionObserver ────────────────────────────────────────
const io = new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      e.target.classList.add('in');
      io.unobserve(e.target);
    }
  });
}, { threshold: 0.06 });

document.querySelectorAll('.fade').forEach(el => io.observe(el));

// ── Stagger: topic pills ─────────────────────────────────────────────────────
const pillsContainer = document.querySelector('.topic-pills');
if (pillsContainer) {
  const pillsIO = new IntersectionObserver(([e]) => {
    if (e.isIntersecting) {
      e.target.querySelectorAll('.topic-pill').forEach((pill, i) => {
        pill.style.opacity = '0';
        pill.style.transform = 'translateY(8px)';
        setTimeout(() => {
          pill.style.transition = 'opacity .3s ease, transform .3s ease';
          pill.style.opacity = '1';
          pill.style.transform = 'none';
        }, i * 60);
      });
      pillsIO.unobserve(e.target);
    }
  }, { threshold: 0.2 });
  pillsIO.observe(pillsContainer);
}

// ── Stagger: article list ────────────────────────────────────────────────────
const artList = document.querySelector('.article-list');
if (artList) {
  const artIO = new IntersectionObserver(([e]) => {
    if (e.isIntersecting) {
      e.target.querySelectorAll('.art').forEach((art, i) => {
        art.style.opacity = '0';
        art.style.transform = 'translateY(12px)';
        setTimeout(() => {
          art.style.transition = 'opacity .4s cubic-bezier(.16,1,.3,1), transform .4s cubic-bezier(.16,1,.3,1)';
          art.style.opacity = '1';
          art.style.transform = 'none';
        }, i * 80);
      });
      artIO.unobserve(e.target);
    }
  }, { threshold: 0.05 });
  artIO.observe(artList);
}

// ── Manifesto: reveal palavra por palavra ────────────────────────────────────
const manifestoLead = document.querySelector('.manifesto-lead');
if (manifestoLead) {
  // Wrap cada palavra em span
  const rawText = manifestoLead.innerHTML;
  manifestoLead.innerHTML = rawText.replace(/([^<>]+)(?=[<]|$)/g, (match) => {
    return match.split(' ').map(word =>
      word.trim() ? `<span class="manifesto-word">${word}</span> ` : word
    ).join('');
  });

  const manifestoIO = new IntersectionObserver(([e]) => {
    if (e.isIntersecting) {
      e.target.querySelectorAll('.manifesto-word').forEach((w, i) => {
        setTimeout(() => w.classList.add('revealed'), i * 55);
      });
      manifestoIO.unobserve(e.target);
    }
  }, { threshold: 0.3 });
  manifestoIO.observe(manifestoLead);
}

// ── Atalho de busca ⌘K / Ctrl+K ─────────────────────────────────────────────
document.addEventListener('keydown', e => {
  if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
    e.preventDefault();
    const input = document.querySelector('.search-box input');
    if (input) input.focus();
  }
});

// ── Busca ao vivo ────────────────────────────────────────────────────────────
const searchInput = document.querySelector('.search-box input');
if (searchInput) {
  searchInput.addEventListener('input', () => {
    const query = searchInput.value.toLowerCase().trim();
    const articles = document.querySelectorAll('.art');
    articles.forEach(art => {
      const title = art.querySelector('.art-title')?.textContent.toLowerCase() || '';
      const desc  = art.querySelector('.art-desc')?.textContent.toLowerCase() || '';
      art.style.display = (!query || title.includes(query) || desc.includes(query)) ? '' : 'none';
    });
  });
}
