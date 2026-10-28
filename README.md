# Pixel Island

Catalogo statico in italiano di giochi web, anime e musica, pubblicato su GitHub Pages senza framework o passaggi di build. La home presenta il catalogo; ogni gioco ha una pagina dedicata e viene eseguito in un iframe locale.

## Contenuti e autorizzazioni

il catalogo include soltanto:

- giochi originali realizzati per questo sito;
- build di terze parti accompagnate da licenza e attribuzioni nella rispettiva cartella;
- EmulatorJS, caricato dalla CDN ufficiale e usato senza distribuire ROM;
- metadati anime forniti da Kitsu e collegamenti di ricerca a JustWatch;
- player ufficiali YouTube e Spotify, senza estrazione di stream o download.

Non sono ammessi giochi commerciali, mod, port, ROM, embed o altri contenuti senza un’autorizzazione di redistribuzione verificabile. Prima di aggiungere una build, conserva la licenza, i crediti e gli eventuali avvisi delle risorse incluse. Le funzioni anime e musica non devono usare provider di streaming non ufficiali, proxy per aggirare restrizioni o servizi di estrazione audio/video.

## Struttura

- `public/index.html`: home con giochi recenti, preferiti e filtri adattivi.
- `public/assets/games.js`: metadati dei giochi e generazione degli URL.
- `public/assets/catalog.js`: rendering e filtri del catalogo.
- `public/assets/player.js`: player condiviso, caricamento, riprova e crediti.
- `public/assets/fullscreen.js`: schermo intero con fallback.
- `public/giochi/snake/index.html`: modello per una nuova pagina gioco.
- `public/builds/classic-games.css`: stile condiviso dei classici originali.
- `public/builds/`: build locali originali o open source con le relative licenze.
- `public/anime/`: catalogo Kitsu, watchlist locale e collegamenti a JustWatch.
- `public/musica/`: player ufficiali e raccolta locale di collegamenti.
- `public/chat/`: chat della community tramite Supabase.
- `.github/workflows/pages.yml`: pubblicazione automatica di `public/` su GitHub Pages.

## Giochi inclusi

Snake, Pong, Breakout, 2048, Campo minato e Railway Miner sono implementazioni originali ospitate localmente. Non caricano risorse di terze parti.

Sono inoltre inclusi HexGL, Magic Maze Web, Urban FPV, APEX FORMULA, Voxel Musou, K8s Games, VIM Master e Racing JS. Ogni cartella conserva licenza, crediti e avvisi dei rispettivi autori. Alcuni giochi richiedono WebGL o risorse caricate da CDN; i requisiti sono indicati nelle schede.

Retro Arcade Multiconsole usa EmulatorJS, distribuito con licenza GNU GPL-3.0, e i relativi core con le rispettive licenze. Non include ROM: l’utente deve caricare soltanto contenuti che possiede ed è autorizzato a utilizzare. File e salvataggi restano nel browser tramite IndexedDB.

## Funzioni del catalogo

La home filtra i giochi per categoria, comandi e requisiti. Ogni scheda mostra descrizione, autore, controlli e collegamento alla fonte. Preferiti e ultimi sei giochi aperti sono salvati nel `localStorage` del browser, senza account e senza sincronizzazione tra dispositivi.

La pagina anime cerca metadati nel catalogo pubblico Kitsu e conserva la watchlist nel browser. «Dove vederlo» apre JustWatch; nessun episodio è ospitato o riprodotto da Pixel Island.

La pagina musica apre link YouTube e Spotify nei rispettivi player ufficiali. Le ricerche testuali vengono aperte su YouTube. La raccolta di collegamenti resta nel browser; il sito non estrae stream e non ospita brani.

## Aggiungere un gioco

1. Verifica di avere i diritti necessari e includi licenza e crediti.
2. Scegli uno slug univoco con lettere minuscole, numeri e trattini.
3. Inserisci la build in `public/builds/nuovo-gioco/`, con `index.html` e risorse locali. I percorsi devono essere relativi o puntare alla cartella della build.
4. Aggiungi un oggetto all’array `games` di `public/assets/games.js`:

```js
{
  slug: 'nuovo-gioco',
  title: 'Nuovo Gioco',
  category: 'Arcade',
  version: '1.0',
  description: 'Una breve descrizione del gioco.',
  entry: '/builds/nuovo-gioco/index.html',
  cover: '/builds/nuovo-gioco/copertina.png',
  coverAlt: 'Copertina di Nuovo Gioco',
  author: 'Nome autore',
  inputs: ['keyboard', 'touch'],
  requirements: ['webgl'],
  controls: ['Frecce: movimento.', 'Spazio: azione.'],
  notes: 'Requisiti e consigli specifici.',
  credits: 'Autore e licenza.',
  authorUrl: 'https://example.com',
},
```

5. Copia `public/giochi/snake/index.html` in `public/giochi/nuovo-gioco/index.html`, cambia `data-game="snake"` in `data-game="nuovo-gioco"` e aggiorna titolo e testi iniziali.
6. Verifica tutti i collegamenti e pubblica le modifiche.

`entry` deve puntare a un documento HTML sotto `/builds/` sullo stesso sito. Non aggiungere URL esterni come destinazione del player condiviso.

## Pubblicare su GitHub Pages

il workflow pubblica `public/` quando viene aggiornato `main` o quando viene avviato manualmente. In **Settings → Pages → Build and deployment → Source**, seleziona **GitHub Actions**. `.nojekyll` disattiva Jekyll e conserva i file statici.

Non servono dipendenze o comandi di build.

## Verificare il sito

Servi `public/` con un server HTTP statico:

```sh
python3 -m http.server 8889 --directory public
```

Apri `http://localhost:8889/` e verifica catalogo, ricerca, filtri, preferiti, pagine gioco, avvio delle build, schermo intero, collegamenti anime e player ufficiali. I dati locali non si sincronizzano tra dispositivi e vengono persi cancellando i dati del sito.
