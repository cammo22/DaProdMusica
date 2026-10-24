plugins { id("com.android.library"); id("org.jetbrains.kotlin.android") }
android {
 namespace = "io.github.cammo22.music"
 compileSdk = 37
 defaultConfig { minSdk = 26; consumerProguardFiles("consumer-rules.pro") }
 compileOptions { sourceCompatibility = JavaVersion.VERSION_1_8; targetCompatibility = JavaVersion.VERSION_1_8 }
 kotlinOptions { jvmTarget = "1.8" }
}
dependencies {
 implementation(project(":tauri-android"))
 implementation("androidx.core:core-ktx:1.16.0")
 implementation("androidx.media3:media3-exoplayer:1.11.1")
 implementation("androidx.media3:media3-session:1.11.1")
}

