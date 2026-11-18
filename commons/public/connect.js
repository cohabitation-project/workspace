// The connect (consent) page: a form submits once. On 2026-11-18 a double-click on Approve sent two identical
// requests; the first approved the connection and the second found it gone and showed "expired", hiding the
// success. After the first submit the buttons of every form on the page are disabled and the one pressed says so.
for (const form of document.querySelectorAll('form')) {
  form.addEventListener('submit', (ev) => {
    if (form.dataset.sent) { ev.preventDefault(); return; }
    form.dataset.sent = '1';
    const pressed = ev.submitter;
    setTimeout(() => { for (const b of document.querySelectorAll('button')) b.disabled = true; if (pressed && pressed.value === 'approve') pressed.textContent = 'Approving…'; }, 0);
  });
}
