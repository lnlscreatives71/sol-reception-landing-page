// Close any open header "Features" dropdown on outside click or Escape.
document.addEventListener('click', function (e) {
  document.querySelectorAll('details.nav-dd[open]').forEach(function (d) {
    if (!d.contains(e.target)) d.removeAttribute('open');
  });
});
document.addEventListener('keydown', function (e) {
  if (e.key === 'Escape') {
    document.querySelectorAll('details.nav-dd[open]').forEach(function (d) {
      d.removeAttribute('open');
    });
  }
});
