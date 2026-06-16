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
      attributesToRemove.forEach(attr => {
        document.querySelectorAll('[' + attr + ']').forEach(el => {
          el.removeAttribute(attr);
        });
      });
      if (document.documentElement.hasAttribute('__processed_id')) {
        document.documentElement.removeAttribute('__processed_id');
      }
    } catch (e) {}
  };

  clean();

  try {
    const observer = new MutationObserver((mutations) => {
      let shouldClean = false;
      for (let i = 0; i < mutations.length; i++) {
        if (attributesToRemove.includes(mutations[i].attributeName) || mutations[i].attributeName === '__processed_id') {
          shouldClean = true;
          break;
        }
      }
      if (shouldClean) clean();
    });

    observer.observe(document.documentElement, {
      attributes: true,
      subtree: true,
      attributeFilter: attributesToRemove.concat(['__processed_id'])
    });

    const disconnect = () => {
      try { observer.disconnect(); } catch (e) {}
    };

    if (document.readyState === 'complete') {
      disconnect();
    } else {
      window.addEventListener('load', disconnect, { once: true });
      setTimeout(disconnect, 3000); // safety fallback
    }
  } catch (e) {}
})();
