const views = {
  map: () => `<div class="placeholder">🗺️ 冒险地图（待建）</div>`,
  shop: () => `<div class="placeholder">🏪 商店（待建）</div>`,
  wardrobe: () => `<div class="placeholder">🧸 装扮（待建）</div>`,
};

const viewEl = document.getElementById('view');

function render(view) {
  const fn = views[view] || views.map;
  viewEl.innerHTML = fn();
  document.querySelectorAll('.tab').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.view === view);
  });
}

document.querySelectorAll('.tab').forEach((btn) => {
  btn.addEventListener('click', () => render(btn.dataset.view));
});

render('map');
