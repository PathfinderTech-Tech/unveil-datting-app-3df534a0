# Keep the Capacitor launcher activity so R8 never strips or renames it.
# This is what caused Google Play's ClassNotFoundException on install.
-keep class tech.pathfinder.unveil.MainActivity { *; }
-keep class tech.pathfinder.unveil.** { *; }
-keep class com.getcapacitor.** { *; }
-keep class com.getcapacitor.plugin.** { *; }
-keepclassmembers class * extends com.getcapacitor.Plugin {
    @com.getcapacitor.PluginMethod public *;
}
-keepattributes *Annotation*, Signature, InnerClasses, EnclosingMethod
