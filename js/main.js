// ============================================================
// 1. L'UNIVERS ACTIF
// Le thème actif est stocké dans <body data-theme="...">.
// Le CSS fait le reste (couleurs, polices, forme du curseur).
// ============================================================
const root = document.documentElement;
const body = document.body;
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const hasMouse = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

let sectionTheme = "accueil"; // univers de la section visible
let hoverTheme = null;        // univers prévisualisé au survol d'un mot de l'accueil

function applyTheme() {
  body.dataset.theme = hoverTheme || sectionTheme;
}

const sections = document.querySelectorAll("section[data-theme]");
const dots = document.querySelectorAll("[data-dot]");

// Une section devient "active" quand elle traverse la bande centrale de l'écran.
// (marche même si une section devient plus haute que l'écran)
const sectionObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      sections.forEach((s) => s.classList.toggle("is-active", s === entry.target));
      dots.forEach((d) => d.classList.toggle("is-current", d.dataset.dot === entry.target.id));
      sectionTheme = entry.target.dataset.theme;
      applyTheme();
    });
  },
  { rootMargin: "-45% 0px -45% 0px", threshold: 0 }
);
sections.forEach((section) => sectionObserver.observe(section));

// ---- Accueil : on prépare les aperçus d'univers
// 1) le décor de chaque univers est copié dans l'accueil (il apparaît au survol)
// 2) le titre est copié une fois par univers (il change de police en fondu)
const hero = document.querySelector(".hero");
const titleLayer = document.querySelector(".title-layer");

["audiovisuel", "uxui", "graphisme"].forEach((id) => {
  const deco = document.querySelector(`#${id} .deco`);
  if (deco) {
    const scene = deco.cloneNode(true);
    scene.classList.add("hero-scene", `hero-scene--${id}`);
    hero.prepend(scene);
  }
  if (titleLayer) {
    const layer = titleLayer.cloneNode(true);
    layer.dataset.for = id;
    layer.setAttribute("aria-hidden", "true"); // le lecteur d'écran ne lit le titre qu'une fois
    titleLayer.parentElement.appendChild(layer);
  }
});

// ---- Survol d'un mot de l'accueil = prévisualisation de l'univers
let leaveTimer;

function previewTheme(theme) {
  clearTimeout(leaveTimer);
  hoverTheme = theme;
  applyTheme();
}

function endPreview() {
  clearTimeout(leaveTimer);
  // petit délai : en passant d'un mot à l'autre, on ne repasse pas par le fond neutre
  leaveTimer = setTimeout(() => {
    hoverTheme = null;
    applyTheme();
  }, 140);
}

document.querySelectorAll("[data-theme-target]").forEach((link) => {
  link.addEventListener("mouseenter", () => previewTheme(link.dataset.themeTarget));
  link.addEventListener("mouseleave", endPreview);
  // même effet au clavier
  link.addEventListener("focus", () => previewTheme(link.dataset.themeTarget));
  link.addEventListener("blur", endPreview);
});

// ============================================================
// 2. TIMECODE (univers Audiovisuel)
// Se met à jour seulement quand l'univers est affiché.
// ============================================================
const timecodes = document.querySelectorAll(".av-timecode"); // celui de la section + celui de l'aperçu
if (timecodes.length && !reduceMotion) {
  const start = performance.now();
  const pad = (n) => String(n).padStart(2, "0");
  setInterval(() => {
    if (body.dataset.theme !== "audiovisuel") return;
    const t = (performance.now() - start) / 1000;
    const h = Math.floor(t / 3600);
    const m = Math.floor(t / 60) % 60;
    const s = Math.floor(t) % 60;
    const f = Math.floor((t % 1) * 25); // 25 images par seconde
    const text = `${pad(h)}:${pad(m)}:${pad(s)}:${pad(f)}`;
    timecodes.forEach((el) => (el.textContent = text));
  }, 40);
}

