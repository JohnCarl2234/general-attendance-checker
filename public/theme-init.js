(function () {
    const saved = localStorage.getItem('app_theme') || 'dark';
    document.documentElement.dataset.theme = saved;
})();
