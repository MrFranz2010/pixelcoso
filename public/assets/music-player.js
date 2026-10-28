const YOUTUBE_EMBED_ORIGIN = 'https://www.youtube-nocookie.com';
const LIBRARY_KEY = 'pixel-island-music-library-v1';

const searchForm = document.querySelector('#musicSearchForm');
const queryInput = document.querySelector('#musicQuery');
const navButtons = [...document.querySelectorAll('.music-nav-button')];
const viewTitle = document.querySelector('#musicViewTitle');
const musicHelp = document.querySelector('#musicHelp');
const status = document.querySelector('#musicStatus');
const results = document.querySelector('#musicResults');
const frame = document.querySelector('#musicFrame');
const playerPlaceholder = document.querySelector('#playerPlaceholder');
const playerArtwork = document.querySelector('#playerArtwork');
const playerHeading = document.querySelector('#playerHeading');
const playerArtist = document.querySelector('#playerArtist');
const playerOpenLink = document.querySelector('#playerOpenLink');
const playerLoadStatus = document.querySelector('#playerLoadStatus');
const saveCurrentButton = document.querySelector('#saveCurrent');
let library = loadLibrary();
let currentItem = null;
let activeView = 'home';
let playerLoadTimer;

function setStatus(message, isError = false) {
  status.textContent = message;
  if (isError) status.dataset.error = 'true';
  else delete status.dataset.error;
}

function parseMediaLink(value) {
  let url;
  try { url = new URL(value.trim()); } catch { return null; }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
  const host = url.hostname.toLowerCase().replace(/^www\./, '');
  const parts = url.pathname.split('/').filter(Boolean);

  if (['youtube.com', 'm.youtube.com', 'music.youtube.com', 'youtube-nocookie.com', 'youtu.be'].includes(host)) {
    let videoId = url.searchParams.get('v') || '';
    if (host === 'youtu.be') videoId = parts[0] || videoId;
    if (!videoId && ['embed', 'shorts', 'live'].includes(parts[0])) videoId = parts[1] || '';
    if (parts[0] === 'embed' && parts[1] === 'videoseries') videoId = '';
    const playlistId = url.searchParams.get('list') || '';
    if (videoId && !/^[A-Za-z0-9_-]{11}$/.test(videoId)) return null;
    if (playlistId && !/^[A-Za-z0-9_-]{10,}$/.test(playlistId)) return null;
    if (!videoId && !playlistId) return null;
    return {
      key: `youtube:${videoId || playlistId}`,
      provider: 'youtube',
      type: videoId ? 'video' : 'playlist',
      id: videoId || playlistId,
      title: videoId ? 'Video YouTube' : 'Playlist YouTube',
      url: videoId
        ? `https://www.youtube.com/watch?v=${videoId}`
        : `https://www.youtube.com/playlist?list=${playlistId}`,
      thumbnail: videoId ? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg` : '',
    };
  }

  if (host === 'open.spotify.com') {
    const supportedTypes = ['track', 'album', 'playlist', 'episode'];
    const typeIndex = parts.findIndex((part) => supportedTypes.includes(part));
    const type = typeIndex >= 0 ? parts[typeIndex] : '';
    const id = typeIndex >= 0 ? parts[typeIndex + 1] || '' : '';
    if (!/^[A-Za-z0-9]{22}$/.test(id)) return null;
    const labels = { track: 'Brano Spotify', album: 'Album Spotify', playlist: 'Playlist Spotify', episode: 'Episodio Spotify' };
    return {
      key: `spotify:${type}:${id}`,
      provider: 'spotify',
      type,
      id,
      title: labels[type],
      url: `https://open.spotify.com/${type}/${id}`,
      thumbnail: '',
    };
  }
  return null;
}

function normalizeSavedItem(item) {
  if (!item || typeof item !== 'object') return null;
  if (typeof item.url === 'string') return parseMediaLink(item.url);
  if (item.provider === 'spotify' && item.id) return parseMediaLink(`https://open.spotify.com/playlist/${item.id}`);
  if (item.videoId) return parseMediaLink(`https://www.youtube.com/watch?v=${item.videoId}`);
  if (item.playlistId) return parseMediaLink(`https://www.youtube.com/playlist?list=${item.playlistId}`);
  return null;
}

