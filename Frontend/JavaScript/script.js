document.addEventListener('DOMContentLoaded', () => {
  const btn = document.getElementById('btnLogin');
  if (btn) {
    btn.addEventListener('click', () => {
      window.location.href = 'login.html';
    });
  }
});
