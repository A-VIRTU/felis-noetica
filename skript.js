// Felis Noetica — Skript pro zvětšování obrázků a videa (Lightbox & Fullscreen)

document.addEventListener('DOMContentLoaded', () => {
  // 1. Vytvoření modálního okna (Lightbox overlay) pro obrázky
  const overlay = document.createElement('div');
  overlay.className = 'lightbox-overlay';
  overlay.setAttribute('aria-hidden', 'true');
  overlay.innerHTML = `
    <button class="lightbox-close" aria-label="Zavřít (Esc)">&times;</button>
    <div class="lightbox-content">
      <div class="lightbox-img-container">
        <img class="lightbox-img" src="" alt="" />
      </div>
      <div class="lightbox-caption"></div>
    </div>
  `;
  document.body.appendChild(overlay);

  const lightboxImg = overlay.querySelector('.lightbox-img');
  const lightboxCaption = overlay.querySelector('.lightbox-caption');
  const closeBtn = overlay.querySelector('.lightbox-close');

  function openLightbox(imgSrc, altText, captionHtml) {
    // Reset jakéhokoliv dočasného kontejneru pro placeholder
    const oldPlaceholder = overlay.querySelector('.lightbox-placeholder');
    if (oldPlaceholder) oldPlaceholder.remove();
    lightboxImg.style.display = 'block';

    lightboxImg.src = imgSrc;
    lightboxImg.alt = altText || '';
    lightboxCaption.innerHTML = captionHtml || '';
    overlay.classList.add('active');
    overlay.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  }

  function openLightboxPlaceholder(mistoText, captionHtml) {
    lightboxImg.style.display = 'none';
    let placeholderBox = overlay.querySelector('.lightbox-placeholder');
    if (!placeholderBox) {
      placeholderBox = document.createElement('div');
      placeholderBox.className = 'lightbox-placeholder misto';
      overlay.querySelector('.lightbox-img-container').appendChild(placeholderBox);
    }
    placeholderBox.style.display = 'flex';
    placeholderBox.innerHTML = `<span>${mistoText}</span>`;
    lightboxCaption.innerHTML = captionHtml || '';
    overlay.classList.add('active');
    overlay.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  }

  function closeLightbox() {
    overlay.classList.remove('active');
    overlay.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    lightboxImg.src = '';
  }

  closeBtn.addEventListener('click', closeLightbox);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay || e.target.classList.contains('lightbox-content') || e.target.classList.contains('lightbox-img-container')) {
      closeLightbox();
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && overlay.classList.contains('active')) {
      closeLightbox();
    }
  });

  // Navázání událostí na všechny prvky <figure>
  document.querySelectorAll('figure').forEach((fig) => {
    const img = fig.querySelector('img');
    const misto = fig.querySelector('.misto');
    const caption = fig.querySelector('figcaption');
    const video = fig.querySelector('video');

    if (img) {
      fig.classList.add('lightbox-trigger');
      fig.addEventListener('click', () => {
        const captionHtml = caption ? caption.innerHTML : '';
        const fullSrc = fig.getAttribute('data-full') || img.src;
        openLightbox(fullSrc, img.alt, captionHtml);
      });
    } else if (misto && !video) {
      fig.classList.add('lightbox-trigger');
      fig.addEventListener('click', () => {
        const captionHtml = caption ? caption.innerHTML : '';
        openLightboxPlaceholder(misto.innerHTML, captionHtml);
      });
    }

    // 2. Obsluha videa pro celou obrazovku (Fullscreen API)
    if (video) {
      // Dvojklik nebo kliknutí na oblast videa vyvolá celou obrazovku
      video.addEventListener('dblclick', () => {
        if (video.requestFullscreen) {
          video.requestFullscreen();
        } else if (video.webkitRequestFullscreen) {
          video.webkitRequestFullscreen();
        } else if (video.msRequestFullscreen) {
          video.msRequestFullscreen();
        }
      });
    }
  });
});
