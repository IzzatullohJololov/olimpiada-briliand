// Deployment settings.
window.IAO_CONFIG = {
  // On register.easypos.uz the site and the API share one domain; local development uses the live API.
  apiBase: /^(localhost|127\.0\.0\.1)$/.test(location.hostname) ? 'https://register.easypos.uz/api' : '/api',

  // The organisers' panel opens only at a secret address: https://<site>/<secret>.
  // Only the SHA-256 hash of <secret> is stored here, so the address cannot be
  // read from the site's code. To change it, pick a new secret and put its hash here:
  //   python -c "import hashlib; print(hashlib.sha256(b'NEW-SECRET').hexdigest())"
  adminKeyHash: '0d65d3755e68cba72e7c85ea46b1d7013c975c551626cc6f391a9a08bb882825',
};
