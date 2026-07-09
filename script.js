/* RecondRaw — interactions */
(() => {
  "use strict";

  const prefersReducedMotion =
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- Header: solid background after scrolling ---------- */
  const header = document.getElementById("header");
  const onScrollHeader = () => {
    header.classList.toggle("is-scrolled", window.scrollY > 24);
  };
  onScrollHeader();
  window.addEventListener("scroll", onScrollHeader, { passive: true });

  /* ---------- Scroll progress bar ---------- */
  const progressBar = document.getElementById("progressBar");
  const onScrollProgress = () => {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    const ratio = max > 0 ? window.scrollY / max : 0;
    progressBar.style.transform = `scaleX(${ratio})`;
  };
  onScrollProgress();
  window.addEventListener("scroll", onScrollProgress, { passive: true });
  window.addEventListener("resize", onScrollProgress, { passive: true });

  /* ---------- Mobile menu ---------- */
  const burger = document.getElementById("burger");
  const mobileMenu = document.getElementById("mobileMenu");

  const setMenu = (open) => {
    burger.classList.toggle("is-open", open);
    mobileMenu.classList.toggle("is-open", open);
    burger.setAttribute("aria-expanded", String(open));
    mobileMenu.setAttribute("aria-hidden", String(!open));
    burger.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    document.body.style.overflow = open ? "hidden" : "";
  };

  burger.addEventListener("click", () =>
    setMenu(!burger.classList.contains("is-open"))
  );
  mobileMenu.querySelectorAll("a").forEach((a) =>
    a.addEventListener("click", () => setMenu(false))
  );
  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape") setMenu(false);
  });

  /* ---------- Reveal on scroll ---------- */
  const revealObserver = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-in");
          revealObserver.unobserve(entry.target);
        }
      }
    },
    { threshold: 0.12, rootMargin: "0px 0px -8% 0px" }
  );
  document.querySelectorAll(".reveal").forEach((el) => revealObserver.observe(el));

  /* ---------- Count-up numbers ---------- */
  const animateCount = (el) => {
    const target = parseInt(el.dataset.count, 10);
    if (prefersReducedMotion) {
      el.textContent = target.toLocaleString("en-US");
      return;
    }
    const duration = 1600;
    const start = performance.now();
    const tick = (now) => {
      const t = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 4); // ease-out quart
      el.textContent = Math.round(target * eased).toLocaleString("en-US");
      if (t < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };

  const countObserver = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          animateCount(entry.target);
          countObserver.unobserve(entry.target);
        }
      }
    },
    { threshold: 0.6 }
  );
  document.querySelectorAll(".count").forEach((el) => countObserver.observe(el));

  /* ---------- Impact ring ---------- */
  const ring = document.querySelector(".ring");
  if (ring) {
    const ringObserver = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          ring.classList.add("is-in");
          ringObserver.disconnect();
        }
      },
      { threshold: 0.5 }
    );
    ringObserver.observe(ring);
  }

  /* ---------- Hero card tilt (pointer devices only) ---------- */
  if (!prefersReducedMotion && window.matchMedia("(hover: hover)").matches) {
    document.querySelectorAll("[data-tilt]").forEach((card) => {
      let raf = null;
      card.addEventListener("pointermove", (e) => {
        if (raf) return;
        raf = requestAnimationFrame(() => {
          const r = card.getBoundingClientRect();
          const px = (e.clientX - r.left) / r.width - 0.5;
          const py = (e.clientY - r.top) / r.height - 0.5;
          card.style.transform =
            `translateY(-6px) rotateX(${(-py * 7).toFixed(2)}deg) rotateY(${(px * 9).toFixed(2)}deg)`;
          raf = null;
        });
      });
      card.addEventListener("pointerleave", () => {
        card.style.transform = "";
      });
    });
  }

  /* ---------- CTA form ---------- */
  const form = document.getElementById("ctaForm");
  const email = document.getElementById("ctaEmail");
  const done = document.getElementById("ctaDone");

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const value = email.value.trim();
    const valid = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value);
    email.classList.toggle("is-error", !valid);
    if (!valid) {
      email.focus();
      return;
    }
    done.hidden = false;
    form.querySelector("button[type=submit]").disabled = true;
    email.disabled = true;
  });
  email.addEventListener("input", () => email.classList.remove("is-error"));
})();
