import { games, siteUrl } from './games.js';

const header = document.querySelector('.site-header');
if (header) {
  const game = games.find((entry) => entry.slug === document.body.dataset.game);
  const pageTitle = game?.title || document.title.split(/\s+[|—]\s+/)[0].trim();
  const pageUrl = new URL(location.pathname, location.origin).href;
  const statisticsUrl = new URL(siteUrl('/statistiche/'));
  if (statisticsUrl.pathname !== location.pathname) {
    const statisticsLink = document.createElement('a');
    statisticsLink.className = 'header-link music-nav-link';
    statisticsLink.href = statisticsUrl.href;
    statisticsLink.textContent = 'Statistiche';
    header.append(statisticsLink);
  }

  const emulatorUrl = new URL(siteUrl('/emulatore/'));
  if (emulatorUrl.pathname !== location.pathname) {
    const emulatorLink = document.createElement('a');
    emulatorLink.className = 'header-link music-nav-link';
    emulatorLink.href = emulatorUrl.href;
    emulatorLink.textContent = 'Emulatore';
    header.append(emulatorLink);
  }

  if (game) {
    try {
      const visitsKey = 'epstein-island:game-visits';
      const savedVisits = JSON.parse(localStorage.getItem(visitsKey) || '{}');
      const visits = savedVisits && typeof savedVisits === 'object' && !Array.isArray(savedVisits)
        ? savedVisits
        : {};
      const count = Number.isSafeInteger(visits[game.slug]) && visits[game.slug] >= 0
        ? visits[game.slug]
        : 0;
      visits[game.slug] = count + 1;
      localStorage.setItem(visitsKey, JSON.stringify(visits));
    } catch (error) {
      console.error('Impossibile aggiornare le statistiche locali dei giochi.', error);
    }
  }

  const issueUrl = new URL('https://github.com/MrFranz2010/epsteinisland1945/issues/new');
  issueUrl.searchParams.set('title', `[Segnalazione] ${pageTitle}`);
  issueUrl.searchParams.set('body', [
    '## Descrizione',
    '',
    'Descrivi cosa non funziona e, se possibile, i passaggi per riprodurlo.',
    '',
    '## Dettagli',
    `- Pagina: ${pageTitle}`,
    `- URL: ${pageUrl}`,
    '- Browser e dispositivo: ',
  ].join('\n'));

  const link = document.createElement('a');
  link.className = 'header-link music-nav-link';
  link.href = issueUrl.href;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  link.title = 'Si apre GitHub con una segnalazione precompilata';
  link.textContent = 'Segnala un problema ↗';
  header.append(link);
}
