// merch-row.js: the "Get it on" row under an artwork. A colour swatch shows that colour's real photo (when made);
// the size picker shows that size's price (bigger sizes cost more to print). Buy stays off until its checkout step.
for (const card of document.querySelectorAll('[data-pod]')) {
  const img = card.querySelector('[data-pod-img]'); const link = card.querySelector('.mk-podimg');
  for (const sw of card.querySelectorAll('.mk-sw')) {
    sw.addEventListener('click', () => {
      for (const o of card.querySelectorAll('.mk-sw')) o.classList.toggle('on', o === sw);
      if (sw.dataset.photo && img) { img.src = sw.dataset.photo; if (link) link.href = sw.dataset.photo; }
    });
  }
  const size = card.querySelector('[data-pod-size]'); const price = card.querySelector('[data-pod-price]');
  if (size && price) size.addEventListener('change', () => { price.textContent = `$${Number(size.value).toFixed(2)}`; });
}