// ============================================================
// 3. CURSEUR PERSONNALISÉ + MOUVEMENT DES DÉCORS
// - le point suit la souris exactement
// - l'anneau la suit avec un léger retard (effet "lerp")
// - la position de la souris est aussi partagée avec le CSS (--mx, --my)
//   pour que les décors (UX/UI, graphisme) réagissent légèrement
// ============================================================
if (hasMouse) {
  body.classList.add("has-cursor");

  const dot = document.querySelector(".cursor-dot");
  const ring = document.querySelector(".cursor-ring");
  const label = document.querySelector(".cursor-label");

  let mouseX = window.innerWidth / 2;
  let mouseY = window.innerHeight / 2;
  let ringX = mouseX;
  let ringY = mouseY;

  // 1 = suit instantanément, 0.15 = suit avec du retard
  const smoothing = reduceMotion ? 1 : 0.15;

  dot.style.transform = `translate(${mouseX}px, ${mouseY}px) translate(-50%, -50%)`;

  window.addEventListener("mousemove", (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
    dot.style.transform = `translate(${mouseX}px, ${mouseY}px) translate(-50%, -50%)`;

    if (!reduceMotion) {
      // valeurs entre -1 (bord gauche/haut) et 1 (bord droit/bas)
      root.style.setProperty("--mx", ((mouseX / window.innerWidth) - 0.5) * 2);
      root.style.setProperty("--my", ((mouseY / window.innerHeight) - 0.5) * 2);
    }
  });

  function animateRing() {
    ringX += (mouseX - ringX) * smoothing;
    ringY += (mouseY - ringY) * smoothing;
    ring.style.transform = `translate(${ringX}px, ${ringY}px) translate(-50%, -50%)`;
    requestAnimationFrame(animateRing);
  }
  animateRing();

  // Les mots de l'accueil (data-cursor-hollow) agrandissent l'anneau sans le remplir
  // (écoute globale : marche aussi pour les éléments créés plus tard, comme dans la fenêtre de projet)
  document.addEventListener("mouseover", (e) => {
    if (e.target.closest("[data-cursor-hollow]")) ring.classList.add("is-hollow");
  });
  document.addEventListener("mouseout", (e) => {
    const from = e.target.closest("[data-cursor-hollow]");
    if (from && !from.contains(e.relatedTarget)) ring.classList.remove("is-hollow");
  });

  // Tout élément avec data-cursor="Texte" agrandit l'anneau et affiche ce texte
  document.querySelectorAll("[data-cursor]").forEach((el) => {
    el.addEventListener("mouseenter", () => {
      label.textContent = el.dataset.cursor;
      ring.classList.add("is-active");
    });
    el.addEventListener("mouseleave", () => {
      ring.classList.remove("is-active");
    });
  });
}

// ============================================================
// 4. CARTES DE PROJETS + FENÊTRE DE DÉTAIL
// - La carte affiche un aperçu et un titre.
// - Au clic, une fenêtre s'ouvre avec la vidéo (ou le lien) et le détail.
// - Le lecteur YouTube n'est créé qu'à l'ouverture : le site reste rapide.
// Les données viennent du HTML : data-yt, data-href, data-link, data-sub
// et le bloc .project__detail de chaque carte.
// ============================================================
const modal = document.getElementById("project-modal");
const isVideoId = (id) => /^[\w-]{6,}$/.test(id);

