package io.github.paq6809.reelscribe.manager

import android.app.ActivityManager
import android.content.Context
import android.graphics.Bitmap
import android.media.AudioFormat
import android.media.MediaCodec
import android.media.MediaExtractor
import android.media.MediaFormat
import android.media.MediaMetadataRetriever
import android.net.Uri
import android.os.Build
import android.os.PowerManager
import android.os.StatFs
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.bridge.WritableArray
import com.facebook.react.bridge.WritableMap
import com.google.android.gms.tasks.Tasks
import com.google.mlkit.vision.common.InputImage
import com.google.mlkit.vision.text.TextRecognition
import com.google.mlkit.vision.text.TextRecognizer
import com.google.mlkit.vision.text.chinese.ChineseTextRecognizerOptions
import com.google.mlkit.vision.text.japanese.JapaneseTextRecognizerOptions
import com.google.mlkit.vision.text.korean.KoreanTextRecognizerOptions
import com.google.mlkit.vision.text.latin.TextRecognizerOptions
import org.json.JSONArray
import org.json.JSONObject
import java.io.BufferedInputStream
import java.io.BufferedOutputStream
import java.io.File
import java.io.FileOutputStream
import java.io.RandomAccessFile
import java.net.HttpURLConnection
import java.net.URI
import java.net.URL
import java.nio.ByteBuffer
import java.nio.ByteOrder
import java.util.UUID
import java.util.concurrent.Executors
import kotlin.math.ceil
import kotlin.math.max
import kotlin.math.min

