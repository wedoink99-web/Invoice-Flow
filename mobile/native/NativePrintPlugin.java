package za.co.signgirls.invoiceflow;

import android.content.Context;
import android.print.PrintAttributes;
import android.print.PrintDocumentAdapter;
import android.print.PrintManager;
import android.webkit.WebView;

import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/** Lets the app print invoices and save them as PDF using Android's own print screen. */
@CapacitorPlugin(name = "NativePrint")
public class NativePrintPlugin extends Plugin {
    @PluginMethod
    public void print(final PluginCall call) {
        final String title = call.getString("title", "InvoiceFlow");
        getActivity().runOnUiThread(new Runnable() {
            @Override
            public void run() {
                try {
                    WebView webView = getBridge().getWebView();
                    PrintManager pm = (PrintManager) getActivity().getSystemService(Context.PRINT_SERVICE);
                    PrintDocumentAdapter adapter = webView.createPrintDocumentAdapter(title);
                    pm.print(title, adapter, new PrintAttributes.Builder().build());
                    call.resolve();
                } catch (Exception e) {
                    call.reject("Could not open the print screen");
                }
            }
        });
    }
}
