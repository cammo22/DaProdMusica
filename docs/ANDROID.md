# Android: player, dati e PiP

- `src/audio-engine.js` sceglie l'adattatore nativo in Tauri Android; il browser continua a usare WebAudio. Non ci sono due sorgenti sonore attive.
- Il plugin Rust `src-tauri/plugins/music` inoltra comandi JSON a Kotlin. Le chiamate mobili sono sul thread principale, che è anche l'applicationLooper di ExoPlayer.
- `PlaybackService` possiede ExoPlayer e MediaSession. Gestisce focus, scollegamento cuffie, foreground media playback e controlli del sistema. Coda/index/posizione vengono salvati a eventi e ogni 10 secondi mentre suona.
- Ogni finestra FFT nasce da PCM mono copiato, non da buffer del decoder trattenuti. La mailbox conserva al massimo una finestra; un worker esegue FFT2048 a 20Hz. I formati non PCM16 bypassano il processore senza alterare l'audio.
- Le snapshot verso JS arrivano a 10Hz quando l'interfaccia è visibile; in background il polling si ferma. L'audio continua nel servizio. Il PiP disegna una vista Canvas nativa, senza affidarsi a WebGL sospeso.
- `configure-android.mjs` rende il progetto generato riproducibile: manifest PiP, callback Activity, asset audio e noCompress per il seek.
- `MusicPlugin` imposta auto-enter PiP solo durante playback e se abilitato. Il receiver esplicito dei RemoteActions deve essere presente nel manifest. L'overlay viene rimosso all'uscita dal PiP e alla distruzione dell'Activity.
- Nessun permesso di registrazione audio o overlay sopra le altre app. Il PiP è una finestra del sistema e può essere rifiutato dal dispositivo.

Riferimenti: [MediaSessionService](https://developer.android.com/media/media3/session/background-playback), [PiP](https://developer.android.com/develop/ui/views/picture-in-picture), [plugin mobili Tauri](https://v2.tauri.app/develop/plugins/develop-mobile/).

Restano da verificare su dispositivi: Home/ritorno, lock screen, Bluetooth e cuffie, chiamata/focus, rotazione, PiP e cambio brano dal PiP, recupero dopo chiusura Activity, consumo e fluidità. Non sono state eseguite prove UI su richiesta dell'utente.
