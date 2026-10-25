plugins { id("com.android.application"); id("org.jetbrains.kotlin.android") }
android {
 namespace = "io.github.cammo22.music"
 compileSdk = 37
 defaultConfig { applicationId="io.github.cammo22.smoke"; minSdk=26; targetSdk=37; testInstrumentationRunner="androidx.test.runner.AndroidJUnitRunner" }
 compileOptions { sourceCompatibility=JavaVersion.VERSION_17;targetCompatibility=JavaVersion.VERSION_17 }
 kotlinOptions { jvmTarget="17" }
 androidResources { noCompress += listOf("mp3") }
}
dependencies {
 implementation("androidx.core:core-ktx:1.16.0")
 implementation("androidx.media3:media3-exoplayer:1.11.1")
 implementation("androidx.media3:media3-session:1.11.1")
 androidTestImplementation("androidx.test:runner:1.6.2")
 androidTestImplementation("androidx.test:core:1.6.1")
 androidTestImplementation("androidx.test.ext:junit:1.2.1")
}
