// Deployment settings.
window.IAO_CONFIG = {
  // On olympiad.brilliant-edc.uz the site and the API share one domain, so the API is at /api.
  // Locally with `php artisan serve` (http://127.0.0.1:8000) Laravel serves the site too, so /api again.
  // Frontend-only development (Live Server etc. on localhost without an 8xxx port) talks to the live API.
  apiBase: /^(localhost|127\.0\.0\.1)$/.test(location.hostname) && !/^8\d{3}$/.test(location.port)
    ? 'https://olympiad.brilliant-edc.uz/api' : '/api',

  // The organisers' panel opens only at a secret address: https://<site>/<secret>.
  // Only the SHA-256 hash of <secret> is stored here, so the address cannot be
  // read from the site's code. To change it, pick a new secret and put its hash here:
  //   python -c "import hashlib; print(hashlib.sha256(b'NEW-SECRET').hexdigest())"
  adminKeyHash: '0d65d3755e68cba72e7c85ea46b1d7013c975c551626cc6f391a9a08bb882825',
};
