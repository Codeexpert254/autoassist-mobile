package expo.modules.autoassistoverlay

import com.google.firebase.messaging.RemoteMessage
import expo.modules.notifications.service.ExpoFirebaseMessagingService
import org.json.JSONObject

/**
 * Retain Expo's FCM handling (tokens, normal notification presentation, JS events).
 * Only an additional high-priority, data-only mechanic_offer_overlay message can
 * request the Android window overlay.
 */
class AutoAssistFirebaseMessagingService : ExpoFirebaseMessagingService() {
  override fun onMessageReceived(remoteMessage: RemoteMessage) {
    super.onMessageReceived(remoteMessage)
    val data = remoteMessage.data
    // Support direct FCM data fields and an Expo envelope containing JSON data.
    val overlay = if (data["type"] == "mechanic_offer_overlay" || data["type"] == "parts_order_overlay") data else {
      val raw = data["data"] ?: data["body"]
      try {
        val json = JSONObject(raw ?: "")
        val fields = mutableMapOf<String, String>()
        val keys = json.keys()
        while (keys.hasNext()) {
          val key = keys.next()
          fields[key] = json.optString(key)
        }
        fields
      } catch (_: Exception) {
        emptyMap()
      }
    }
    if (overlay["type"] == "mechanic_offer_overlay" || overlay["type"] == "parts_order_overlay") {
      OverlayController.noteFcmDelivery(applicationContext)
      OverlayController.maybePresent(applicationContext, overlay)
    }
  }
}
