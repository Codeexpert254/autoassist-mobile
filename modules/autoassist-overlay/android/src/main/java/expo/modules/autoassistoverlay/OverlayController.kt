package expo.modules.autoassistoverlay

import android.app.ActivityManager
import android.app.KeyguardManager
import android.content.Context
import android.content.Intent
import android.graphics.Color
import android.graphics.PixelFormat
import android.graphics.Typeface
import android.graphics.drawable.GradientDrawable
import android.net.Uri
import android.os.Handler
import android.os.Looper
import android.provider.Settings
import android.util.Log
import android.view.Gravity
import android.view.View
import android.view.WindowManager
import android.widget.Button
import android.widget.LinearLayout
import android.widget.TextView
import java.util.Locale
import kotlin.math.ceil

/**
 * Short-lived, opt-in Android overlay. No background service or accessibility
 * access. This never approves a job: the mechanic must open the authenticated
 * AutoAssist offer screen, where the server checks ownership and expiration.
 */
internal object OverlayController {
  private const val PREFS = "autoassist_floating_offers"
  private const val MAX_LIFETIME_MS = 120_000L
  private val main = Handler(Looper.getMainLooper())
  private var windowManager: WindowManager? = null
  private var overlay: View? = null
  private var tick: Runnable? = null
  private var visibleOfferId: String? = null

