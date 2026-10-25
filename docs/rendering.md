# Audio, effetti e prestazioni — 0.6

La grafica non importa file `.milk`. Riprende due principi descritti nella [guida originale MilkDrop di Ryan Geiss](https://www.geisswerks.com/hosted/milkdrop2/milkdrop_preset_authoring.html): confronto tra energia istantanea e media attenuata, e trasformazione del fotogramma precedente. Le scene mantengono la provenienza descritta in THIRD_PARTY.md.

Il tap PCM di Media3 analizza il segnale decodificato del player, senza microfono. FFT e finestre sono riusate; la cadenza nominale dell’analisi è 20 ms. Il bridge legge a 32 ms in Fluido, 65 ms in Risparmio energia. `beatCount` è monotono: il renderer riconosce un colpo anche se il poll perde il singolo frame dell’onset. L’inviluppo usa un attacco di 15 ms e un rilascio di 105 ms; segnali vecchi decadono. Il browser usa Web Audio sullo stesso elemento che riproduce la musica.

Fluido punta a 60 fps e Risparmio energia a 30. La risoluzione interna viene adattata al tempo effettivo dei frame con isteresi, mantenendo la dimensione CSS. Non è una garanzia di 60 fps su ogni telefono. Il carico delle scene, la temperatura e la WebView contano. Off sospende gli effetti e la rotazione automatica della galassia; resta possibile navigarla con il dito.

Le indicazioni [WebGL di MDN](https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/WebGL_best_practices) guidano il caching delle posizioni di attributi/uniformi e l’uso di KHR_parallel_shader_compile dove disponibile. Non si richiedono posizioni di attributi a ogni frame. Le anteprime incluse nella build sono fotogrammi dei 22 renderer; aprire un menu non compila 22 programmi. Esiste un fallback lazy se un’anteprima manca. La scena principale è sospesa dietro i dialoghi.

Le interazioni sono definite per scena in effect-interactions.js e nei due renderer mesh: corrente e inerzia per inchiostro, vortici per chrome, semina per il giardino, accelerazione per i tunnel, scariche e fratture per tempesta/reattore. Lo spostamento normalizzato del dito alimenta anche una velocità che decade nel tempo.

## Widget Android

Il widget usa [RemoteViews](https://developer.android.com/develop/ui/views/appwidgets): mostra la vera copertina e piccoli archi animati, con controlli MediaSession. L’animazione viene riprodotta dal launcher, non analizza l’audio e non è un visualizzatore WebGL. Cambia colore casualmente sul cambio brano o dal pulsante dedicato. In pausa resta un solo fotogramma. La richiesta di aggiunta usa requestPinAppWidget; un launcher non compatibile richiede l’aggiunta dal menu Widget della Home.

## Verifica

I test Android avviano il player Vite reale nella WebView con MotionEvent touch: pressione lunga sul controllo Effetti, rilascio, scelta delle card, aperture successive, anteprime, tap sul backdrop e trascinamento del player con verifica della sua posizione durante il gesto. Una suite separata decodifica tutti i 47 brani, esercita MediaController in background e applica le RemoteViews del widget. L’emulatore verifica funzionalità, non misura prestazioni rappresentative di un telefono fisico.

La CI usa SwiftShader con Vulkan disabilitato per la compatibilità della WebView, seguendo la [guida Android sui problemi grafici dell’emulatore](https://developer.android.com/studio/run/emulator-troubleshooting). I PNG generati vengono conservati anche se un test successivo interrompe l’emulatore.
