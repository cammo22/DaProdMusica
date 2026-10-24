# DaProd Musica · 0.2.0

Player immersivo per gli album DaProd. Browser, Windows e Android condividono il progetto Tauri. Pacchetti nella [pagina release](https://github.com/cammo22/DaProdMusica/releases).

## Prova sul PC

Apri l’installer Windows consegnato nella cartella `outputs`. Include i 45 brani importati dalle tre cartelle originali, che non sono state modificate. La build è un’anteprima non firmata con certificato Authenticode.

Per lavorare sui sorgenti servono Node.js 22.12+ e npm:

```powershell
npm ci
npm run import:music -- "C:\Users\cammo\Desktop\dapmusica"
npm run dev
```

Apri `http://127.0.0.1:5173`. In alternativa usa `AVVIA DaProd Musica.cmd` dopo aver installato le dipendenze. Per lo Studio usa `AVVIA Studio.cmd`, oppure apri `/studio.html` sullo stesso server già avviato. Mantieni una sola istanza del server.

## Cosa è implementato

- Importazione delle sottocartelle come album, con ID stabili derivati dai nomi.
- Player con pausa, seek, volume, precedente/successivo, ripetizione album, shuffle, ricerca e preferiti locali.
- Cinque shader WebGL adattati da DaProdSuite: Tunnel al Neon, Impulso Frattale, Cromo Liquido, Griglia Retro e Inchiostro. Spettro a 64 bande, waveform, transienti, scie e deformazione touch. Licenza e provenienza in `THIRD_PARTY.md`.
- Modalità immersiva, testi sincronizzati per frase, intensità e movimento ridotto o fermo.
- Studio separato dal player: Whisper Tiny quantizzato in un Web Worker, editing LRC, inserimento del tempo attuale, bozze locali e import/export del catalogo testi.
- Controllo delle release GitHub all’apertura e collegamento alle nuove versioni.
- Promozione di DapGalleria con accesso alla sua pagina di download.

I tre album importati: **vesuvio quantico** (33 brani), **DaProdSelecta** (2), **sistema.exe** (10). L’ordine iniziale è alfabetico, non una tracklist editoriale definitiva. Copertine e descrizioni sono una prima proposta grafica.

## Studio e karaoke

1. Apri `/studio.html` e scegli un brano.
2. Genera la bozza con Whisper Tiny, oppure importa un LRC.
3. Correggi ogni riga nel formato `[00:12.50]Testo`. “Inserisci tempo attuale” sincronizza la riga del cursore.
4. Salva la bozza e fai un backup con “Esporta catalogo testi”.
5. Copia il catalogo esportato in `public/lyrics.json`, ricompila e distribuisci la nuova versione.

Il modello [Whisper Tiny ONNX](https://huggingface.co/onnx-community/whisper-tiny) viene scaricato al primo uso. L’audio viene elaborato nel dispositivo. Il cantato, i dialetti e le sovrapposizioni musicali possono produrre errori: tutte le trascrizioni sono bozze da rivedere. La generazione completa su un brano reale **non è stata ancora verificata**; la prova manuale è stata interrotta su richiesta dell’utente.

Lo Studio è un editor locale, non un pannello amministrativo autenticato. Non pubblica sul server e non modifica file originali. Il player legge esclusivamente il catalogo distribuito; nessuna bozza locale viene mostrata automaticamente agli ascoltatori.

## Compilazioni

```powershell
npm test
npm run build
npm run desktop:build
```

L’output browser è `dist/`, da servire via HTTP/HTTPS. Windows usa Tauri 2 e WebView2; l’installer è generato in `src-tauri/target/release/bundle/nsis/`.

### Android

La configurazione Tauri è condivisa. Con JDK 17, Android SDK/NDK e target Rust Android installati:

```powershell
npm run android:init
npm run android:build -- --apk --target aarch64 --ci
```

Il workflow `Release Windows and Android` genera APK ARM64 release, lo firma con una chiave privata stabile custodita nei secrets GitHub e verifica firma e assenza del flag debug. Include i 45 brani per ascolto offline; richiede Android 8 o successivo. Lo Studio karaoke è escluso dall’APK. Il comportamento su telefono resta da provare: servizio audio in background e audio focus nativo sono ancora da integrare.

### Linux e Flatpak

Compila il binario su Linux con le dipendenze Tauri, quindi usa il manifest in `packaging/linux/flatpak.yml`:

```sh
npm ci
npm run tauri build -- --no-bundle
cd packaging/linux
flatpak-builder --user --repo=repo build flatpak.yml
flatpak build-bundle repo DaProdMusica.flatpak io.github.cammo22.daprodmusica
```

Serve il runtime GNOME 49 e il relativo SDK. Il workflow manuale contiene l’installazione dei prerequisiti. Il manifest segue il percorso di packaging binario descritto nella [guida Tauri Flatpak](https://v2.tauri.app/distribute/flatpak/); la compilazione Linux non è stata eseguita su questo PC Windows. La licenza del progetto e i metadati definitivi per Flathub sono da decidere.

## Distribuzione e aggiornamenti: stato reale

| Funzione | Stato |
|---|---|
| Browser locale e build statica | Implementati |
| Installer Windows con album inclusi | Compilato localmente |
| Android | Workflow release ARM64 con firma stabile e verifica automatica; prove fisiche da eseguire |
| Flatpak | Manifest e workflow, non ancora compilato/verificato |
| Avviso nuova versione | Implementato tramite GitHub Releases |
| Installazione aggiornamenti dall’app | Da implementare con firma e gestione specifica per piattaforma |
| Catalogo remoto e sincronizzazione testi | Da collegare a hosting/versionamento dei contenuti |
| Sito pubblico/PWA offline | Non ancora pubblicato; cache offline non implementata |

Gli aggiornamenti firmati desktop possono usare il [plugin updater Tauri](https://v2.tauri.app/plugin/updater/). Android richiede un percorso specifico verso l’installer di sistema; Flatpak va aggiornato tramite il suo repository. Non sono attivi aggiornamenti automatici silenziosi.

Le canzoni in `public/media/` sono escluse da Git. Il workflow release ripristina il bundle audio indicato in `media-bundle.json`, controllandone SHA-256 prima di compilarlo nei pacchetti. Con `gh` autenticato si può ripristinarlo localmente con `node scripts/restore-media.mjs`.

## Architettura e verifiche

- `src/main.js`: interfaccia del player e Web Audio.
- `src/playback.js`: gestione concorrente delle richieste di riproduzione e navigazione.
- `src/gpu-visualizer.js` / `src/suite-presets/`: renderer WebGL e shader DaProdSuite; fallback Canvas sui dispositivi senza WebGL.
- `src/audio-features.js`: analisi audio e texture per gli shader.
- `src/studio.js` / `src/transcribe.worker.js`: editor e inferenza separata dal thread dell’interfaccia.
- `src/core.js`: LRC, catalogo testi, confronto versioni.
- `scripts/import-music.mjs`: copia locale non distruttiva degli album.
- `tests/`: test automatici di LRC, stato playback, preferenze e integrità dei file importati.

Le prove UI sono lasciate all’utente. Build e test automatici non certificano qualità del riconoscimento vocale, rendering o comportamento sui dispositivi Android/Linux.
