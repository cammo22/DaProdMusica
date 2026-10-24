# Native music plugin

Android uses MusicPlugin.execute to control PlaybackService (Media3). The only guest command is `music:allow-execute`, included in `music:default`. No microphone or overlay permission is requested. Desktop uses the browser adapter and does not invoke this plugin.

Sources and lifecycle design: docs/ANDROID.md in the application repository.
