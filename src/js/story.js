import { chapterStory, loadData } from './data.js';
import { speak, VOICES } from './tts.js';

let currentAudio = null;

function stopAudio() {
  if (currentAudio) {
    currentAudio.pause();
    currentAudio = null;
  }
}

function voiceFor(line) {
  if (line.voice === 'en') return line.speaker === 'book' ? VOICES.enBoy : VOICES.en;
  return VOICES.zh;
}

function playLine(line) {
  stopAudio();
  speak(line.text, { voice: voiceFor(line) })
    .then((blob) => {
      currentAudio = new Audio(URL.createObjectURL(blob));
      currentAudio.play().catch(() => {});
    })
    .catch(() => {});
}

export async function startStory(container, chapterId, { onComplete } = {}) {
  await loadData();
  const story = chapterStory(chapterId);
  const lines = story.intro;
  let index = 0;

  container.innerHTML = `
    <div class="story-view">
      <div class="story-scene">${story.scene}</div>
      <div class="story-dialog">
        <div class="story-speaker">
          <span class="story-emoji"></span>
          <span class="story-name"></span>
        </div>
        <p class="story-text"></p>
        <button class="story-next btn-primary">下一句 ▶</button>
      </div>
    </div>`;

  const emojiEl = container.querySelector('.story-emoji');
  const nameEl = container.querySelector('.story-name');
  const textEl = container.querySelector('.story-text');
  const nextBtn = container.querySelector('.story-next');

  function render() {
    const line = lines[index];
    emojiEl.textContent = line.emoji;
    nameEl.textContent = line.name;
    textEl.textContent = line.text;
    nextBtn.textContent = index === lines.length - 1 ? '出发闯关 🚀' : '下一句 ▶';
    playLine(line);
  }

  nextBtn.addEventListener('click', () => {
    stopAudio();
    if (index < lines.length - 1) {
      index += 1;
      render();
    } else if (onComplete) {
      onComplete();
    }
  });

  render();
}
