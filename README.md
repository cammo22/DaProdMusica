# DaProd Musica 0.4.0

Player Android, Windows e browser. [Download](https://github.com/cammo22/DaProdMusica/releases).

## Modifiche della 0.4.0

- Corretto il blocco audio Android `Unexpected runtime error`: il processore PCM non deve ricopiare buffer vuoti riciclati da Media3. È stato riprodotto in un test Android prima della correzione.
- UI più semplice: Galassia, Album e Preferiti sono tre pagine separate.
- Galassia a sfera con copertine reali, rotazione tramite trascinamento e inerzia.
- Player compatto espandibile con tap o trascinamento verso l'alto. Nell'espanso il titolo compare solo in alto.
- Un pulsante Effetti: tap cambia effetto; pressione lunga attiva/disattiva il cambio automatico.
- 22 effetti con interazioni specifiche, non una deformazione identica per tutti.
- Colori ricavati dalle copertine e selezione dell'effetto iniziale in base ad album e brano.
- Risorse dell'icona Android copiate esplicitamente nel progetto generato.

## Android e verifiche

Media3 ExoPlayer vive in un MediaSessionService, con focus audio, cuffie, notifica e persistenza della coda. Il PiP usa una vista nativa con copertina, animazione e controlli. La pillola e l'animazione del launcher dipendono dal telefono.

La release esegue un test Android su emulatore prima di compilare l'APK: riproduzione dei 47 file, seek, pausa/ripresa, background e controlli PiP. Firma, manifest, risorse audio e allineamento ELF a 16KB sono verificati separatamente. L'emulatore non sostituisce le prove sul telefono dell'utente.

Servono Android 8+ e ARM64. Gli aggiornamenti aprono la release GitHub; l'installazione interna non è ancora implementata. L'installer Windows non ha certificato Authenticode.

## Audio e karaoke

Il catalogo contiene 47 brani in tre album, con 46 copertine incorporate negli MP3. Il brano senza immagine usa la copertina del suo album. Audio offline incluso nei pacchetti.

Tutti i brani sono stati elaborati sul PC con RTX4060 e Systran/faster-whisper-small. `public/lyrics.json` contiene bozze con tempi per parola; `public/lyrics-report.json` il rapporto. Cantato e dialetti richiedono correzioni nello Studio. Il modello resta sul PC e non è incluso nell'APK.

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

I preset DaProdSuite e le scene 3D mantengono provenienza e licenza in `THIRD_PARTY.md`. Nessuna compatibilità con file .milk è dichiarata. Flatpak e hosting pubblico browser non sono distribuiti in questa versione.
