let cache = null;

async function loadJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`加载失败: ${url} (${res.status})`);
  return res.json();
}

export async function loadData() {
  if (cache) return cache;
  const [story, levels, vocabulary, economy, avatars] = await Promise.all([
    loadJson('data/story.json'),
    loadJson('data/levels.json'),
    loadJson('data/vocabulary.json'),
    loadJson('data/economy.json'),
    loadJson('data/avatars.json'),
  ]);
  cache = { story, levels, vocabulary, economy, avatars };
  return cache;
}

export function wordById(id) {
  return cache.vocabulary.words.find((w) => w.id === id);
}

export function chapterById(id) {
  return cache.levels.chapters.find((c) => c.id === id);
}

export function chapterStory(id) {
  return cache.story.chapters.find((c) => c.id === id);
}

export function avatarItemById(id) {
  return cache.avatars.items.find((i) => i.id === id);
}
