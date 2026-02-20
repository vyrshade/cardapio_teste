import { pt } from '../locales/pt';

const languages = { pt };

//const currentLang = 'pt';

export function translateError(error) {
  const code = error?.code || error?.message || 'default';
  const lang = languages.pt;
  return lang.errors[code] || lang.errors.default;
}
