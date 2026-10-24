package io.github.cammo22.music
object MusicPlugin {var active:UiHook?=null;class UiHook(private val refresh:()->Unit){fun refreshPip(){refresh()}}}
