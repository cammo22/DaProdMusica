// Serializes user intent, not playback promises: the most recent click wins.
export class PlaybackController {
  constructor(audio, prepare, onError) {
    this.audio = audio;
    this.prepare = prepare;
    this.onError = onError;
    this.generation = 0;
  }

  async play(load = () => {}) {
    const generation = ++this.generation;
    try {
      await this.prepare();
      if (generation !== this.generation) return;
      load();
      await this.audio.play();
    } catch (error) {
      if (generation === this.generation && error.name !== 'AbortError') this.onError(error);
    }
  }

  pause() {
    ++this.generation;
    this.audio.pause();
  }
}

export function nextTrackIndex(index, count, { direction = 1, shuffle = false, repeat = false, ended = false, random = Math.random } = {}) {
  if (count < 1) return null;
  if (shuffle && count > 1) {
    // Select uniformly from all tracks except the current one, without an unbounded loop.
    const choice = Math.min(count - 2, Math.floor(random() * (count - 1)));
    return choice >= index ? choice + 1 : choice;
  }
  const next = index + direction;
  if (ended && next >= count && !repeat) return null;
  return (next + count) % count;
}
