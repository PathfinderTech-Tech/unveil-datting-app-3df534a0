package tech.pathfinder.unveil;

import com.getcapacitor.BridgeActivity;
import com.getcapacitor.CapConfig;

public class MainActivity extends BridgeActivity {
    @Override
    protected void load() {
        config = new CapConfig.Builder(this)
            .setServerUrl("https://unveil.best")
            .setErrorPath("native-error.html")
            .setAllowNavigation(new String[] {
                "unveil.best",
                "www.unveil.best",
                "*.unveil.best",
                "*.supabase.co"
            })
            .setAndroidScheme("https")
            .setBackgroundColor("#09070d")
            .setAllowMixedContent(false)
            .create();

        super.load();
    }
}
