import { chapterStory, chapterById, loadData } from './data.js';
import { speak, VOICES } from './tts.js';

let currentAudio = null;
let currentUrl = null;

function stopAudio() {
  if (currentAudio) {
    currentAudio.pause();
    currentAudio = null;
  }
  if (currentUrl) {
    URL.revokeObjectURL(currentUrl);
    currentUrl = null;
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
      currentUrl = URL.createObjectURL(blob);
      currentAudio = new Audio(currentUrl);
      currentAudio.play().catch(() => {});
    })
    .catch(() => {});
}

export async function startStory(container, chapterId, { lines = 'intro', onComplete } = {}) {
  await loadData();
  const story = chapterStory(chapterId);
  const level = chapterById(chapterId);
  const linesArr = story[lines];
  let index = 0;

  container.innerHTML = `
    <div class="story-view">
      <div class="story-scene">${level.scene}</div>
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
    const line = linesArr[index];
    emojiEl.textContent = line.emoji;
    nameEl.textContent = line.name;
    textEl.textContent = line.text;
    nextBtn.textContent = index === linesArr.length - 1 ? '出发闯关 🚀' : '下一句 ▶';
    playLine(line);
  }

  nextBtn.addEventListener('click', () => {
    stopAudio();
    if (index < linesArr.length - 1) {
      index += 1;
      render();
    } else if (onComplete) {
      onComplete();
    }
  });

  render();
}
