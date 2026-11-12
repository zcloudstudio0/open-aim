// Language button in the top bar: Thai (default) or English. Replaces the original
// Vietnamese toggle. The choice is kept in localStorage "aim-lang" (see th.mjs).
import { thaiEnabled, setLanguage } from './th.mjs';

export function installLocaleControl() {
  const thai = thaiEnabled();
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'aim-locale-toggle';
  button.dataset.noThai = '';
  button.textContent = thai ? 'ENGLISH' : 'ภาษาไทย';
  button.lang = thai ? 'en' : 'th';
  button.title = thai ? 'Switch to English' : 'เปลี่ยนเป็นภาษาไทย';
  button.setAttribute('aria-label', button.title);
  button.addEventListener('click', () => {
    setLanguage(thai ? 'en' : 'th');
    location.reload();
  });
  if (thai) document.documentElement.lang = 'th';
  (document.querySelector('.aim-local-actions') ?? document.body).prepend(button);
}
