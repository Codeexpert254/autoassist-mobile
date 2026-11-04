package expo.modules.autoassistoverlay

import com.google.firebase.messaging.RemoteMessage
import expo.modules.notifications.service.ExpoFirebaseMessagingService

/**
 * Retain Expo's FCM handling (tokens, normal notification presentation, JS events).
 * Only an additional high-priority, data-only mechanic_offer_overlay message can
 * request the Android window overlay.
 */
class AutoAssistFirebaseMessagingService : ExpoFirebaseMessagingService() {
  override fun onMessageReceived(remoteMessage: RemoteMessage) {
    super.onMessageReceived(remoteMessage)
    if (remoteMessage.data["type"] == "mechanic_offer_overlay") {
      OverlayController.maybePresent(applicationContext, remoteMessage.data)
    }
  }
}
