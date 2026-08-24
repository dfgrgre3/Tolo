(function() {
  const attributesToRemove = [
    'bis_skin_checked',
    'bis_register',
    'data-gr-ext-installed',
    'data-new-gr-c-s-check-loaded',
    'data-lastpass-icon',
    'data-dashlane-rid'
  ];

  const clean = () => {
    try {
      for (let i = 0; i < attributesToRemove.length; i++) {
        const attr = attributesToRemove[i];
        const els = document.querySelectorAll('[' + attr + ']');
        for (let j = 0; j < els.length; j++) {
          els[j].removeAttribute(attr);
        }
      }
      if (document.documentElement.hasAttribute('__processed_id')) {
        document.documentElement.removeAttribute('__processed_id');
      }
    } catch (e) {}
  };

  clean();
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', clean, { once: true });
  }
  window.addEventListener('load', clean, { once: true });
})();

