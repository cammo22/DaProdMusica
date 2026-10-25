# DaProd Musica 0.5.0

Player Android, Windows e browser. [Download](https://github.com/cammo22/DaProdMusica/releases).

## Modifiche della 0.5.0

- Galassia con effetti sullo sfondo e trascinamento che segue il dito.
- Player espandibile, interfaccia ripulita e navigazione Galassia / Album / Preferiti.
- Effetti: tap cambia, pressione lunga apre 22 anteprime reali e il selettore Shuffle. Ogni effetto ha una reazione specifica e persistente al tap.
- PiP eliminato. Widget Home ridimensionabile con controlli e sei animazioni leggere casuali.
- Indietro chiude i menu e riduce il player; Home mantiene la musica. Rimuovere l’app dal multitasking ferma la riproduzione.
- Aggiornamenti Android scaricati dall’app, verificati con SHA-256, package, firma e versione. Android conserva la conferma finale di installazione.
- DapGalleria nelle impostazioni.

## Android e verifiche

Media3 ExoPlayer vive in un MediaSessionService con copertina, comandi di sistema, cuffie/Bluetooth, focus audio e coda persistente. La grafica del player di sistema e le eventuali pillole dipendono dal telefono.

Il widget usa RemoteViews: il launcher riproduce piccoli fotogrammi Canvas, senza WebGL, analisi audio, overlay, timer del servizio o wake lock aggiuntivi. Gli effetti del widget sono varianti semplificate, non i 22 shader interattivi del player.

La CI verifica tutti i 47 file audio, seek/pausa/ripresa, un MediaController reale in background, rendering e controlli del widget, il bridge Indietro e rifiuto degli aggiornamenti non validi. Firma, manifest, audio e allineamento ELF a 16KB sono verificati sul pacchetto. Questi test non sostituiscono la prova su telefono fisico o l’installazione completa di una futura release.

Servono Android 8+ e ARM64. Da Impostazioni → Aggiornamenti si scaricano le nuove versioni senza aprire il browser; al primo utilizzo Android richiede di autorizzare questa app a installare pacchetti. Su Windows il menu apre la release; l’installer Windows non ha certificato Authenticode.

## Audio e karaoke

Il catalogo contiene 47 brani in tre album, con 46 copertine incorporate negli MP3. Il brano senza immagine usa la copertina del suo album. Audio offline incluso nei pacchetti.

Tutti i brani sono stati elaborati sul PC con RTX4060 e Systran/faster-whisper-small. `public/lyrics.json` contiene bozze con tempi per parola; `public/lyrics-report.json` il rapporto. Cantato e dialetti richiedono correzioni nello Studio. Il modello resta sul PC e non Ã¨ incluso nell'APK.

```sh
python -m venv .venv
.venv/Scripts/pip install -r scripts/requirements-lyrics.txt
# Windows GPU: aggiungere nvidia-cublas-cu12 e nvidia-cudnn-cu12
.venv/Scripts/python scripts/transcribe-library.py --model small --device cuda
```

## Sviluppo

```sh
npm ci
node scripts/restore-media.mjs
npm test
npm run dev
```

Il ripristino del bundle audio richiede `gh` autenticato e verifica SHA-256. Browser locale: http://127.0.0.1:5173, Studio: /studio.html. Le copertine sono versionate, gli MP3 sono nel bundle release e non in Git.

Build web: `npm run build`. Windows: `npm run desktop:build`. Android: `npm run android:init -- --ci`, `node scripts/configure-android.mjs`, `npm run android:build -- --apk --target aarch64 --ci`. La build CI imposta esplicitamente `RUSTFLAGS=-C link-arg=-Wl,-z,max-page-size=16384`.

Per aggiornare copertine/metadata: `npm run import:music -- percorso`, quindi `python scripts/extract-palettes.py` con Pillow installato. Gli originali non vengono modificati.

Per le release: sorgenti puliti e pushati su main, poi `node scripts/prepare-release.mjs` con il login gh locale. Il comando prepara una bozza e avvia il workflow senza salvare token nel repository. Pubblicare dopo verifica degli allegati.

I preset DaProdSuite e le scene 3D mantengono provenienza e licenza in `THIRD_PARTY.md`. Nessuna compatibilitÃ  con file .milk Ã¨ dichiarata. Flatpak e hosting pubblico browser non sono distribuiti in questa versione.