  private fun prefs(context: Context) =
    context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)

  fun isEnabled(context: Context): Boolean =
    prefs(context).getBoolean("enabled", false) &&
      !prefs(context).getString("mechanicId", null).isNullOrBlank()

  fun enable(context: Context, mechanicId: String) {
    prefs(context).edit()
      .putBoolean("enabled", true)
      .putString("mechanicId", mechanicId)
      .apply()
  }

  fun disable(context: Context) {
    prefs(context).edit().clear().apply()
    dismiss()
  }

  fun dismiss() {
    main.post { removeOnMainThread() }
  }

  private fun removeOnMainThread() {
    tick?.let(main::removeCallbacks)
    tick = null
    overlay?.let { view ->
      try { windowManager?.removeView(view) }
      catch (_: Exception) { /* Already removed by the OS. */ }
    }
    overlay = null
    visibleOfferId = null
    windowManager = null
  }

  private fun dp(context: Context, value: Int): Int =
    (value * context.resources.displayMetrics.density).toInt()

  private fun background(color: Int, border: Int, radius: Int = 16): GradientDrawable =
    GradientDrawable().apply {
      setColor(color)
      cornerRadius = radius.toFloat()
      setStroke(2, border)
    }

  private fun label(context: Context, text: String, size: Float, color: Int, bold: Boolean = false): TextView =
    TextView(context).apply {
      this.text = text
      textSize = size
      setTextColor(color)
      if (bold) setTypeface(Typeface.DEFAULT, Typeface.BOLD)
    }

  private fun activeInForeground(): Boolean {
    val info = ActivityManager.RunningAppProcessInfo()
    ActivityManager.getMyMemoryState(info)
    return info.importance == ActivityManager.RunningAppProcessInfo.IMPORTANCE_FOREGROUND ||
      info.importance == ActivityManager.RunningAppProcessInfo.IMPORTANCE_VISIBLE
  }

  fun maybePresent(context: Context, data: Map<String, String>) {
    if (!isEnabled(context) || !Settings.canDrawOverlays(context)) return
    if (data["recipientId"] != prefs(context).getString("mechanicId", null)) return
    if (activeInForeground()) return // The existing React Native card handles foreground offers.

    val keyguard = context.getSystemService(Context.KEYGUARD_SERVICE) as? KeyguardManager
    if (keyguard?.isKeyguardLocked == true) return // Lock screen retains the system notification.

    val id = data["offerId"]?.takeIf { it.isNotBlank() } ?: return
    val expires = data["expiresAtMs"]?.toLongOrNull() ?: return
    val remaining = expires - System.currentTimeMillis()
    if (remaining <= 0L || remaining > MAX_LIFETIME_MS + 15_000L) return

    main.post {
      if (!isEnabled(context) || !Settings.canDrawOverlays(context)) return@post
      if (expires <= System.currentTimeMillis()) return@post
      if (visibleOfferId == id) return@post
      try {
        showOnMainThread(context.applicationContext, data, id, expires)
      } catch (error: Exception) {
        removeOnMainThread()
        Log.w("AutoAssistOverlay", "Overlay unavailable; regular FCM notification remains", error)
      }
    }
  }

  private fun showOnMainThread(context: Context, data: Map<String, String>, id: String, expires: Long) {
    removeOnMainThread()
    val wm = context.getSystemService(Context.WINDOW_SERVICE) as WindowManager
    val blue = Color.rgb(24, 87, 166)
    val navy = Color.rgb(16, 42, 67)
    val gray = Color.rgb(71, 84, 103)
    val white = Color.WHITE

    val card = LinearLayout(context).apply {
      orientation = LinearLayout.VERTICAL
      setPadding(dp(context, 16), dp(context, 14), dp(context, 16), dp(context, 14))
      background = background(white, Color.rgb(174, 205, 246))
      elevation = dp(context, 12).toFloat()
    }

    val headline = LinearLayout(context).apply { orientation = LinearLayout.HORIZONTAL }
    headline.addView(label(context, "AutoAssist • New service request", 14f, blue, true),
      LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f))
    val timer = label(context, "", 12f, Color.rgb(138, 82, 0), true)
    headline.addView(timer)
    card.addView(headline)

    fun addLine(value: String, size: Float, color: Int, bold: Boolean = false) {
      if (value.isBlank()) return
      val text = label(context, value, size, color, bold)
      val params = LinearLayout.LayoutParams(-1, -2)
      params.topMargin = dp(context, 6)
      card.addView(text, params)
    }
    addLine((data["symptom"] ?: "Service request").take(60), 17f, navy, true)
    addLine((data["description"] ?: "A motorist needs assistance.").take(150), 13f, gray)
    addLine("📍 " + (data["locationText"] ?: "Location unavailable").take(90), 12f, gray)
    addLine("🕒 " + (data["preferredTime"] ?: "As soon as possible").take(60), 12f, gray)

    val actions = LinearLayout(context).apply {
      orientation = LinearLayout.HORIZONTAL
      gravity = Gravity.CENTER_VERTICAL
    }
    val actionParams = LinearLayout.LayoutParams(0, dp(context, 43), 1f)
    actionParams.topMargin = dp(context, 12)
    val dismissButton = Button(context).apply {
      text = "Dismiss"
      isAllCaps = false
      textSize = 12f
      setTextColor(gray)
      background = background(Color.rgb(242, 244, 247), Color.rgb(208, 213, 221), 12)
      setOnClickListener { dismiss() }
    }
    actions.addView(dismissButton, actionParams)

    val openParams = LinearLayout.LayoutParams(0, dp(context, 43), 1.6f)
    openParams.topMargin = dp(context, 12)
    openParams.marginStart = dp(context, 8)
    val openButton = Button(context).apply {
      text = "View & respond"
      isAllCaps = false
      textSize = 12f
      setTextColor(white)
      background = background(blue, blue, 12)
      setOnClickListener {
        dismiss()
        val url = Uri.parse("autoassist:///mechanic/job-offer?offerId=${Uri.encode(id)}")
        val intent = Intent(Intent.ACTION_VIEW, url).apply {
          setClassName(context.packageName, "${context.packageName}.MainActivity")
          addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP)
        }
        try {
          context.startActivity(intent)
        } catch (error: Exception) {
          Log.w("AutoAssistOverlay", "Could not open offer, use the notification", error)
          context.packageManager.getLaunchIntentForPackage(context.packageName)?.let(context::startActivity)
        }
      }
    }
    actions.addView(openButton, openParams)
    card.addView(actions)

    val params = WindowManager.LayoutParams(
      context.resources.displayMetrics.widthPixels - dp(context, 24),
      WindowManager.LayoutParams.WRAP_CONTENT,
      WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY,
      WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or WindowManager.LayoutParams.FLAG_NOT_TOUCH_MODAL,
      PixelFormat.TRANSLUCENT
    ).apply {
      gravity = Gravity.TOP or Gravity.CENTER_HORIZONTAL
      y = dp(context, 36)
    }
    wm.addView(card, params)
    windowManager = wm
    overlay = card
    visibleOfferId = id

    val ticker = object : Runnable {
      override fun run() {
        if (overlay !== card) return
        val seconds = ceil((expires - System.currentTimeMillis()).toDouble() / 1000).toInt()
        if (seconds <= 0 || !isEnabled(context) || !Settings.canDrawOverlays(context)) {
          removeOnMainThread()
          return
        }
        timer.text = "${seconds}s left"
        main.postDelayed(this, 1000)
      }
    }
    tick = ticker
    main.post(ticker)
  }
}
