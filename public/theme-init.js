(function () {
    const saved = localStorage.getItem('app_theme') || 'light';
    document.documentElement.dataset.theme = saved;
})();
