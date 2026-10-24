# DaProd Musica 0.3.0 — Universi sonori

Player Android, Windows e browser con tre esperienze album, copertine estratte dagli MP3 e code in shuffle. Pacchetti nella [pagina release](https://github.com/cammo22/DaProdMusica/releases).

## Tre mondi

- **vesuvio quantico**: nostalgia Y2K / Frutiger Aero, vetro acquatico, radio e memoria napoletana.
- **sistema.exe**: nucleo tecnologico, griglie, metallo e segnali digitali.
- **DaProdSelecta**: archivio riesumato secoli dopo una catastrofe, polvere, ossido e nastri recuperati.

La galassia mostra le copertine effettive dei brani. Toccane una per iniziare un viaggio attraverso tutti gli album, oppure entra in un portale album. Catalogo attuale: **47 brani**, di cui 46 con immagine incorporata. Il brano senza immagine usa la copertina del suo album. Le code e le liste degli album sono mescolate; non vengono mostrati numeri di traccia.

## Android

Il player Android usa **Media3 ExoPlayer dentro un MediaSessionService**: coda, focus audio, cuffie, notifiche e posizione appartengono al servizio nativo. L'interfaccia si ricollega al player esistente quando torna visibile. I brani sono inclusi nell'APK come asset locali, senza una seconda copia dentro il frontend.

Il PiP opzionale mostra copertina, nome, piccola animazione e controlli del sistema. Android 12+ usa auto-enter; Android 8–11 il callback di uscita. Si può disattivare in Impostazioni. Il comportamento della pillola e le animazioni del launcher dipendono da Android e dal produttore: l'app non può imporli. Il PiP richiede il supporto del dispositivo.

**Questa è un'anteprima da provare fisicamente.** Build e ispezione dell'APK verificano codice, firma, manifest e asset, ma non certificano background, focus, PiP o fluidità su un telefono reale. Come richiesto, non viene usata automazione dell'interfaccia.

## Visualizzatore

Tutti gli **11 preset DaProdSuite** sono inclusi, compresi Polvere Cosmica (geometria a particelle) e Corolla Sonora (tre livelli di corolle), con shader originali e attribuzione in `THIRD_PARTY.md`. Si aggiungono **11 scene nuove**. Il motore usa spettro a 64 bande, waveform, transienti e deformazione touch.

**Muta** genera parametri limitati dagli intervalli del preset; **Evolvi** cambia universo ogni 24 secondi. Un seme a 32 bit e la versione del generatore permettono di riprodurre la stessa configurazione. Puoi salvarla, esportarla e importarla. Si tratta di uno spazio di variazioni procedurali, non di nuovi shader generati da AI. Il rendering mobile limita risoluzione e frequenza; movimento ridotto e fermo sono disponibili.

## Karaoke locale

Tutti i 47 brani sono stati elaborati **su questo PC**, con RTX 4060 e **Systran/faster-whisper-small**, producendo frasi e tempi per parola. `public/lyrics.json` contiene i risultati; `public/lyrics-report.json` il rapporto. Sono bozze automatiche da correggere, soprattutto per dialetti, musica forte e passaggi strumentali. Il modello non è incluso nell'APK e l'audio non viene inviato a un server.

Per ripetere l'elaborazione, con Python 3.12:

```sh
python -m venv .venv
.venv/Scripts/pip install -r scripts/requirements-lyrics.txt
# Windows GPU: aggiungere nvidia-cublas-cu12 e nvidia-cudnn-cu12
.venv/Scripts/python scripts/transcribe-library.py --model small --device cuda
# CPU: usare --device cpu
```

Il modello viene scaricato al primo avvio e rimane in `.lyrics-cache/models`. Le trascrizioni per brano sono riprendibili; gli originali non vengono modificati. Per correzioni apri `AVVIA Studio.cmd`, importa il catalogo, correggi LRC ed esporta `lyrics.json` in `public/`. Lo Studio browser mantiene anche Whisper Tiny per generazioni singole.

## Sviluppo e build

```sh
npm ci
node scripts/restore-media.mjs
npm test
npm run build
npm run dev
```

Il ripristino del catalogo audio richiede `gh` autenticato e verifica SHA-256. Le copertine sono versionate in `public/artwork/`; gli MP3 sono esclusi da Git. La build browser è `dist/`, da servire via HTTP/HTTPS. Lo Studio è `/studio.html`.

Windows: `npm run desktop:build` con Rust, strumenti MSVC e WebView2. L'installer non ha certificato Authenticode.

Android con JDK17, SDK/NDK e Rust aarch64:

```sh
npm run android:init -- --ci
node scripts/configure-android.mjs
npm run android:build -- --apk --target aarch64 --ci
```

Il workflow `Release Windows and Android` ripristina il bundle audio, verifica shader e test, compila i due pacchetti, firma Android con la chiave privata stabile nei secrets e prepara una release bozza. L'ispezione APK controlla tutti i file audio, copertine, servizio multimediale e PiP. Le chiavi non sono pubblicate.

Flatpak ha ancora soltanto il manifest in `packaging/linux`; non è incluso in questa release. Il sito pubblico non è ancora ospitato. Gli aggiornamenti aprono la pagina GitHub: l'installazione interna non è ancora implementata.

## Verifiche

- Test di shuffle senza duplicati, evoluzione deterministica e limiti dei parametri.
- Validazione GLSL delle 22 scene, incluse coppie vertex/fragment delle geometrie.
- Integrità di catalogo, immagini e timestamp dei testi.
- Build web, controllo Rust e build native nel workflow.

Il brief creativo normalizzato è in `docs/CREATIVE_DIRECTION.md`; l'architettura Android in `docs/ANDROID.md`.

### Preparare una release

Con `gh` autenticato, commit e sorgenti già pushati, esegui `node scripts/prepare-release.mjs`. Il comando crea una bozza sul commit completo e avvia la compilazione; non salva token nel repository. Questo evita il limite del token Actions nella creazione di release su commit che modificano workflow. La bozza resta privata finché non viene pubblicata dopo la verifica degli allegati.

