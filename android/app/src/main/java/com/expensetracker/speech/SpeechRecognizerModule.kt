package com.expensetracker.speech // <-- your actual package

import android.content.Intent
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.speech.RecognitionListener
import android.speech.RecognizerIntent
import android.speech.SpeechRecognizer
import com.facebook.react.bridge.*
import com.facebook.react.modules.core.DeviceEventManagerModule
import java.util.Locale

class SpeechRecognizerModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    private var speechRecognizer: SpeechRecognizer? = null
    private val mainHandler = Handler(Looper.getMainLooper())

    // Guards against overlapping start/stop calls — this is what was making the mic unstable.
    private enum class State { IDLE, STARTING, LISTENING, STOPPING }
    private var state = State.IDLE
    private var pendingLanguageTag: String? = null
    private var hasRetriedLanguage = false
    private var hasRetriedRecovery = false

    override fun getName() = "RNSpeechRecognizer"

    private fun sendEvent(eventName: String, params: WritableMap?) {
        reactApplicationContext
            .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
            .emit(eventName, params)
    }

    private fun emitError(code: Int, message: String) {
        val map = Arguments.createMap()
        map.putInt("code", code)
        map.putString("message", message)
        sendEvent("onSpeechError", map)
    }

    @ReactMethod
    fun isAvailable(promise: Promise) {
        promise.resolve(SpeechRecognizer.isRecognitionAvailable(reactApplicationContext))
    }

    private fun ensureRecognizer(): SpeechRecognizer {
        var recognizer = speechRecognizer
        if (recognizer == null) {
            recognizer = SpeechRecognizer.createSpeechRecognizer(reactApplicationContext)
            recognizer.setRecognitionListener(createListener())
            speechRecognizer = recognizer
        }
        return recognizer
    }

    @ReactMethod
    fun startListening(locale: String?) {
        mainHandler.post {
            // Ignore taps that arrive while a session is already starting/running
            if (state == State.STARTING || state == State.LISTENING) return@post

            if (!SpeechRecognizer.isRecognitionAvailable(reactApplicationContext)) {
                emitError(-2, "Speech recognition not available on this device")
                return@post
            }

            hasRetriedLanguage = false
            hasRetriedRecovery = false
            val languageTag = locale?.takeIf { it.isNotBlank() } ?: Locale.getDefault().toLanguageTag()
            pendingLanguageTag = languageTag
            state = State.STARTING
            beginListening(languageTag)
        }
    }

    private fun beginListening(languageTag: String) {
        val recognizer = ensureRecognizer()

        val intent = Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH).apply {
            putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM)
            putExtra(RecognizerIntent.EXTRA_LANGUAGE, languageTag)
            putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS, true)
            putExtra(RecognizerIntent.EXTRA_CALLING_PACKAGE, reactApplicationContext.packageName)
            putExtra(RecognizerIntent.EXTRA_SPEECH_INPUT_COMPLETE_SILENCE_LENGTH_MILLIS, 2000)
            putExtra(RecognizerIntent.EXTRA_SPEECH_INPUT_POSSIBLY_COMPLETE_SILENCE_LENGTH_MILLIS, 2000)
            putExtra(RecognizerIntent.EXTRA_SPEECH_INPUT_MINIMUM_LENGTH_MILLIS, 15000)
            putExtra(RecognizerIntent.EXTRA_PREFER_OFFLINE, false)
        }

        // cancel(), not destroy() — clears any dangling session on the SAME connection,
        // instead of tearing down and rebinding the service every time.
        recognizer.cancel()
        recognizer.startListening(intent)
    }

    /** Full teardown + rebuild — only used as a deliberate, delayed recovery step
     *  after a genuine SERVER_DISCONNECTED, never on the normal start path. */
    private fun restartRecognizerFresh(languageTag: String, delayMs: Long) {
        mainHandler.postDelayed({
            speechRecognizer?.destroy()
            speechRecognizer = null
            state = State.STARTING
            beginListening(languageTag)
        }, delayMs)
    }

    @ReactMethod
    fun stopListening() {
        mainHandler.post {
            if (state != State.LISTENING && state != State.STARTING) return@post
            state = State.STOPPING
            speechRecognizer?.stopListening()
        }
    }

    @ReactMethod
    fun destroyRecognizer() {
        mainHandler.post {
            speechRecognizer?.destroy()
            speechRecognizer = null
            state = State.IDLE
        }
    }

    @ReactMethod
    fun addListener(eventName: String) {}
    @ReactMethod
    fun removeListeners(count: Int) {}

    private fun createListener(): RecognitionListener = object : RecognitionListener {
        override fun onReadyForSpeech(params: Bundle?) {
            state = State.LISTENING
            sendEvent("onSpeechStart", null)
        }

        override fun onBeginningOfSpeech() {}
        override fun onBufferReceived(buffer: ByteArray?) {}

        override fun onEndOfSpeech() {
            state = State.STOPPING
            sendEvent("onSpeechEnd", null)
        }

        override fun onEvent(eventType: Int, params: Bundle?) {}

        override fun onRmsChanged(rmsdB: Float) {
            val map = Arguments.createMap()
            map.putDouble("value", rmsdB.toDouble())
            sendEvent("onSpeechVolumeChanged", map)
        }

        override fun onError(error: Int) {
            val languageTag = pendingLanguageTag ?: Locale.getDefault().toLanguageTag()

            when (error) {
                12, 13 -> { // LANGUAGE_NOT_SUPPORTED / LANGUAGE_UNAVAILABLE
                    if (!hasRetriedLanguage) {
                        hasRetriedLanguage = true
                        pendingLanguageTag = "en-US"
                        state = State.STARTING
                        mainHandler.postDelayed({ beginListening("en-US") }, 200)
                        return
                    }
                }
                11 -> { // SERVER_DISCONNECTED — the connection itself is broken, rebuild it
                    if (!hasRetriedRecovery) {
                        hasRetriedRecovery = true
                        state = State.STARTING
                        restartRecognizerFresh(languageTag, 400)
                        return
                    }
                }
                8 -> { // RECOGNIZER_BUSY — short backoff, retry once on the same instance
                    if (!hasRetriedRecovery) {
                        hasRetriedRecovery = true
                        mainHandler.postDelayed({ beginListening(languageTag) }, 300)
                        return
                    }
                }
            }

            state = State.IDLE
            emitError(error, errorMessage(error))
        }

        override fun onResults(results: Bundle?) {
            state = State.IDLE
            val matches = results?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)
            val map = Arguments.createMap()
            val arr = Arguments.createArray()
            matches?.forEach { arr.pushString(it) }
            map.putArray("value", arr)
            sendEvent("onSpeechResults", map)
        }

        override fun onPartialResults(partialResults: Bundle?) {
            val matches = partialResults?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)
            val map = Arguments.createMap()
            val arr = Arguments.createArray()
            matches?.forEach { arr.pushString(it) }
            map.putArray("value", arr)
            sendEvent("onSpeechPartialResults", map)
        }
    }

    private fun errorMessage(error: Int): String = when (error) {
        SpeechRecognizer.ERROR_AUDIO -> "Audio recording error"
        SpeechRecognizer.ERROR_CLIENT -> "Client side error"
        SpeechRecognizer.ERROR_INSUFFICIENT_PERMISSIONS -> "Microphone permission denied"
        SpeechRecognizer.ERROR_NETWORK -> "Network error"
        SpeechRecognizer.ERROR_NETWORK_TIMEOUT -> "Network timeout"
        SpeechRecognizer.ERROR_NO_MATCH -> "Didn't catch that, try again"
        SpeechRecognizer.ERROR_RECOGNIZER_BUSY -> "Recognizer busy, please try again"
        SpeechRecognizer.ERROR_SERVER -> "Server error"
        SpeechRecognizer.ERROR_SPEECH_TIMEOUT -> "No speech detected"
        11 -> "Speech service disconnected, please try again"
        12 -> "Selected language isn't supported on this device"
        13 -> "Language pack unavailable, try again"
        else -> "Unknown speech recognition error ($error)"
    }

    override fun onCatalystInstanceDestroy() {
        super.onCatalystInstanceDestroy()
        mainHandler.post {
            speechRecognizer?.destroy()
            speechRecognizer = null
            state = State.IDLE
        }
    }
}