function loadLibrary() {
  try {
    const saved = JSON.parse(localStorage.getItem(LIBRARY_KEY) || '[]');
    if (!Array.isArray(saved)) return [];
    return [...new Map(saved.map(normalizeSavedItem).filter(Boolean).map((item) => [item.key, item])).values()];
  } catch {
    return [];
  }
}

function saveLibrary() {
  try { localStorage.setItem(LIBRARY_KEY, JSON.stringify(library)); }
  catch { setStatus('La raccolta non può essere salvata su questo dispositivo.', true); }
}

function isSaved(item) {
  return Boolean(item && library.some((saved) => saved.key === item.key));
}

function updateSaveButton() {
  saveCurrentButton.hidden = !currentItem;
  if (!currentItem) return;
  const saved = isSaved(currentItem);
  saveCurrentButton.textContent = saved ? 'Rimuovi dalla raccolta' : '+ Raccolta';
  saveCurrentButton.setAttribute('aria-pressed', String(saved));
}

function getEmbedUrl(item) {
  if (item.provider === 'spotify') return `https://open.spotify.com/embed/${item.type}/${item.id}`;
  if (item.type === 'playlist') {
    const url = new URL('/embed/videoseries', YOUTUBE_EMBED_ORIGIN);
    url.searchParams.set('list', item.id);
    return url.href;
  }
  const url = new URL(`/embed/${item.id}`, YOUTUBE_EMBED_ORIGIN);
  url.searchParams.set('playsinline', '1');
  return url.href;
}

function playItem(item) {
  currentItem = item;
  clearTimeout(playerLoadTimer);
  playerHeading.textContent = item.title;
  playerArtist.textContent = item.provider === 'spotify' ? 'Spotify · player ufficiale' : 'YouTube · player ufficiale';
  playerOpenLink.href = item.url;
  playerOpenLink.textContent = item.provider === 'spotify' ? 'Apri Spotify ↗' : 'Apri YouTube ↗';
  playerOpenLink.hidden = false;
  playerPlaceholder.hidden = true;
  playerArtwork.hidden = true;
  frame.hidden = false;
  frame.title = `${item.title} · player ufficiale`;
  frame.src = getEmbedUrl(item);
  playerLoadStatus.textContent = 'Connessione al player ufficiale…';
  playerLoadStatus.hidden = false;
  playerLoadTimer = setTimeout(() => {
    playerLoadStatus.textContent = 'Il player non risponde. Usa il collegamento ufficiale oppure riprova.';
    playerLoadStatus.hidden = false;
  }, 15000);
  updateSaveButton();
  setStatus(`Aperto: ${item.title}. La riproduzione è gestita dal servizio ufficiale.`);
}

frame.addEventListener('load', () => {
  if (!frame.src.startsWith('https://')) return;
  clearTimeout(playerLoadTimer);
  playerLoadStatus.hidden = true;
});

function toggleSaved(item) {
  const index = library.findIndex((saved) => saved.key === item.key);
  if (index >= 0) {
    library.splice(index, 1);
    setStatus(`Rimosso dalla raccolta: ${item.title}.`);
  } else {
    library.unshift(item);
    setStatus(`Salvato nella raccolta: ${item.title}.`);
  }
  saveLibrary();
  updateSaveButton();
  if (activeView === 'library') renderLibrary();
}

