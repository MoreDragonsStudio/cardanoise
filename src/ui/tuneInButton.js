// Big "Tune in" button. Browsers only allow audio to start from inside a
// user gesture handler, so the Strudel engine is only initialized here, on
// click — never automatically on page load.

export function createTuneInButton(container, { onTuneIn, onTuneOut }) {
  const button = document.createElement('button');
  button.className = 'tune-in';
  button.textContent = 'Tune in';
  container.appendChild(button);

  let playing = false;

  button.addEventListener('click', async () => {
    if (playing) {
      onTuneOut?.();
      button.textContent = 'Tune in';
      playing = false;
      return;
    }

    button.disabled = true;
    button.textContent = 'Tuning in…';
    try {
      await onTuneIn();
      playing = true;
      button.textContent = 'Tuned in — stop';
    } catch (err) {
      console.error('Failed to start audio', err);
      button.textContent = 'Tune in (retry)';
    } finally {
      button.disabled = false;
    }
  });

  return button;
}
