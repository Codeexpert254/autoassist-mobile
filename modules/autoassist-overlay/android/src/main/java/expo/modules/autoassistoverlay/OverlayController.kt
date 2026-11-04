package expo.modules.autoassistoverlay

import android.app.KeyguardManager
import android.content.Context
import android.content.Intent
import android.graphics.Color
import android.graphics.PixelFormat
import android.graphics.Typeface
import android.graphics.drawable.GradientDrawable
import android.graphics.drawable.LayerDrawable
import android.net.Uri
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.provider.Settings
import android.util.Log
import android.view.Gravity
import android.view.View
import android.view.WindowManager
import android.text.TextUtils
import android.widget.LinearLayout
import android.widget.TextView
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.ProcessLifecycleOwner
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

  fun noteFcmDelivery(context: Context) {
    prefs(context).edit()
      .putLong("lastFcmAt", System.currentTimeMillis())
      .putString("lastDecision", "received")
      .apply()
  }

  private fun noteDecision(context: Context, reason: String) {
    prefs(context).edit().putString("lastDecision", reason).apply()
    Log.d("AutoAssistOverlay", reason)
  }

  fun diagnostics(context: Context): Map<String, String> {
    val p = prefs(context)
    return mapOf(
      "lastFcmAt" to p.getLong("lastFcmAt", 0L).toString(),
      "lastDecision" to (p.getString("lastDecision", "no background data received") ?: "unknown"),
      "enabled" to isEnabled(context).toString(),
      "online" to p.getBoolean("online", false).toString(),
      "permission" to Settings.canDrawOverlays(context).toString()
    )
  }

  private fun prefs(context: Context) =
    context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)

  fun isEnabled(context: Context): Boolean =
    prefs(context).getBoolean("enabled", false) &&
      !prefs(context).getString("mechanicId", null).isNullOrBlank()

  fun enable(context: Context, mechanicId: String) {
    prefs(context).edit()
      .putBoolean("enabled", true)
      .putBoolean("online", false) // Reconfirmed from the live mechanic profile.
      .putString("mechanicId", mechanicId)
      .apply()
  }

  fun setOnline(context: Context, mechanicId: String, online: Boolean) {
    if (prefs(context).getString("mechanicId", null) != mechanicId) return
    prefs(context).edit().putBoolean("online", online).apply()
    if (!online) dismiss()
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

  private fun roundedBackground(context: Context, color: Int, border: Int, radiusDp: Int): GradientDrawable =
    GradientDrawable().apply {
      setColor(color)
      cornerRadius = dp(context, radiusDp).toFloat()
      setStroke(dp(context, 1), border)
    }

  private fun label(context: Context, text: String, size: Float, color: Int, bold: Boolean = false): TextView =
    TextView(context).apply {
      this.text = text
      textSize = size
      setTextColor(color)
      // Use sans serif even when Samsung has a handwritten system font enabled.
      typeface = Typeface.create(if (bold) "sans-serif-medium" else "sans-serif", Typeface.NORMAL)
      includeFontPadding = false
    }

  private fun limitedLabel(context: Context, value: String, size: Float, color: Int,
    lines: Int, bold: Boolean = false
  ): TextView = label(context, value, size, color, bold).apply {
    maxLines = lines
    ellipsize = TextUtils.TruncateAt.END
    setLineSpacing(dp(context, 2).toFloat(), 1f)
  }

  private fun activeInForeground(): Boolean =
    try {
      // FCM callbacks briefly boost the process's OS importance even while
      // the UI is backgrounded. Use actual Activity lifecycle instead.
      ProcessLifecycleOwner.get().lifecycle.currentState.isAtLeast(Lifecycle.State.STARTED)
    } catch (_: Exception) {
      false
    }

  fun maybePresent(context: Context, data: Map<String, String>) {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
      noteDecision(context, "unsupported_android_version")
      return
    }
    if (!isEnabled(context)) {
      noteDecision(context, "opt_in_disabled")
      return
    }
    if (!Settings.canDrawOverlays(context)) {
      noteDecision(context, "overlay_permission_missing")
      return
    }
    if (!prefs(context).getBoolean("online", false)) {
      noteDecision(context, "mechanic_offline")
      return
    }
    if (data["recipientId"] != prefs(context).getString("mechanicId", null)) {
      noteDecision(context, "account_mismatch")
      return
    }
    if (activeInForeground()) {
      noteDecision(context, "app_in_foreground")
      return
    }

    val keyguard = context.getSystemService(Context.KEYGUARD_SERVICE) as? KeyguardManager
    if (keyguard?.isKeyguardLocked == true) {
      noteDecision(context, "phone_locked")
      return
    }

    val id = data["offerId"]?.takeIf { it.isNotBlank() } ?: run {
      noteDecision(context, "missing_offer_id")
      return
    }
    val expires = data["expiresAtMs"]?.toLongOrNull() ?: run {
      noteDecision(context, "missing_expiry")
      return
    }
    val remaining = expires - System.currentTimeMillis()
    if (remaining <= 0L || remaining > MAX_LIFETIME_MS + 15_000L) {
      noteDecision(context, "offer_expired_or_invalid")
      return
    }

    main.post {
      if (!isEnabled(context) || !Settings.canDrawOverlays(context) || !prefs(context).getBoolean("online", false)) return@post
      if (expires <= System.currentTimeMillis()) return@post
      if (visibleOfferId == id) return@post
      try {
        showOnMainThread(context.applicationContext, data, id, expires)
        noteDecision(context, "overlay_displayed")
      } catch (error: Exception) {
        removeOnMainThread()
        noteDecision(context, "window_manager_error")
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

    // A single vertical root determines the popup height. The original
    // horizontal wrapper had a MATCH_PARENT stripe that led to a clipped
    // lower border/button row on Samsung's overlay WindowManager.
    val card = LinearLayout(context).apply {
      orientation = LinearLayout.VERTICAL
      setPadding(dp(context, 19), dp(context, 14), dp(context, 14), dp(context, 14))
      val blueUnderlay = roundedBackground(context, blue, blue, 16)
      val whiteSurface = roundedBackground(context, white, Color.rgb(174, 205, 246), 16)
      background = LayerDrawable(arrayOf(blueUnderlay, whiteSurface)).apply {
        setLayerInset(1, dp(context, 5), 0, 0, 0)
      }
      elevation = dp(context, 12).toFloat()
    }
    val content = card

    val header = LinearLayout(context).apply {
      orientation = LinearLayout.HORIZONTAL
      gravity = Gravity.CENTER_VERTICAL
    }
    header.addView(View(context).apply {
      background = GradientDrawable().apply {
        shape = GradientDrawable.OVAL
        setColor(Color.rgb(27, 138, 90))
      }
    }, LinearLayout.LayoutParams(dp(context, 9), dp(context, 9)).apply {
      marginEnd = dp(context, 7)
    })
    header.addView(limitedLabel(context, if (data["type"] == "parts_order_overlay") "New spare-parts order" else "New service request for you",
      12f, Color.rgb(18, 61, 118), 1, true),
      LinearLayout.LayoutParams(0, -2, 1f))
    val timer = label(context, "", 10f, Color.rgb(138, 82, 0), true).apply {
      gravity = Gravity.END or Gravity.CENTER_VERTICAL
    }
    header.addView(timer, LinearLayout.LayoutParams(-2, -2).apply {
      marginStart = dp(context, 7)
    })
    content.addView(header)

    fun addLine(value: String, size: Float, color: Int, maxLines: Int,
      marginDp: Int, bold: Boolean = false
    ) {
      if (value.isBlank()) return
      content.addView(limitedLabel(context, value, size, color, maxLines, bold),
        LinearLayout.LayoutParams(-1, -2).apply {
          topMargin = dp(context, marginDp)
        })
    }
    addLine((data["symptom"] ?: if (data["type"] == "parts_order_overlay") "Spare part" else "Service request").take(60),
      15f, navy, 1, 8, true)
    addLine((data["description"] ?: "A motorist needs assistance.").take(250),
      11f, Color.rgb(52, 64, 84), 3, 4)
    addLine("📍 " + (data["locationText"] ?: "Location unavailable").take(120),
      10f, gray, 2, 5)
    addLine("🕒 " + (data["preferredTime"] ?: "As soon as possible").take(90),
      10f, gray, 1, 5)

    // Keep a fixed-height button row and put its top spacing on the ROW.
    // A WRAP_CONTENT row with top margins on weighted children can measure
    // shorter than the children on Samsung and clip both rounded bottoms.
    val actions = LinearLayout(context).apply {
      orientation = LinearLayout.HORIZONTAL
      gravity = Gravity.CENTER_VERTICAL
      clipChildren = false
      clipToPadding = false
    }
    val actionRowParams = LinearLayout.LayoutParams(
      LinearLayout.LayoutParams.MATCH_PARENT, dp(context, 44)
    ).apply {
      topMargin = dp(context, 12)
    }
    // TextViews bypass theme-dependent Android Button background insets.
    fun actionButton(text: String, foreground: Int, fill: Int, stroke: Int,
      onTap: () -> Unit
    ): TextView = label(context, text, 11f, foreground, true).apply {
      gravity = Gravity.CENTER
      setPadding(dp(context, 4), 0, dp(context, 4), 0)
      background = roundedBackground(context, fill, stroke, 9)
      isClickable = true
      isFocusable = true
      contentDescription = text
      setOnClickListener { onTap() }
    }
    val dismiss = actionButton("Dismiss", gray, white, Color.rgb(208, 213, 221)) {
      dismiss()
    }
    actions.addView(dismiss, LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.MATCH_PARENT, 1f))

    val respond = actionButton("View & respond", white, blue, blue) {
      dismiss()
      val destination = if (data["type"] == "parts_order_overlay")
        "autoassist:///partsdealer/order-details?orderId=${Uri.encode(id)}"
      else
        "autoassist:///mechanic/job-offer?offerId=${Uri.encode(id)}"
      val url = Uri.parse(destination)
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
    actions.addView(respond, LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.MATCH_PARENT, 2f).apply {
      marginStart = dp(context, 9)
    })
    content.addView(actions, actionRowParams)

    // Measure after adding the action row; an explicit window height avoids
    // the WRAP_CONTENT measurement cutting off the lower 12-20dp.
    val overlayWidth = context.resources.displayMetrics.widthPixels - dp(context, 24)
    card.measure(
      View.MeasureSpec.makeMeasureSpec(overlayWidth, View.MeasureSpec.EXACTLY),
      View.MeasureSpec.makeMeasureSpec(0, View.MeasureSpec.UNSPECIFIED)
    )
    val overlayHeight = card.measuredHeight + dp(context, 8)

    val params = WindowManager.LayoutParams(
      overlayWidth,
      overlayHeight,
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
        if (seconds <= 0 || !isEnabled(context) || !Settings.canDrawOverlays(context) || !prefs(context).getBoolean("online", false)) {
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
