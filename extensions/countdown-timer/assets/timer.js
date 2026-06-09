(() => {
  const STORAGE_KEY = 'zoro_timer_session';
  const SELECTOR = '[data-countdown-timer]';
  const TICK_RATE_MS = 200;

  const readEndTime = () => {
    try {
      const value = Number(window.localStorage.getItem(STORAGE_KEY));
      return Number.isFinite(value) && value > 0 ? value : null;
    } catch (error) {
      return null;
    }
  };

  const writeEndTime = (endTime) => {
    try {
      window.localStorage.setItem(STORAGE_KEY, String(endTime));
    } catch (error) {
      // The timer remains stable in memory when LocalStorage is unavailable.
    }
  };

  const pad = (value) => String(value).padStart(2, '0');

  const initializeTimer = (root) => {
    if (root.dataset.timerInitialized === 'true') return;
    root.dataset.timerInitialized = 'true';

    const durationMinutes = Math.max(1, Number(root.dataset.durationMinutes) || 15);
    const expiryAction = root.dataset.expiryAction === 'hide' ? 'hide' : 'message';
    const expiredText = root.dataset.expiredText || 'Offer expired!';
    const message = root.querySelector('[data-timer-message]');
    const clock = root.querySelector('[data-timer-clock]');
    const button = root.querySelector('[data-timer-button]');
    const hours = root.querySelector('[data-hours]');
    const minutes = root.querySelector('[data-minutes]');
    const seconds = root.querySelector('[data-seconds]');

    if (!message || !clock || !hours || !minutes || !seconds) return;

    let endTime = readEndTime();
    let intervalId = null;
    let expired = false;

    if (endTime === null) {
      endTime = Date.now() + durationMinutes * 60 * 1000;
      writeEndTime(endTime);
    }

    const disableButton = () => {
      if (!button) return;
      button.removeAttribute('href');
      button.setAttribute('aria-disabled', 'true');
      button.setAttribute('tabindex', '-1');
    };

    const expire = () => {
      if (expired) return;
      expired = true;
      if (intervalId !== null) window.clearInterval(intervalId);

      hours.textContent = '00';
      minutes.textContent = '00';
      seconds.textContent = '00';
      clock.setAttribute('aria-label', 'Offer expired');
      disableButton();

      if (expiryAction === 'hide') {
        root.classList.add('countdown-timer--hidden');
      } else {
        message.textContent = expiredText;
        message.setAttribute('role', 'alert');
        clock.hidden = true;
      }
    };

    const render = () => {
      const remainingMs = Math.max(0, endTime - Date.now());
      const totalSeconds = Math.ceil(remainingMs / 1000);

      hours.textContent = pad(Math.floor(totalSeconds / 3600));
      minutes.textContent = pad(Math.floor((totalSeconds % 3600) / 60));
      seconds.textContent = pad(totalSeconds % 60);

      if (remainingMs <= 0) expire();
    };

    const syncFromStorage = (event) => {
      if (event.key !== STORAGE_KEY) return;
      const syncedEndTime = Number(event.newValue);
      if (!Number.isFinite(syncedEndTime) || syncedEndTime <= 0) return;
      endTime = syncedEndTime;
      render();
    };

    render();
    if (!expired) intervalId = window.setInterval(render, TICK_RATE_MS);
    window.addEventListener('storage', syncFromStorage);
  };

  const initializeAll = () => {
    document.querySelectorAll(SELECTOR).forEach(initializeTimer);
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeAll, { once: true });
  } else {
    initializeAll();
  }

  document.addEventListener('shopify:section:load', initializeAll);
})();
