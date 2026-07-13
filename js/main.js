// Language toggle — persists choice, defaults to browser language (FR unless clearly English)
(function () {
  var KEY = 'jd-lang';
  var saved = localStorage.getItem(KEY);
  var lang = saved || ((navigator.language || 'fr').toLowerCase().indexOf('en') === 0 ? 'en' : 'fr');
  setLang(lang);

  function setLang(l) {
    document.documentElement.setAttribute('data-lang', l);
    document.documentElement.setAttribute('lang', l);
    localStorage.setItem(KEY, l);
    var sl = document.getElementById('submittedLang');
    if (sl) sl.value = l;
  }

  var btn = document.getElementById('langToggle');
  if (btn) btn.addEventListener('click', function () {
    setLang(document.documentElement.getAttribute('data-lang') === 'fr' ? 'en' : 'fr');
  });
})();