function createCard(item) {
  const card = document.createElement('article');
  card.className = 'music-card';
  const coverButton = document.createElement('button');
  coverButton.className = 'music-card-cover';
  coverButton.type = 'button';
  coverButton.setAttribute('aria-label', `Apri ${item.title}`);
  if (item.thumbnail) {
    const image = document.createElement('img');
    image.src = item.thumbnail;
    image.alt = '';
    image.loading = 'lazy';
    image.referrerPolicy = 'no-referrer';
    coverButton.append(image);
  }
  const playMark = document.createElement('span');
  playMark.setAttribute('aria-hidden', 'true');
  playMark.textContent = '▶';
  coverButton.append(playMark);
  coverButton.addEventListener('click', () => playItem(item));

  const body = document.createElement('div');
  body.className = 'music-card-body';
  const title = document.createElement('div');
  title.className = 'music-card-title';
  title.textContent = item.title;
  const meta = document.createElement('p');
  meta.className = 'music-card-meta';
  meta.textContent = item.provider === 'spotify' ? 'Spotify · player ufficiale' : 'YouTube · player ufficiale';
  const actions = document.createElement('div');
  actions.className = 'music-card-actions';
  const playButton = document.createElement('button');
  playButton.type = 'button';
  playButton.textContent = 'Apri player';
  playButton.addEventListener('click', () => playItem(item));
  const openLink = document.createElement('a');
  openLink.href = item.url;
  openLink.target = '_blank';
  openLink.rel = 'noopener noreferrer';
  openLink.textContent = 'Sito ufficiale ↗';
  const removeButton = document.createElement('button');
  removeButton.type = 'button';
  removeButton.className = 'music-save-button';
  removeButton.textContent = 'Rimuovi';
  removeButton.addEventListener('click', () => toggleSaved(item));
  actions.append(playButton, openLink, removeButton);
  body.append(title, meta, actions);
  card.append(coverButton, body);
  return card;
}

function renderLibrary() {
  results.replaceChildren();
  if (!library.length) {
    const empty = document.createElement('p');
    empty.className = 'music-empty';
    empty.textContent = 'La raccolta è vuota. Apri un link e premi «+ Raccolta» per salvarlo su questo dispositivo.';
    results.append(empty);
  } else {
    const fragment = document.createDocumentFragment();
    for (const item of library) fragment.append(createCard(item));
    results.append(fragment);
  }
  setStatus(`${library.length} ${library.length === 1 ? 'collegamento salvato' : 'collegamenti salvati'} su questo dispositivo.`);
}

function showView(view) {
  activeView = view;
  for (const button of navButtons) {
    const selected = button.dataset.view === view;
    button.classList.toggle('is-active', selected);
    if (selected) button.setAttribute('aria-current', 'page');
    else button.removeAttribute('aria-current');
  }
  if (view === 'library') {
    viewTitle.textContent = 'La tua raccolta';
    musicHelp.hidden = true;
    renderLibrary();
  } else {
    viewTitle.textContent = 'Player ufficiale';
    musicHelp.hidden = false;
    results.replaceChildren();
    setStatus(currentItem ? `Aperto: ${currentItem.title}.` : 'Nessun contenuto selezionato.');
  }
}

function openYoutubeSearch(query) {
  const url = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
  const opened = window.open(url, '_blank');
  if (!opened) {
    setStatus('Il browser ha bloccato la nuova scheda. Consenti i popup per aprire la ricerca su YouTube.', true);
    return;
  }
  opened.opener = null;
  setStatus(`Ricerca «${query}» aperta su YouTube.`);
}

function handleQuery(value) {
  const query = value.trim();
  if (!query) {
    setStatus('Inserisci un link, un titolo o un artista.', true);
    return;
  }
  const item = parseMediaLink(query);
  if (item) {
    playItem(item);
    return;
  }
  if (/^https?:\/\//i.test(query)) {
    setStatus('Link non supportato. Usa un link YouTube o Spotify valido.', true);
    return;
  }
  openYoutubeSearch(query);
}

searchForm.addEventListener('submit', (event) => {
  event.preventDefault();
  handleQuery(queryInput.value);
});

saveCurrentButton.addEventListener('click', () => {
  if (currentItem) toggleSaved(currentItem);
});

for (const button of navButtons) button.addEventListener('click', () => showView(button.dataset.view));

document.querySelector('#quickSearches').addEventListener('click', (event) => {
  const button = event.target.closest('[data-query]');
  if (button) openYoutubeSearch(button.dataset.query);
});

window.addEventListener('storage', (event) => {
  if (event.key !== LIBRARY_KEY && event.key !== null) return;
  library = loadLibrary();
  updateSaveButton();
  if (activeView === 'library') renderLibrary();
});

showView('home');
