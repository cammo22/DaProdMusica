# Changelog

## 0.4.0 — Player Android corretto e UI semplificata

- Risolto `Unexpected runtime error` durante la riproduzione: guardia sui buffer PCM vuoti. Il test Android riproduceva il guasto prima della correzione.
- Pagine separate Galassia / Album / Preferiti, senza slogan o testi duplicati.
- Galassia sferica ruotabile con le copertine reali.
- Player compatto espandibile con tap o trascinamento, titolo solo in alto nell'espanso.
- Pulsante Effetti: tap casuale, pressione lunga per attivare/disattivare l'automatico.
- Interazioni differenziate per gli effetti, colori delle copertine e preset iniziali legati ai brani.
- Icone native Android copiate esplicitamente nel packaging.
- 47 brani offline e bozze karaoke locali con tempi per parola.

La build APK richiede il superamento del test Android di riproduzione, background e PiP; controlla anche firma, manifest e librerie native a 16KB. Le prove automatiche su emulatore non certificano comportamento del launcher o prestazioni di ogni telefono.


## 0.3.0 — Universi sonori (anteprima)

- Home a galassia con le immagini reali incorporate negli MP3 e accesso shuffle all'intera libreria.
- Portali album distinti: Vesuvio nostalgico Frutiger/Y2K, Sistema high tech, DaProdSelecta archivio postnucleare.
- Icona originale in vetro e cromo, layout mobile, safe area e controlli touch.
- Tutti gli 11 effetti DaProdSuite, incluse le scene a particelle/corolle, e 11 nuovi effetti.
- Evoluzione procedurale, semi riproducibili, salvataggio e import/export universi.
- Android: player Media3 in servizio, MediaSession, focus/cuffie, checkpoint della coda e PiP nativo animato opzionale.
- 47 brani offline. La cartella contiene due brani in più rispetto ai 45 delle precedenti release.
- Tutti i 47 brani elaborati localmente con Whisper Small sulla RTX4060: karaoke con tempi per parola, marcato come bozza.
- Verifiche GLSL, test, firma APK, checksum e ispezione asset/manifest. Prove fisiche Android ancora da eseguire; pillola e transizioni dipendono dal sistema.

Scarica l'APK ARM64 su Android 8+ oppure l'installer Windows. È un'anteprima: segnala modello del telefono e problema osservato. Nessun aggiornamento si installa silenziosamente; l'app apre la release GitHub. Flatpak e hosting pubblico browser restano fuori da questa versione.


## 0.2.0 — Android e shader DaProdSuite

- Cinque effetti GPU della Suite, scie e interazione touch.
- Analisi audio a 64 bande, waveform e rilevamento transienti.
- Layout mobile e build Android senza Studio/modello karaoke.
- Workflow per APK ARM64 firmato e installer Windows con tutti i 45 brani.
- Verifica shader, integrità del catalogo, firma APK e checksum dei pacchetti.
- Restano da provare i dispositivi reali; audio Android in background e installazione interna degli aggiornamenti non ancora implementati.

## 0.1.0 — Prima anteprima locale

- Tre album e 45 brani importati senza modificare i file originali.
- Player browser/Windows con tre visualizzazioni interattive originali.
- Ricerca, preferiti, volume, seek, navigazione, shuffle e ripetizione.
- Studio per bozze karaoke locali, Whisper Tiny e cataloghi LRC/JSON.
- Controllo delle nuove release e link a DapGalleria.
- Protezione contro richieste di riproduzione concorrenti, preferenze corrotte e perdita di righe LRC non sincronizzate.
- Configurazioni di compilazione Android e Flatpak, ancora da verificare sulle rispettive piattaforme.

Non inclusi: distribuzione pubblica, auto-installazione degli aggiornamenti, sincronizzazione remota dei contenuti, audio Android in background.


