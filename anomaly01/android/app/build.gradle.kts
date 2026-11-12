plugins {
    id("com.android.application")
}

android {
    namespace = "org.cohabitation.anomaly01"
    compileSdk = 35

    defaultConfig {
        applicationId = "org.cohabitation.anomaly01"
        minSdk = 28
        targetSdk = 35
        versionCode = 1
        versionName = "0.1.0-prototype"
        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
    }

    buildTypes {
        release {
            isMinifyEnabled = false
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro"
            )
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
}

dependencies {
    implementation("androidx.webkit:webkit:1.12.1")
    testImplementation("junit:junit:4.13.2")
}
