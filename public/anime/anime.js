document.addEventListener('DOMContentLoaded', () => {
  const tabs = [...document.querySelectorAll('.tab-btn')];
  const contents = [...document.querySelectorAll('.tab-content')];
  const searchInput = document.getElementById('searchInput');
  const searchBtn = document.getElementById('searchBtn');
  const searchGrid = document.getElementById('searchGrid');
  const watchlistGrid = document.getElementById('watchlistGrid');
  const currentUsernameSpan = document.getElementById('currentUsername');
  const changeUserBtn = document.getElementById('changeUserBtn');
  const favCountSpan = document.getElementById('favCount');
  let currentUser = readStorage('pixel_anime_user') || 'Utente';
  let searchRequest = 0;

  currentUsernameSpan.textContent = currentUser;

  function readStorage(key) {
    try { return localStorage.getItem(key); } catch { return null; }
  }

  function writeStorage(key, value) {
    try { localStorage.setItem(key, value); } catch { /* La watchlist resta disponibile per la sessione. */ }
  }

  function getFavoritesKey() {
    return `pixel_favorites_${currentUser}`;
  }

  function getFavorites() {
    try {
      const saved = JSON.parse(readStorage(getFavoritesKey()) || '[]');
      return Array.isArray(saved) ? saved.filter((anime) => anime && anime.id && anime.title) : [];
    } catch {
      return [];
    }
  }

  function updateFavCounter() {
    favCountSpan.textContent = String(getFavorites().length);
  }

  function selectTab(selectedTab) {
    for (const tab of tabs) {
      const selected = tab === selectedTab;
      tab.classList.toggle('active', selected);
      tab.setAttribute('aria-pressed', String(selected));
    }
    for (const content of contents) content.hidden = content.id !== `tab-${selectedTab.dataset.tab}`;
    if (selectedTab.dataset.tab === 'watchlist') loadWatchlist();
  }

  for (const tab of tabs) tab.addEventListener('click', () => selectTab(tab));

  changeUserBtn.addEventListener('click', () => {
    const newName = prompt('Inserisci il tuo nome utente:', currentUser);
    if (newName === null || !newName.trim()) return;
    currentUser = newName.trim().slice(0, 40);
    writeStorage('pixel_anime_user', currentUser);
    currentUsernameSpan.textContent = currentUser;
    updateFavCounter();
    const watchlistTab = document.querySelector('[data-tab="watchlist"]');
    if (watchlistTab.classList.contains('active')) loadWatchlist();
  });

  function legalSearchUrl(title) {
    return `https://www.justwatch.com/it/cerca?q=${encodeURIComponent(title)}`;
  }

  function createAnimeCard(anime) {
    const favorites = getFavorites();
    const isFavorite = favorites.some((item) => item.id === anime.id);
    const card = document.createElement('article');
    card.className = 'anime-card';

    if (anime.image) {
      const image = document.createElement('img');
      image.className = 'anime-poster';
      image.src = anime.image;
      image.alt = `Locandina di ${anime.title}`;
      image.loading = 'lazy';
      image.referrerPolicy = 'no-referrer';
      image.addEventListener('error', () => image.remove(), { once: true });
      card.append(image);
    }

    const info = document.createElement('div');
    info.className = 'anime-info';
    const title = document.createElement('h3');
    title.className = 'anime-title';
    title.textContent = anime.title;
    const metadata = document.createElement('p');
    metadata.style.cssText = 'font-size:.8rem;opacity:.7;margin:0;';
    metadata.textContent = `${anime.episodes ?? '?'} episodi`;

    const actions = document.createElement('div');
    actions.className = 'card-actions';
    const legalLink = document.createElement('a');
    legalLink.className = 'watch-btn';
    legalLink.href = legalSearchUrl(anime.title);
    legalLink.target = '_blank';
    legalLink.rel = 'noopener noreferrer';
    legalLink.textContent = 'Dove vederlo ↗';
    legalLink.setAttribute('aria-label', `Trova servizi legali per ${anime.title}`);

    const favoriteButton = document.createElement('button');
    favoriteButton.className = `fav-btn${isFavorite ? ' active-fav' : ''}`;
    favoriteButton.type = 'button';
    favoriteButton.textContent = isFavorite ? '⭐ Salvato' : '☆ Preferito';
    favoriteButton.setAttribute('aria-pressed', String(isFavorite));
    favoriteButton.addEventListener('click', () => {
      const currentFavorites = getFavorites();
      const index = currentFavorites.findIndex((item) => item.id === anime.id);
      const nowFavorite = index === -1;
      if (nowFavorite) currentFavorites.unshift(anime);
      else currentFavorites.splice(index, 1);
      writeStorage(getFavoritesKey(), JSON.stringify(currentFavorites));
      favoriteButton.classList.toggle('active-fav', nowFavorite);
      favoriteButton.textContent = nowFavorite ? '⭐ Salvato' : '☆ Preferito';
      favoriteButton.setAttribute('aria-pressed', String(nowFavorite));
      updateFavCounter();
      const watchlistTab = document.querySelector('[data-tab="watchlist"]');
      if (watchlistTab.classList.contains('active')) loadWatchlist();
    });

    actions.append(legalLink, favoriteButton);
    info.append(title, metadata, actions);
    card.append(info);
    return card;
  }

  async function searchAnime(query) {
    const term = query.trim();
    if (!term) {
      searchGrid.textContent = 'Scrivi un titolo per avviare la ricerca.';
      return;
    }
    const requestId = ++searchRequest;
    const loading = document.createElement('p');
    loading.textContent = 'Ricerca in corso…';
    searchGrid.replaceChildren(loading);
    searchBtn.disabled = true;

    try {
      const response = await fetch(`https://kitsu.io/api/edge/anime?filter[text]=${encodeURIComponent(term)}&page[limit]=20`, {
        headers: { Accept: 'application/vnd.api+json' },
        signal: AbortSignal.timeout(15000),
      });
      if (!response.ok) throw new Error(`Kitsu ha risposto ${response.status}`);
      const data = await response.json();
      if (requestId !== searchRequest) return;
      const results = (data.data || []).map((item) => {
        const attributes = item.attributes || {};
        const titles = attributes.titles || {};
        return {
          id: `kitsu-${item.id}`,
          title: attributes.canonicalTitle || titles.en || titles.en_jp || titles.ja_jp || 'Titolo non disponibile',
          image: attributes.posterImage?.small || attributes.posterImage?.medium || '',
          episodes: attributes.episodeCount || '?',
        };
      });
      searchGrid.replaceChildren();
      if (!results.length) {
        searchGrid.textContent = `Nessun anime trovato per «${term}».`;
        return;
      }
      const fragment = document.createDocumentFragment();
      for (const anime of results) fragment.append(createAnimeCard(anime));
      searchGrid.append(fragment);
    } catch (error) {
      if (requestId !== searchRequest) return;
      searchGrid.textContent = `Ricerca non riuscita (${error.message}). Riprova tra poco.`;
    } finally {
      if (requestId === searchRequest) searchBtn.disabled = false;
    }
  }

  function loadWatchlist() {
    const favorites = getFavorites();
    watchlistGrid.replaceChildren();
    updateFavCounter();
    if (!favorites.length) {
      const empty = document.createElement('p');
      empty.textContent = 'Non hai ancora aggiunto preferiti.';
      watchlistGrid.append(empty);
      return;
    }
    const fragment = document.createDocumentFragment();
    for (const anime of favorites) fragment.append(createAnimeCard(anime));
    watchlistGrid.append(fragment);
  }

  searchBtn.addEventListener('click', () => searchAnime(searchInput.value));
  searchInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') searchAnime(searchInput.value);
  });
  window.addEventListener('storage', (event) => {
    if (event.key === getFavoritesKey() || event.key === null) {
      updateFavCounter();
      if (document.querySelector('[data-tab="watchlist"]').classList.contains('active')) loadWatchlist();
    }
  });

  updateFavCounter();
  searchAnime('Naruto');
});
