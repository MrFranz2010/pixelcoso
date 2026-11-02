import { games, gamePage } from './games.js';

const storageKeys = {
  favorites: 'epstein-island:favorites',
  recent: 'epstein-island:recent',
  visits: 'epstein-island:game-visits',
};
const backupFormat = 'franzhub-local-backup';
const backupVersion = 1;
const maxBackupSize = 10 * 1024 * 1024;
const gameBySlug = new Map(games.map((game) => [game.slug, game]));
const status = document.getElementById('backupStatus');

function readJson(key, fallback) {
  try {
    const value = localStorage.getItem(key);
    return value === null ? fallback : JSON.parse(value);
  } catch (error) {
    console.error(`Impossibile leggere ${key} dalle statistiche locali.`, error);
    return fallback;
  }
}

function readSlugList(key) {
  const value = readJson(key, []);
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter((slug) => typeof slug === 'string' && gameBySlug.has(slug)))];
}

function makeGameLink(game, suffix = '') {
  const link = document.createElement('a');
  link.className = 'stats-game-link';
  link.href = gamePage(game);
  link.textContent = `${game.title}${suffix}`;
  return link;
}

function renderStats() {
  const favorites = readSlugList(storageKeys.favorites);
  const recent = readSlugList(storageKeys.recent).slice(0, 6);
  const savedVisits = readJson(storageKeys.visits, {});
  const visits = savedVisits && typeof savedVisits === 'object' && !Array.isArray(savedVisits)
    ? savedVisits
    : {};
  const rankedGames = Object.entries(visits)
    .filter(([slug, count]) => gameBySlug.has(slug) && Number.isSafeInteger(count) && count > 0)
    .sort((left, right) => right[1] - left[1])
    .slice(0, 5);
  const visitTotal = Object.entries(visits)
    .filter(([slug, count]) => gameBySlug.has(slug) && Number.isSafeInteger(count) && count > 0)
    .reduce((sum, [, count]) => sum + count, 0);

  document.getElementById('visitsCount').textContent = String(visitTotal);
  document.getElementById('favoritesCount').textContent = String(favorites.length);
  document.getElementById('recentCount').textContent = String(recent.length);

  const favoriteList = document.getElementById('favoriteList');
  favoriteList.replaceChildren(...favorites.map((slug) => makeGameLink(gameBySlug.get(slug))));
  document.getElementById('emptyFavoriteList').hidden = favorites.length > 0;

  const popularList = document.getElementById('popularList');
  popularList.replaceChildren(...rankedGames.map(([slug, count]) => makeGameLink(gameBySlug.get(slug), ` · ${count}`)));
  document.getElementById('emptyPopularList').hidden = rankedGames.length > 0;
}

function setStatus(message, isError = false) {
  status.textContent = message;
  status.dataset.error = String(isError);
}

function createBackup() {
  const entries = {};
  for (let index = 0; index < localStorage.length; index += 1) {
    const key = localStorage.key(index);
    if (key !== null) entries[key] = localStorage.getItem(key);
  }
  return {
    format: backupFormat,
    version: backupVersion,
    createdAt: new Date().toISOString(),
    entries,
  };
}

function downloadBackup() {
  try {
    const contents = JSON.stringify(createBackup(), null, 2);
    const file = new Blob([contents], { type: 'application/json' });
    const url = URL.createObjectURL(file);
    const link = document.createElement('a');
    link.href = url;
    link.download = `franzhub-backup-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setStatus('Backup pronto. Salva il file in File o in un’altra posizione sicura.');
  } catch (error) {
    console.error('Impossibile esportare i dati locali.', error);
    setStatus('Esportazione non riuscita. Controlla che il browser consenta l’accesso ai dati locali.', true);
  }
}

function parseBackup(data) {
  if (!data || data.format !== backupFormat || data.version !== backupVersion
    || !data.entries || typeof data.entries !== 'object' || Array.isArray(data.entries)) {
    throw new TypeError('Il file non è un backup FranzHUB valido o usa una versione non supportata.');
  }

  const entries = Object.entries(data.entries);
  if (entries.some(([key, value]) => !key || typeof value !== 'string')) {
    throw new TypeError('Il backup contiene dati non validi.');
  }
  return entries;
}

function restoreEntries(entries) {
  const previous = new Map();
  const changedKeys = [];
  try {
    for (const [key] of entries) previous.set(key, localStorage.getItem(key));
    for (const [key, value] of entries) {
      localStorage.setItem(key, value);
      changedKeys.push(key);
    }
  } catch (error) {
    let rollbackFailed = false;
    for (const key of changedKeys) {
      try {
        localStorage.removeItem(key);
      } catch (rollbackError) {
        rollbackFailed = true;
        console.error(`Impossibile ripristinare il dato ${key} dopo un errore di importazione.`, rollbackError);
      }
    }
    for (const key of changedKeys) {
      const oldValue = previous.get(key);
      if (oldValue === null) continue;
      try {
        localStorage.setItem(key, oldValue);
      } catch (rollbackError) {
        rollbackFailed = true;
        console.error(`Impossibile ripristinare il dato ${key} dopo un errore di importazione.`, rollbackError);
      }
    }
    if (rollbackFailed) {
      const restoreError = new Error('Importazione non riuscita e ripristino dei dati precedente incompleto.');
      restoreError.name = 'BackupRestoreError';
      throw restoreError;
    }
    throw error;
  }
}

async function importBackup(file) {
  if (!file) return;
  if (file.size > maxBackupSize) {
    setStatus('Il file supera il limite di 10 MB.', true);
    return;
  }

  try {
    const backup = JSON.parse(await file.text());
    const entries = parseBackup(backup);
    if (!window.confirm(`Importare ${entries.length} dati? I valori con la stessa chiave saranno sostituiti; gli altri salvataggi resteranno invariati.`)) {
      setStatus('Importazione annullata.');
      return;
    }
    restoreEntries(entries);
    renderStats();
    setStatus('Backup importato. I dati sono stati ripristinati su questo dispositivo.');
  } catch (error) {
    console.error('Impossibile importare il backup locale.', error);
    setStatus(error instanceof SyntaxError || error instanceof TypeError
      ? error.message
      : error.name === 'BackupRestoreError'
        ? error.message
        : 'Importazione non riuscita. I dati precedenti sono stati mantenuti.', true);
  }
}

document.getElementById('exportBackup').addEventListener('click', downloadBackup);
document.getElementById('chooseBackup').addEventListener('click', () => {
  document.getElementById('importBackup').click();
});
document.getElementById('importBackup').addEventListener('change', (event) => {
  const [file] = event.currentTarget.files;
  importBackup(file);
  event.currentTarget.value = '';
});
window.addEventListener('storage', renderStats);
renderStats();
