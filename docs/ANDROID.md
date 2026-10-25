# Android: riproduzione, widget e aggiornamenti

`src/audio-engine.js` sceglie il bridge nativo in Tauri Android; browser e desktop usano Web Audio. Il plugin Rust inoltra comandi JSON a Kotlin, sul thread principale di ExoPlayer. Non ci sono due sorgenti audio attive.

`PlaybackService` possiede ExoPlayer e MediaSession. Gestisce focus, scollegamento cuffie, foreground playback e comandi di sistema. Coda, indice e posizione sono salvati agli eventi e ogni 10 secondi durante la riproduzione. Home mantiene il servizio, Indietro chiude il dialogo o riduce il player, rimozione dal multitasking ferma la musica. Le eventuali pillole e l’aspetto del player di sistema dipendono dal telefono.

Il tap PCM16 copia finestre mono di 2048 campioni con sovrapposizione del 50%; non trattiene buffer del decoder. Un worker FFT usa una mailbox limitata e una cadenza nominale di 20 ms. L’analisi è sospesa quando non serve alla grafica. I poll JS sono a 32/65 ms quando gli effetti sono attivi, a 180 ms senza effetti e non interrogano il servizio quando la WebView è nascosta. Testo e slider aggiornano a circa 6 Hz. [Rendering e fonti](rendering.md).

Il PiP è rimosso. `PlaybackWidget` usa RemoteViews con copertina, titolo, controlli MediaSession e un’orbita leggera animata dal launcher. In pausa resta un frame; senza servizio recupera i metadata dalla coda salvata. `requestPinAppWidget` restituisce supporto ed esito della richiesta, senza fingere che il widget sia stato aggiunto. Nessun permesso microfono o overlay.

`UpdateController` usa DownloadManager e FileProvider. Musica e DapGalleria hanno destinazioni, preferenze e allowlist separate. Prima dell’installazione vengono verificati SHA-256, package, versione e certificato. Musica deve mantenere la firma installata; DapGalleria deve corrispondere alla firma ufficiale fissata nel codice e, se presente, a quella installata. Android conserva il consenso per installare. La UI propone solo release stabili di Musica.

`configure-android.mjs` rende riproducibili icone, callback Indietro, asset audio e noCompress per il seek. Il menu Effetti usa timer invocati nel contesto Window: conservare `setTimeout` come metodo di un oggetto generava “Illegal invocation” nella WebView. `WebViewGestures` lascia la gestione della pressione lunga ai controlli web, mantenendo la selezione nativa negli input.

La CI esercita tutti i 47 brani, MediaController in background, RemoteViews e copertine, aggiornamenti invalidi e UI Vite reale con eventi touch Android. Firma, manifest, asset e allineamento ELF a 16 KB sono verificati sull’APK di release. Restano da provare su telefono fisico prestazioni/consumo, launcher del produttore, Bluetooth, chiamate e installazione completa degli aggiornamenti.

Fonti: [MediaSessionService](https://developer.android.com/media/media3/session/background-playback), [App widgets](https://developer.android.com/develop/ui/views/appwidgets), [plugin mobili Tauri](https://v2.tauri.app/develop/plugins/develop-mobile/).