class ReelScribeManagerModule(
  private val context: ReactApplicationContext,
) : ReactContextBaseJavaModule(context) {
  private val executor = Executors.newSingleThreadExecutor()
  private val workDirectory = File(context.cacheDir, "ReelScribeWork").apply { mkdirs() }
  private val checkpointFile = File(context.filesDir, "reelscribe-last-checkpoint.json")

  override fun getName(): String = "ReelScribeManager"

  @ReactMethod
  fun addListener(eventName: String) = Unit

  @ReactMethod
  fun removeListeners(count: Double) = Unit

  @ReactMethod
  fun getCapabilities(promise: Promise) {
    executor.execute {
      try {
        val activityManager = context.getSystemService(Context.ACTIVITY_SERVICE) as ActivityManager
        val memory = ActivityManager.MemoryInfo().also(activityManager::getMemoryInfo)
        val stat = StatFs(context.filesDir.absolutePath)
        val power = context.getSystemService(Context.POWER_SERVICE) as PowerManager
        val thermal = if (Build.VERSION.SDK_INT >= 29) {
          when (power.currentThermalStatus) {
            PowerManager.THERMAL_STATUS_NONE, PowerManager.THERMAL_STATUS_LIGHT -> "nominal"
            PowerManager.THERMAL_STATUS_MODERATE -> "fair"
            PowerManager.THERMAL_STATUS_SEVERE -> "serious"
            PowerManager.THERMAL_STATUS_CRITICAL, PowerManager.THERMAL_STATUS_EMERGENCY, PowerManager.THERMAL_STATUS_SHUTDOWN -> "critical"
            else -> "fair"
          }
        } else {
          "fair"
        }
        val result = Arguments.createMap().apply {
          putDouble("totalMemoryGb", memory.totalMem.toDouble() / 1_073_741_824.0)
          putDouble("freeStorageMb", stat.availableBytes.toDouble() / 1_048_576.0)
          putBoolean("lowPowerMode", power.isPowerSaveMode)
          putString("thermalState", thermal)
          putBoolean("supportsNeuralEngine", false)
          putBoolean("supportsGpu", false)
          putBoolean("supportsVisionOcr", false)
          putBoolean("supportsMlKitOcr", true)
        }
        promise.resolve(result)
      } catch (error: Throwable) {
        promise.reject("CAPABILITY_ERROR", error)
      }
    }
  }

  @ReactMethod
  fun prepareMedia(input: ReadableMap, promise: Promise) {
    val mediaUri = input.getString("mediaUri")
    if (mediaUri.isNullOrBlank()) {
      promise.reject("INVALID_MEDIA", "缺少媒體網址。")
      return
    }
    val enhanceSpeech = input.hasKey("enhanceSpeech") && input.getBoolean("enhanceSpeech")
    executor.execute {
      var staged: File? = null
      try {
        val token = UUID.randomUUID().toString()
        val source = stageMedia(mediaUri, token).also { if (it.deleteAfterUse) staged = it.file }
        val output = File(workDirectory, "$token.wav")
        val durationMs = decodeToMono16kWav(source.uri, output, enhanceSpeech)
        val result = Arguments.createMap().apply {
          putString("localAudioPath", output.absolutePath)
          putDouble("durationMs", durationMs.toDouble())
          putString("cleanupToken", token)
        }
        promise.resolve(result)
      } catch (error: Throwable) {
        staged?.delete()
        promise.reject("MEDIA_PREPARATION_FAILED", error)
      }
    }
  }

  @ReactMethod
  fun cleanupPreparedMedia(cleanupToken: String?, promise: Promise) {
    executor.execute {
      if (!cleanupToken.isNullOrBlank() && cleanupToken.matches(Regex("^[A-Fa-f0-9-]{36}$"))) {
        File(workDirectory, "$cleanupToken.wav").delete()
        File(workDirectory, "$cleanupToken.source").delete()
      }
      promise.resolve(null)
    }
  }

  @ReactMethod
  fun runOcr(input: ReadableMap, promise: Promise) {
    val mediaUri = input.getString("mediaUri")
    if (mediaUri.isNullOrBlank()) {
      promise.reject("INVALID_MEDIA", "缺少 OCR 媒體網址。")
      return
    }
    val language = input.getString("language") ?: "auto"
    executor.execute {
      var staged: File? = null
      var recognizer: TextRecognizer? = null
      var retriever: MediaMetadataRetriever? = null
      try {
        val token = UUID.randomUUID().toString()
        val source = stageMedia(mediaUri, token).also { if (it.deleteAfterUse) staged = it.file }
        retriever = MediaMetadataRetriever().apply { setDataSource(context, source.uri) }
        val durationMs = retriever.extractMetadata(MediaMetadataRetriever.METADATA_KEY_DURATION)?.toLongOrNull() ?: 0L
        if (durationMs <= 0L) throw IllegalStateException("無法取得影片長度。")
        recognizer = recognizerFor(language)
        val maxFrames = 60
        val intervalMs = max(1_500L, ceil(durationMs.toDouble() / maxFrames).toLong())
        val total = min(maxFrames, max(1, ceil(durationMs.toDouble() / intervalMs).toInt()))
        val segments = Arguments.createArray()
        var previousText = ""
        var previousStart = 0L
        var previousEnd = 0L

        fun pushPrevious() {
          if (previousText.isBlank()) return
          segments.pushMap(Arguments.createMap().apply {
            putDouble("startMs", previousStart.toDouble())
            putDouble("endMs", previousEnd.toDouble())
            putString("text", previousText)
            putDouble("confidence", 75.0)
            putString("source", "ocr")
          })
        }

        for (index in 0 until total) {
          val timeMs = min(max(0L, durationMs - 50L), index * intervalMs + min(250L, intervalMs / 3L))
          val frame = retriever.getFrameAtTime(timeMs * 1_000L, MediaMetadataRetriever.OPTION_CLOSEST) ?: continue
          val cropHeight = max(1, (frame.height * 0.45).toInt())
          val cropped = Bitmap.createBitmap(frame, 0, frame.height - cropHeight, frame.width, cropHeight)
          if (cropped !== frame) frame.recycle()
          val result = Tasks.await(recognizer.process(InputImage.fromBitmap(cropped, 0)))
          cropped.recycle()
          val text = normalizeOcrText(result.text)
          if (!acceptableOcrText(text, language)) continue
          val end = min(durationMs, timeMs + intervalMs)
          if (text == previousText) {
            previousEnd = end
          } else {
            pushPrevious()
            previousText = text
            previousStart = timeMs
            previousEnd = end
          }
        }
        pushPrevious()
        promise.resolve(segments)
      } catch (error: Throwable) {
        promise.reject("OCR_FAILED", error)
      } finally {
        recognizer?.close()
        retriever?.release()
        staged?.delete()
      }
    }
  }

  @ReactMethod
  fun saveCheckpoint(input: ReadableMap, promise: Promise) {
    executor.execute {
      try {
        val objectValue = JSONObject(input.toHashMap()).apply {
          put("schemaVersion", 1)
          put("updatedAt", java.time.Instant.now().toString())
        }
        checkpointFile.writeText(objectValue.toString(2), Charsets.UTF_8)
        promise.resolve(null)
      } catch (error: Throwable) {
        promise.reject("CHECKPOINT_SAVE_FAILED", error)
      }
    }
  }

  @ReactMethod
  fun resumeLastTask(promise: Promise) {
    executor.execute {
      try {
        if (!checkpointFile.exists()) {
          promise.resolve(null)
          return@execute
        }
        val source = JSONObject(checkpointFile.readText(Charsets.UTF_8))
        val segmentsJson = source.optJSONArray("segments") ?: JSONArray()
        val segments = jsonArrayToWritable(segmentsJson)
        var durationMs = 0.0
        val texts = mutableListOf<String>()
        for (index in 0 until segmentsJson.length()) {
          val item = segmentsJson.optJSONObject(index) ?: continue
          durationMs = max(durationMs, item.optDouble("endMs", 0.0))
          item.optString("text").takeIf { it.isNotBlank() }?.let(texts::add)
        }
        promise.resolve(Arguments.createMap().apply {
          putString("text", texts.joinToString(" "))
          putDouble("durationMs", durationMs)
          putDouble("processingMs", 0.0)
          putString("modelId", source.optString("modelId", "whisper-tiny"))
          putArray("segments", segments)
          putBoolean("resumedFromCheckpoint", true)
        })
      } catch (error: Throwable) {
        promise.reject("CHECKPOINT_READ_FAILED", error)
      }
    }
  }

  private data class StagedSource(val uri: Uri, val file: File?, val deleteAfterUse: Boolean)

  private fun stageMedia(value: String, token: String): StagedSource {
    val uri = Uri.parse(value)
    if (uri.scheme == "http" || uri.scheme == "https") {
      if (uri.scheme != "https" || uri.host != "vite-xi-one-59.vercel.app") {
        throw SecurityException("遠端媒體只允許 ReelScribe 短效簽章來源。")
      }
      val target = File(workDirectory, "$token.source")
      downloadBounded(URL(value), target, 300L * 1024L * 1024L)
      return StagedSource(Uri.fromFile(target), target, true)
    }
    if (uri.scheme == "content" || uri.scheme == "file") return StagedSource(uri, null, false)
    if (value.startsWith("/")) return StagedSource(Uri.fromFile(File(value)), null, false)
    throw SecurityException("不支援的媒體來源。")
  }

  private fun downloadBounded(url: URL, target: File, maximumBytes: Long) {
    val connection = (url.openConnection() as HttpURLConnection).apply {
      connectTimeout = 20_000
      readTimeout = 60_000
      instanceFollowRedirects = false
      setRequestProperty("Accept", "video/*,audio/*,application/octet-stream")
      setRequestProperty("Cache-Control", "no-store")
    }
    try {
      connection.connect()
      if (connection.responseCode !in 200..299) throw IllegalStateException("媒體服務回傳 HTTP ${connection.responseCode}")
      val length = connection.contentLengthLong
      if (length > maximumBytes) throw IllegalStateException("媒體超過 300 MB 安全上限。")
      BufferedInputStream(connection.inputStream).use { input ->
        BufferedOutputStream(FileOutputStream(target)).use { output ->
          val buffer = ByteArray(64 * 1024)
          var total = 0L
          while (true) {
            val read = input.read(buffer)
            if (read < 0) break
            total += read
            if (total > maximumBytes) throw IllegalStateException("媒體超過 300 MB 安全上限。")
            output.write(buffer, 0, read)
          }
        }
      }
    } catch (error: Throwable) {
      target.delete()
      throw error
    } finally {
      connection.disconnect()
    }
  }

  private fun setExtractorSource(extractor: MediaExtractor, uri: Uri) {
    if (uri.scheme == "content") {
      val descriptor = context.contentResolver.openAssetFileDescriptor(uri, "r")
        ?: throw IllegalStateException("無法開啟選取的媒體。")
      descriptor.use {
        if (it.declaredLength >= 0) extractor.setDataSource(it.fileDescriptor, it.startOffset, it.declaredLength)
        else extractor.setDataSource(it.fileDescriptor)
      }
    } else {
      extractor.setDataSource(uri.path ?: throw IllegalStateException("媒體路徑無效。"))
    }
  }

  private fun decodeToMono16kWav(uri: Uri, output: File, enhanceSpeech: Boolean): Long {
    output.delete()
    val extractor = MediaExtractor()
    setExtractorSource(extractor, uri)
    var trackIndex = -1
    var inputFormat: MediaFormat? = null
    for (index in 0 until extractor.trackCount) {
      val format = extractor.getTrackFormat(index)
      if (format.getString(MediaFormat.KEY_MIME)?.startsWith("audio/") == true) {
        trackIndex = index
        inputFormat = format
        break
      }
    }
    if (trackIndex < 0 || inputFormat == null) {
      extractor.release()
      throw IllegalStateException("影片沒有可讀取的音訊軌。")
    }
    extractor.selectTrack(trackIndex)
    val mime = inputFormat.getString(MediaFormat.KEY_MIME) ?: throw IllegalStateException("音訊格式未知。")
    val decoder = MediaCodec.createDecoderByType(mime)
    decoder.configure(inputFormat, null, null, 0)
    decoder.start()

    val random = RandomAccessFile(output, "rw")
    random.setLength(0)
    random.write(ByteArray(44))
    var dataBytes = 0L
    var sampleRate = inputFormat.getInteger(MediaFormat.KEY_SAMPLE_RATE)
    var channels = inputFormat.getInteger(MediaFormat.KEY_CHANNEL_COUNT)
    var pcmEncoding = AudioFormat.ENCODING_PCM_16BIT
    var inputDone = false
    var outputDone = false
    var accumulator = 0L
    var previousInput = 0.0
    var previousHighPass = 0.0
    val bufferInfo = MediaCodec.BufferInfo()

    try {
      while (!outputDone) {
        if (!inputDone) {
          val index = decoder.dequeueInputBuffer(10_000)
          if (index >= 0) {
            val buffer = decoder.getInputBuffer(index) ?: throw IllegalStateException("無法取得音訊輸入緩衝。")
            val size = extractor.readSampleData(buffer, 0)
            if (size < 0) {
              decoder.queueInputBuffer(index, 0, 0, 0, MediaCodec.BUFFER_FLAG_END_OF_STREAM)
              inputDone = true
            } else {
              decoder.queueInputBuffer(index, 0, size, extractor.sampleTime, 0)
              extractor.advance()
            }
          }
        }

        when (val index = decoder.dequeueOutputBuffer(bufferInfo, 10_000)) {
          MediaCodec.INFO_OUTPUT_FORMAT_CHANGED -> {
            val outputFormat = decoder.outputFormat
            sampleRate = outputFormat.getInteger(MediaFormat.KEY_SAMPLE_RATE)
            channels = outputFormat.getInteger(MediaFormat.KEY_CHANNEL_COUNT)
            if (outputFormat.containsKey(MediaFormat.KEY_PCM_ENCODING)) pcmEncoding = outputFormat.getInteger(MediaFormat.KEY_PCM_ENCODING)
          }
          MediaCodec.INFO_TRY_AGAIN_LATER, MediaCodec.INFO_OUTPUT_BUFFERS_CHANGED -> Unit
          else -> if (index >= 0) {
            val buffer = decoder.getOutputBuffer(index)
            if (buffer != null && bufferInfo.size > 0) {
              buffer.position(bufferInfo.offset)
              buffer.limit(bufferInfo.offset + bufferInfo.size)
              val bytes = ByteArray(bufferInfo.size)
              buffer.get(bytes)
              val samples = decodePcmFrames(bytes, channels, pcmEncoding)
              for (sampleValue in samples) {
                var sample = sampleValue
                if (enhanceSpeech) {
                  val alpha = 0.967
                  val highPass = alpha * (previousHighPass + sample - previousInput)
                  previousInput = sample
                  previousHighPass = highPass
                  sample = highPass
                }
                accumulator += 16_000L
                while (accumulator >= sampleRate) {
                  val pcm = (sample.coerceIn(-1.0, 1.0) * 32767.0).toInt().toShort()
                  random.write(pcm.toInt() and 0xff)
                  random.write((pcm.toInt() shr 8) and 0xff)
                  dataBytes += 2
                  accumulator -= sampleRate.toLong()
                }
              }
            }
            outputDone = bufferInfo.flags and MediaCodec.BUFFER_FLAG_END_OF_STREAM != 0
            decoder.releaseOutputBuffer(index, false)
          }
        }
      }
      random.seek(0)
      random.write(wavHeader(dataBytes, 16_000, 1, 16))
    } finally {
      random.close()
      decoder.stop()
      decoder.release()
      extractor.release()
    }
    if (dataBytes == 0L) throw IllegalStateException("音訊內容是空的。")
    return dataBytes * 1000L / 32_000L
  }

  private fun decodePcmFrames(bytes: ByteArray, channels: Int, encoding: Int): DoubleArray {
    if (channels <= 0) return DoubleArray(0)
    return if (encoding == AudioFormat.ENCODING_PCM_FLOAT) {
      val buffer = ByteBuffer.wrap(bytes).order(ByteOrder.LITTLE_ENDIAN)
      val frameCount = bytes.size / 4 / channels
      DoubleArray(frameCount) {
        var sum = 0.0
        repeat(channels) { sum += buffer.float.toDouble() }
        sum / channels
      }
    } else {
      val buffer = ByteBuffer.wrap(bytes).order(ByteOrder.LITTLE_ENDIAN)
      val frameCount = bytes.size / 2 / channels
      DoubleArray(frameCount) {
        var sum = 0.0
        repeat(channels) { sum += buffer.short.toDouble() / 32768.0 }
        sum / channels
      }
    }
  }

  private fun wavHeader(dataBytes: Long, sampleRate: Int, channels: Int, bits: Int): ByteArray {
    val byteRate = sampleRate * channels * bits / 8
    val blockAlign = channels * bits / 8
    return ByteBuffer.allocate(44).order(ByteOrder.LITTLE_ENDIAN).apply {
      put("RIFF".toByteArray(Charsets.US_ASCII)); putInt((36L + dataBytes).toInt())
      put("WAVE".toByteArray(Charsets.US_ASCII)); put("fmt ".toByteArray(Charsets.US_ASCII))
      putInt(16); putShort(1); putShort(channels.toShort()); putInt(sampleRate); putInt(byteRate)
      putShort(blockAlign.toShort()); putShort(bits.toShort()); put("data".toByteArray(Charsets.US_ASCII)); putInt(dataBytes.toInt())
    }.array()
  }

  private fun recognizerFor(language: String): TextRecognizer = when (language) {
    "zh", "yue", "auto" -> TextRecognition.getClient(ChineseTextRecognizerOptions.Builder().build())
    "ja" -> TextRecognition.getClient(JapaneseTextRecognizerOptions.Builder().build())
    "ko" -> TextRecognition.getClient(KoreanTextRecognizerOptions.Builder().build())
    else -> TextRecognition.getClient(TextRecognizerOptions.DEFAULT_OPTIONS)
  }

  private fun normalizeOcrText(value: String): String = value
    .replace(Regex("[\\r\\n]+"), " ")
    .replace(Regex("\\s+"), " ")
    .trim()

  private fun acceptableOcrText(value: String, language: String): Boolean {
    if (value.length < 2) return false
    val characters = value.filterNot(Char::isWhitespace)
    if (characters.isEmpty()) return false
    val letters = characters.count { it.isLetter() }
    val symbols = characters.count { !it.isLetterOrDigit() }
    if (symbols.toDouble() / characters.length > 0.45) return false
    if (letters.toDouble() / characters.length < 0.35) return false
    if (language == "zh" || language == "yue" || language == "auto") {
      val cjk = characters.count { it.code in 0x3400..0x9FFF }
      if (cjk == 0 && characters.length >= 8) return false
    }
    return true
  }

  private fun jsonArrayToWritable(array: JSONArray): WritableArray {
    val result = Arguments.createArray()
    for (index in 0 until array.length()) {
      when (val value = array.get(index)) {
        is JSONObject -> result.pushMap(jsonObjectToWritable(value))
        is JSONArray -> result.pushArray(jsonArrayToWritable(value))
        is String -> result.pushString(value)
        is Boolean -> result.pushBoolean(value)
        is Int -> result.pushInt(value)
        is Number -> result.pushDouble(value.toDouble())
        JSONObject.NULL -> result.pushNull()
      }
    }
    return result
  }

  private fun jsonObjectToWritable(objectValue: JSONObject): WritableMap {
    val map = Arguments.createMap()
    val keys = objectValue.keys()
    while (keys.hasNext()) {
      val key = keys.next()
      when (val value = objectValue.get(key)) {
        is JSONObject -> map.putMap(key, jsonObjectToWritable(value))
        is JSONArray -> map.putArray(key, jsonArrayToWritable(value))
        is String -> map.putString(key, value)
        is Boolean -> map.putBoolean(key, value)
        is Int -> map.putInt(key, value)
        is Number -> map.putDouble(key, value.toDouble())
        JSONObject.NULL -> map.putNull(key)
      }
    }
    return map
  }
}
