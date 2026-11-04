package expo.modules.autoassistoverlay

import android.content.Context
import android.content.Intent
import android.net.Uri
import android.provider.Settings
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class AutoAssistOverlayModule : Module() {
  private fun context(): Context =
    appContext.reactContext?.applicationContext
      ?: appContext.currentActivity?.applicationContext
      ?: throw IllegalStateException("Android application context is unavailable")

  override fun definition() = ModuleDefinition {
    Name("AutoAssistOverlay")

    Function("getDiagnostics") {
      OverlayController.diagnostics(context())
    }
    Function("hasPermission") {
      Settings.canDrawOverlays(context())
    }
    Function("isEnabled") {
      OverlayController.isEnabled(context())
    }
    Function("enableForUser") { userId: String ->
      require(userId.isNotBlank()) { "A signed-in mechanic is required" }
      require(Settings.canDrawOverlays(context())) { "Enable Appear on top in Android Settings first" }
      OverlayController.enable(context(), userId)
    }
    Function("setOnline") { userId: String, online: Boolean ->
      OverlayController.setOnline(context(), userId, online)
    }
    Function("disable") {
      OverlayController.disable(context())
    }
    Function("dismiss") {
      OverlayController.dismiss()
    }
    Function("openPermissionSettings") {
      val ctx = context()
      val intent = Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION, Uri.parse("package:${ctx.packageName}"))
        .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      ctx.startActivity(intent)
    }
  }
}
