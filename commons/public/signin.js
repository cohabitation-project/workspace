/* the code box: six characters in, signed in */
const go = () => { const c = document.getElementById('si-code').value.trim().toUpperCase(); if (c) location.href = '/go/' + encodeURIComponent(c); };
document.getElementById('si-go').onclick = go;
document.getElementById('si-code').addEventListener('keydown', (e) => { if (e.key === 'Enter') go(); });
document.getElementById('si-code').focus();
