import { pt } from '../locales/pt';

const languages = { pt };

//const currentLang = 'pt';


export function translateEvent(event) {
  const lang = languages.pt;
  return lang.events[event] || lang.events.default;
}