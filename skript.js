// Felis Noetica — Skript pro zvětšování obrázků a videa (Lightbox & Galerie)

document.addEventListener('DOMContentLoaded', () => {
  // 1. Vytvoření modálního okna (Lightbox overlay) pro obrázky a galerie
  const overlay = document.createElement('div');
  overlay.className = 'lightbox-overlay';
  overlay.setAttribute('aria-hidden', 'true');
  overlay.innerHTML = `
    <button class="lightbox-close" aria-label="Zavřít (Esc)">&times;</button>
    <button class="lightbox-prev" aria-label="Předchozí fotka">&#10094;</button>
    <button class="lightbox-next" aria-label="Následující fotka">&#10095;</button>
    <div class="lightbox-counter"></div>
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
  const prevBtn = overlay.querySelector('.lightbox-prev');
  const nextBtn = overlay.querySelector('.lightbox-next');
  const counterEl = overlay.querySelector('.lightbox-counter');

  let currentGallery = [];
  let currentIndex = 0;

  function renderGalleryItem(index) {
    if (!currentGallery || currentGallery.length === 0) return;
    if (index < 0) index = currentGallery.length - 1;
    if (index >= currentGallery.length) index = 0;

    currentIndex = index;
    const item = currentGallery[currentIndex];

    // Reset placeholder box
    const oldPlaceholder = overlay.querySelector('.lightbox-placeholder');
    if (oldPlaceholder) oldPlaceholder.remove();
    lightboxImg.style.display = 'block';

    lightboxImg.src = item.src;
    lightboxImg.alt = item.alt || '';
    lightboxCaption.innerHTML = item.captionHtml || '';

    if (currentGallery.length > 1) {
      prevBtn.style.display = 'flex';
      nextBtn.style.display = 'flex';
      counterEl.style.display = 'block';
      counterEl.textContent = `${currentIndex + 1} / ${currentGallery.length}`;
    } else {
      prevBtn.style.display = 'none';
      nextBtn.style.display = 'none';
      counterEl.style.display = 'none';
    }
  }

  function openGallery(galleryItems, startIndex = 0) {
    currentGallery = galleryItems;
    renderGalleryItem(startIndex);
    overlay.classList.add('active');
    overlay.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  }

  function openLightboxPlaceholder(mistoText, captionHtml) {
    currentGallery = [];
    prevBtn.style.display = 'none';
    nextBtn.style.display = 'none';
    counterEl.style.display = 'none';

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
    currentGallery = [];
  }

  closeBtn.addEventListener('click', closeLightbox);
  prevBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    renderGalleryItem(currentIndex - 1);
  });
  nextBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    renderGalleryItem(currentIndex + 1);
  });

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay || e.target.classList.contains('lightbox-content') || e.target.classList.contains('lightbox-img-container')) {
      closeLightbox();
    }
  });

  // Touch Swipe pro mobilní zařízení
  let touchStartX = 0;
  overlay.addEventListener('touchstart', (e) => {
    touchStartX = e.changedTouches[0].screenX;
  }, { passive: true });

  overlay.addEventListener('touchend', (e) => {
    const touchEndX = e.changedTouches[0].screenX;
    const diff = touchEndX - touchStartX;
    if (Math.abs(diff) > 40 && currentGallery.length > 1) {
      if (diff < 0) renderGalleryItem(currentIndex + 1); // swipe left -> next
      else renderGalleryItem(currentIndex - 1);          // swipe right -> prev
    }
  }, { passive: true });

  document.addEventListener('keydown', (e) => {
    if (!overlay.classList.contains('active')) return;
    if (e.key === 'Escape') closeLightbox();
    else if (e.key === 'ArrowLeft' && currentGallery.length > 1) renderGalleryItem(currentIndex - 1);
    else if (e.key === 'ArrowRight' && currentGallery.length > 1) renderGalleryItem(currentIndex + 1);
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
        const items = [];
        
        // 1. Základní fotka figurky
        const captionHtml = caption ? caption.innerHTML : '';
        const fullSrc = fig.getAttribute('data-full') || img.src;
        items.push({ src: fullSrc, alt: img.alt, captionHtml: captionHtml });

        // 2. Další položky galérie definované v dětském elementu .galerie-polozky
        const extraItems = fig.querySelectorAll('.galerie-polozky > div, .galerie-polozky > figure');
        extraItems.forEach((el) => {
          const itemSrc = el.getAttribute('data-src') || (el.querySelector('img') ? el.querySelector('img').src : '');
          const itemAlt = el.getAttribute('data-alt') || (el.querySelector('img') ? el.querySelector('img').alt : '');
          const itemCap = el.querySelector('figcaption') ? el.querySelector('figcaption').innerHTML : (el.getAttribute('data-caption') || '');
          if (itemSrc) {
            items.push({ src: itemSrc, alt: itemAlt, captionHtml: itemCap });
          }
        });

        openGallery(items, 0);
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