if (modal) {
  const panel = modal.querySelector(".modal__panel");
  const modalMedia = modal.querySelector(".modal__media");
  const modalBody = modal.querySelector(".modal__body");
  let opener = null;
  let closeTimer;

  // Vignette YouTube sur chaque carte (si elle ne charge pas, le fond sombre reste)
  document.querySelectorAll(".project").forEach((card) => {
    const id = (card.dataset.yt || "").trim();
    const thumb = card.querySelector(".project__thumb");
    if (thumb && isVideoId(id) && !card.dataset.img) {
      const img = new Image();
      img.alt = "";
      img.loading = "lazy";
      img.decoding = "async";
      img.onerror = () => img.remove();
      img.src = `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
      thumb.prepend(img);
    }
    // vignette image (projets sans vidéo)
    const imgSrc = (card.dataset.img || "").trim();
    if (thumb && imgSrc) {
      const img = new Image();
      img.alt = "";
      img.loading = "lazy";
      img.decoding = "async";
      img.src = imgSrc;
      thumb.prepend(img);
    }
    card.querySelector(".project__open").addEventListener("click", (e) => openProject(card, e.currentTarget));
  });

  function fillMedia(card) {
    const id = (card.dataset.yt || "").trim();
    const url = (card.dataset.href || "").trim();
    modalMedia.replaceChildren();

    const gallery = (card.dataset.gallery || "").split(",").map((s) => s.trim()).filter(Boolean);
    if (gallery.length && !isVideoId(id)) {
      // diaporama d'images : on fait défiler avec les flèches ou au doigt
      const strip = document.createElement("div");
      strip.className = "gallery";
      strip.tabIndex = 0;
      gallery.forEach((src, i) => {
        const im = new Image();
        im.src = src;
        im.alt = `${card.dataset.title || "Projet"} (image ${i + 1} sur ${gallery.length})`;
        strip.append(im);
      });
      modalMedia.append(strip);
      if (gallery.length > 1) {
        ["prev", "next"].forEach((dir) => {
          const b = document.createElement("button");
          b.type = "button";
          b.className = `gallery__btn gallery__btn--${dir}`;
          b.setAttribute("aria-label", dir === "prev" ? "Image précédente" : "Image suivante");
          b.textContent = dir === "prev" ? "←" : "→";
          b.dataset.cursorHollow = "";
          b.addEventListener("click", () => strip.scrollBy({ left: (dir === "prev" ? -1 : 1) * strip.clientWidth, behavior: "smooth" }));
          modalMedia.append(b);
        });
      }
    } else if (isVideoId(id)) {
      const iframe = document.createElement("iframe");
      iframe.src = `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0`;
      iframe.title = card.dataset.title || "Vidéo";
      iframe.allow = "autoplay; encrypted-media; picture-in-picture; fullscreen";
      iframe.allowFullscreen = true;
      modalMedia.append(iframe);
    } else if (url) {
      const link = document.createElement("a");
      link.className = "media-link";
      link.href = url;
      link.target = "_blank";
      link.rel = "noopener";
      link.dataset.cursorHollow = "";
      const title = document.createElement("span");
      title.className = "media-link__title";
      title.textContent = card.dataset.link || "Voir le projet ↗";
      link.append(title);
      if (card.dataset.sub) {
        const sub = document.createElement("span");
        sub.className = "media-sub";
        sub.textContent = card.dataset.sub;
        link.append(sub);
      }
      modalMedia.append(link);
    } else {
      const note = document.createElement("span");
      note.className = "media-note";
      note.textContent = "Vidéo bientôt disponible";
      modalMedia.append(note);
    }
  }

  function fillBody(card) {
    const lab = modal.querySelector(".modal__label");
    const h = card.closest("section") && card.closest("section").querySelector("h2");
    if (lab && h) lab.textContent = h.textContent;
    modalBody.replaceChildren();
    const title = document.createElement("h3");
    title.id = "modal-title";
    title.textContent = card.querySelector("h3").textContent;
    modalBody.append(title);

    const award = card.querySelector(".project__award");
    if (award) modalBody.append(award.cloneNode(true));

    const detail = card.querySelector(".project__detail");
    if (detail) detail.childNodes.forEach((node) => modalBody.append(node.cloneNode(true)));

    // projet avec vidéo ET images : la vidéo est dans la fenêtre, les images en dessous du texte
    const imgs = (card.dataset.gallery || "").split(",").map((s) => s.trim()).filter(Boolean);
    if (imgs.length && isVideoId((card.dataset.yt || "").trim())) {
      const shots = document.createElement("div");
      shots.className = "captures";
      imgs.forEach((src, i) => {
        const im = new Image();
        im.src = src;
        im.loading = "lazy";
        im.alt = `${card.dataset.title || "Projet"} (image ${i + 1})`;
        shots.append(im);
      });
      modalBody.append(shots);
    }

    // les rôles (déjà visibles sur la carte) sont placés juste sous la ligne de contexte
    const roles = card.querySelector(".project__roles");
    if (roles) {
      const meta = modalBody.querySelector(".project__meta");
      (meta ? meta.after.bind(meta) : modalBody.append.bind(modalBody))(roles.cloneNode(true));
    }
  }

  // Pendant que la fenêtre est ouverte, le reste de la page n'est plus atteignable (clavier / lecteur d'écran)
  function setPageInert(on) {
    [...document.body.children].forEach((el) => {
      if (el === modal || el.matches(".cursor-dot, .cursor-ring, script")) return;
      el.toggleAttribute("inert", on);
    });
  }

  function openProject(card, button) {
    clearTimeout(closeTimer);
    opener = button;
    fillMedia(card);
    fillBody(card);
    panel.scrollTop = 0;
    modal.hidden = false;
    setPageInert(true);
    document.documentElement.classList.add("modal-open");
    requestAnimationFrame(() => requestAnimationFrame(() => modal.classList.add("is-open")));
    panel.focus({ preventScroll: true });
  }

  function closeProject() {
    if (modal.hidden) return;
    modal.classList.remove("is-open");
    modalMedia.replaceChildren(); // coupe la vidéo
    setPageInert(false);
    document.documentElement.classList.remove("modal-open");
    if (opener) opener.focus({ preventScroll: true });
    closeTimer = setTimeout(() => (modal.hidden = true), 320);
  }

  modal.addEventListener("click", (e) => {
    if (e.target.closest("[data-close], .modal__close")) closeProject();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeProject();
  });
}

// ============================================================
// 5. FRISE DU PARCOURS : chaque étape apparaît en glissant quand elle entre à l'écran
// ============================================================
const timelineItems = document.querySelectorAll(".timeline__item");
if (timelineItems.length) {
  const reveal = new IntersectionObserver(
    (entries) => entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-in");
        reveal.unobserve(entry.target);
      }
    }),
    { threshold: 0.2 }
  );
  timelineItems.forEach((item) => reveal.observe(item));
}

// ============================================================
// 7. FORMULAIRE DE CONTACT (ouvre la messagerie, site sans serveur)
// ============================================================
const cform = document.getElementById("contact-form");
if (cform) {
  cform.addEventListener("submit", (e) => {
    e.preventDefault();
    const d = new FormData(cform);
    const body = `${d.get("message")}\n\n— ${d.get("nom")} (${d.get("email")})`;
    location.href = `mailto:graig.moury@gmail.com?subject=${encodeURIComponent("Message depuis votre portfolio")}&body=${encodeURIComponent(body)}`;
  });
}
