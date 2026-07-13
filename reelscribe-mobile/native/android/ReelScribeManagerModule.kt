package io.github.paq6809.reelscribe

import android.app.ActivityManager
import android.content.Context
import android.media.AudioFormat
import android.media.MediaCodec
import android.media.MediaExtractor
import android.media.MediaFormat
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
import com.facebook.react.modules.core.DeviceEventManagerModule
import java.io.BufferedInputStream
import java.io.BufferedOutputStream
import java.io.File
import java.io.FileInputStream
import java.io.FileOutputStream
import java.io.RandomAccessFile
import java.net.HttpURLConnection
import java.net.URL
import java.nio.ByteBuffer
import java.nio.ByteOrder
import java.security.MessageDigest
import java.util.UUID
import java.util.concurrent.Executors
import kotlin.math.max

class ReelScribeManagerModule(
  private val reactContext: ReactApplicationContext,
) : ReactContextBaseJavaModule(reactContext) {
  private data class ModelSpec(
    val id: String,
    val filename: String,
    val expectedSha256: String?,
    val minimumFreeMb: Long,
  )

  private val executor = Executors.newSingleThreadExecutor { runnable ->
    Thread(runnable, "ReelScribeManager").apply { priority = Thread.NORM_PRIORITY - 1 }
  }
  private var listenerCount = 0

  override fun getName(): String = "ReelScribeManager"

  private fun emit(name: String, values: Map<String, Any?>) {
    if (listenerCount <= 0) return
    val map = Arguments.createMap()
    values.forEach { (key, value) ->
      when (value) {
        null -> map.putNull(key)
        is String -> map.putString(key, value)
        is Boolean -> map.putBoolean(key, value)
        is Int -> map.putInt(key, value)
        is Long -> map.putDouble(key, value.toDouble())
        is Double -> map.putDouble(key, value)
        else -> map.putString(key, value.toString())
      }
    }
    reactContext
      .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
      .emit(name, map)
  }

  @ReactMethod
  fun addListener(eventName: String) {
    listenerCount += 1
  }

  @ReactMethod
  fun removeListeners(count: Int) {
    listenerCount = max(0, listenerCount - count)
  }

  private fun modelSpec(modelId: String): ModelSpec = when (modelId) {
    "whisper-tiny" -> ModelSpec(modelId, "ggml-tiny.bin", RELEASE_SHA256[modelId], 300)
    "whisper-base" -> ModelSpec(modelId, "ggml-base.bin", RELEASE_SHA256[modelId], 500)
    "whisper-small" -> ModelSpec(modelId, "ggml-small.bin", RELEASE_SHA256[modelId], 1_200)
    "whisper-large-v3-turbo" -> ModelSpec(modelId, "ggml-large-v3-turbo.bin", RELEASE_SHA256[modelId], 2_500)
    else -> throw IllegalArgumentException("此模型尚未核准給 Android 使用。")
  }

  private fun appDirectory(): File = File(reactContext.filesDir, "reelscribe").apply { mkdirs() }
  private fun modelDirectory(): File = File(appDirectory(), "models").apply { mkdirs() }
  private fun workingDirectory(): File = File(reactContext.cacheDir, "reelscribe-working").apply { mkdirs() }
  private fun freeStorageMb(): Long = StatFs(appDirectory().absolutePath).availableBytes / 1_048_576L

  private fun sha256(file: File): String {
    val digest = MessageDigest.getInstance("SHA-256")
    FileInputStream(file).use { input ->
      val buffer = ByteArray(1024 * 1024)
      while (true) {
        val read = input.read(buffer)
        if (read <= 0) break
        digest.update(buffer, 0, read)
      }
    }
    return digest.digest().joinToString("") { "%02x".format(it) }
  }

  private fun validateModel(file: File, spec: ModelSpec): String {
    val observed = sha256(file)
    val expected = spec.expectedSha256
    if (BuildConfig.DEBUG) {
      if (expected != null && !observed.equals(expected, ignoreCase = true)) {
        throw SecurityException("模型 SHA-256 驗證失敗。")
      }
    } else {
      if (expected == null || !expected.matches(Regex("^[a-fA-F0-9]{64}$"))) {
        throw SecurityException("正式版模型尚未鎖定 SHA-256。")
      }
      if (!observed.equals(expected, ignoreCase = true)) {
        throw SecurityException("模型 SHA-256 驗證失敗。")
      }
    }
    return observed
  }

  @ReactMethod
  fun getCapabilities(promise: Promise) {
    executor.execute {
      try {
        val activityManager = reactContext.getSystemService(Context.ACTIVITY_SERVICE) as ActivityManager
        val memory = ActivityManager.MemoryInfo().also(activityManager::getMemoryInfo)
        val power = reactContext.getSystemService(Context.POWER_SERVICE) as PowerManager
        val thermal = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
          when (power.currentThermalStatus) {
            PowerManager.THERMAL_STATUS_NONE, PowerManager.THERMAL_STATUS_LIGHT -> "nominal"
            PowerManager.THERMAL_STATUS_MODERATE -> "fair"
            PowerManager.THERMAL_STATUS_SEVERE -> "serious"
            else -> "critical"
          }
        } else {
          "fair"
        }
        promise.resolve(Arguments.createMap().apply {
          putDouble("totalMemoryGb", memory.totalMem.toDouble() / 1_073_741_824.0)
          putDouble("freeStorageMb", freeStorageMb().toDouble())
          putBoolean("lowPowerMode", power.isPowerSaveMode)
          putString("thermalState", thermal)
          putBoolean("supportsNeuralEngine", false)
          putBoolean("supportsGpu", true)
          putBoolean("supportsVisionOcr", false)
          putBoolean("supportsMlKitOcr", true)
        })
      } catch (error: Throwable) {
        promise.reject("CAPABILITIES", error.message, error)
      }
    }
  }

  @ReactMethod
  fun ensureModel(modelId: String, promise: Promise) {
    executor.execute {
      try {
        val spec = modelSpec(modelId)
        if (freeStorageMb() < spec.minimumFreeMb) {
          throw IllegalStateException("裝置可用空間不足，無法安全下載 ${spec.filename}。")
        }
        val destination = File(modelDirectory(), spec.filename)
        if (destination.isFile) {
          val hash = validateModel(destination, spec)
          emit("ReelScribeModelProgress", mapOf("modelId" to modelId, "phase" to "ready", "message" to "模型已就緒"))
          promise.resolve(Arguments.createMap().apply {
            putString("path", destination.absolutePath)
            putString("sha256", hash)
          })
          return@execute
        }

        val partial = File(modelDirectory(), "${spec.filename}.partial")
        emit("ReelScribeModelProgress", mapOf("modelId" to modelId, "phase" to "downloading", "message" to "正在下載模型"))
        downloadWithResume(
          URL("https://huggingface.co/ggerganov/whisper.cpp/resolve/main/${spec.filename}"),
          partial,
          MODEL_HOSTS,
        ) { written, total ->
          emit(
            "ReelScribeModelProgress",
            mapOf(
              "modelId" to modelId,
              "phase" to "downloading",
              "receivedBytes" to written,
              "totalBytes" to total,
              "message" to "正在下載模型",
            ),
          )
        }
        emit("ReelScribeModelProgress", mapOf("modelId" to modelId, "phase" to "verifying", "message" to "正在驗證模型"))
        val hash = validateModel(partial, spec)
        if (destination.exists() && !destination.delete()) error("無法移除舊模型。")
        if (!partial.renameTo(destination)) {
          partial.copyTo(destination, overwrite = true)
          partial.delete()
        }
        emit("ReelScribeModelProgress", mapOf("modelId" to modelId, "phase" to "ready", "message" to "模型已驗證"))
        promise.resolve(Arguments.createMap().apply {
          putString("path", destination.absolutePath)
          putString("sha256", hash)
        })
      } catch (error: Throwable) {
        emit("ReelScribeModelProgress", mapOf("modelId" to modelId, "phase" to "failed", "message" to (error.message ?: "模型處理失敗")))
        promise.reject("MODEL", error.message, error)
      }
    }
  }

  private fun allowedHost(host: String, allowlist: Set<String>): Boolean {
    val normalized = host.lowercase()
    return allowlist.any { normalized == it || normalized.endsWith(".$it") }
  }

  private fun downloadWithResume(
    initialUrl: URL,
    destination: File,
    allowlist: Set<String>,
    onProgress: (Long, Long) -> Unit,
  ) {
    var url = initialUrl
    var redirects = 0
    var existing = if (destination.exists()) destination.length() else 0L

    while (true) {
      if (url.protocol.lowercase() != "https" || !allowedHost(url.host, allowlist)) {
        throw SecurityException("下載來源不在允許清單。")
      }
      val connection = (url.openConnection() as HttpURLConnection).apply {
        instanceFollowRedirects = false
        connectTimeout = 30_000
        readTimeout = 60_000
        requestMethod = "GET"
        setRequestProperty("Accept-Encoding", "identity")
        if (existing > 0) setRequestProperty("Range", "bytes=$existing-")
      }
      val code = connection.responseCode
      if (code in 300..399) {
        val location = connection.getHeaderField("Location") ?: throw IllegalStateException("重新導向缺少 Location。")
        connection.disconnect()
        redirects += 1
        if (redirects > 5) throw IllegalStateException("模型下載重新導向過多。")
        url = URL(url, location)
        continue
      }
      if (code != HttpURLConnection.HTTP_OK && code != HttpURLConnection.HTTP_PARTIAL) {
        val message = connection.errorStream?.bufferedReader()?.use { it.readText().take(300) }
        connection.disconnect()
        throw IllegalStateException("下載失敗 HTTP $code ${message.orEmpty()}")
      }
      if (existing > 0 && code == HttpURLConnection.HTTP_OK) {
        destination.delete()
        existing = 0
      }
      val contentLength = connection.getHeaderFieldLong("Content-Length", -1)
      val total = if (contentLength >= 0) existing + contentLength else -1
      destination.parentFile?.mkdirs()
      BufferedInputStream(connection.inputStream, 256 * 1024).use { input ->
        FileOutputStream(destination, existing > 0).use { raw ->
          BufferedOutputStream(raw, 256 * 1024).use { output ->
            val buffer = ByteArray(256 * 1024)
            var written = existing
            while (true) {
              val read = input.read(buffer)
              if (read <= 0) break
              output.write(buffer, 0, read)
              written += read
              onProgress(written, total)
            }
          }
        }
      }
      connection.disconnect()
      return
    }
  }

  @ReactMethod
  fun removeModel(modelId: String, promise: Promise) {
    executor.execute {
      try {
        val spec = modelSpec(modelId)
        File(modelDirectory(), spec.filename).delete()
        File(modelDirectory(), "${spec.filename}.partial").delete()
        promise.resolve(null)
      } catch (error: Throwable) {
        promise.reject("REMOVE_MODEL", error.message, error)
      }
    }
  }

  @ReactMethod
  fun prepareMedia(input: ReadableMap, promise: Promise) {
    executor.execute {
      try {
        val value = input.getString("mediaUri") ?: throw IllegalArgumentException("缺少媒體位置。")
        val job = File(workingDirectory(), UUID.randomUUID().toString()).apply { mkdirs() }
        val source = importMedia(value, job)
        val wav = File(job, "audio.wav")
        val durationMs = decodeToMono16kWav(source, wav)
        promise.resolve(Arguments.createMap().apply {
          putString("localAudioPath", wav.absolutePath)
          putDouble("durationMs", durationMs.toDouble())
          putString("cleanupToken", job.absolutePath)
        })
      } catch (error: Throwable) {
        promise.reject("PREPARE_MEDIA", error.message, error)
      }
    }
  }

  private fun importMedia(value: String, job: File): File {
    val uri = Uri.parse(value)
    val destination = File(job, "source.media")
    when (uri.scheme?.lowercase()) {
      "file" -> File(uri.path ?: throw IllegalArgumentException("檔案路徑無效。"))
        .inputStream().use { input ->
          destination.outputStream().use { output -> input.copyTo(output) }
        }
      "content" -> reactContext.contentResolver.openInputStream(uri)?.use { input ->
        destination.outputStream().use { output -> input.copyTo(output) }
      } ?: throw IllegalArgumentException("無法開啟選取的媒體。")
      "https" -> {
        downloadWithResume(URL(value), destination, MEDIA_HOSTS) { written, _ ->
          if (written > 300L * 1_048_576L) throw IllegalStateException("媒體超過 300 MB 上限。")
        }
      }
      else -> throw SecurityException("只允許本機檔案、Content URI 或 HTTPS 短效媒體。")
    }
    if (destination.length() > 300L * 1_048_576L) {
      destination.delete()
      throw IllegalStateException("媒體超過 300 MB 上限。")
    }
    return destination
  }

  private fun decodeToMono16kWav(source: File, destination: File): Long {
    val extractor = MediaExtractor()
    extractor.setDataSource(source.absolutePath)
    var trackIndex = -1
    var selectedFormat: MediaFormat? = null
    for (index in 0 until extractor.trackCount) {
      val candidate = extractor.getTrackFormat(index)
      val mime = candidate.getString(MediaFormat.KEY_MIME).orEmpty()
      if (mime.startsWith("audio/")) {
        trackIndex = index
        selectedFormat = candidate
        break
      }
    }
    val audioFormat = selectedFormat
    if (trackIndex < 0 || audioFormat == null) {
      extractor.release()
      throw IllegalArgumentException("影片沒有可讀取的音訊軌。")
    }

    extractor.selectTrack(trackIndex)
    val mime = audioFormat.getString(MediaFormat.KEY_MIME) ?: throw IllegalArgumentException("音訊格式無效。")
    val codec = MediaCodec.createDecoderByType(mime)
    codec.configure(audioFormat, null, null, 0)
    codec.start()

    destination.parentFile?.mkdirs()
    val wav = RandomAccessFile(destination, "rw")
    wav.setLength(0)
    wav.write(ByteArray(44))

    var sampleRate = if (audioFormat.containsKey(MediaFormat.KEY_SAMPLE_RATE)) audioFormat.getInteger(MediaFormat.KEY_SAMPLE_RATE) else 16_000
    var channels = if (audioFormat.containsKey(MediaFormat.KEY_CHANNEL_COUNT)) audioFormat.getInteger(MediaFormat.KEY_CHANNEL_COUNT) else 1
    var pcmEncoding = AudioFormat.ENCODING_PCM_16BIT
    var outputBytes = 0L
    var sourceFramesSeen = 0L
    var nextOutputSourceFrame = 0.0
    val info = MediaCodec.BufferInfo()
    var inputDone = false
    var outputDone = false

    try {
      while (!outputDone) {
        if (!inputDone) {
          val inputIndex = codec.dequeueInputBuffer(10_000)
          if (inputIndex >= 0) {
            val buffer = codec.getInputBuffer(inputIndex) ?: throw IllegalStateException("無法取得解碼輸入緩衝區。")
            val size = extractor.readSampleData(buffer, 0)
            if (size < 0) {
              codec.queueInputBuffer(inputIndex, 0, 0, 0, MediaCodec.BUFFER_FLAG_END_OF_STREAM)
              inputDone = true
            } else {
              codec.queueInputBuffer(inputIndex, 0, size, extractor.sampleTime, 0)
              extractor.advance()
            }
          }
        }

        val outputIndex = codec.dequeueOutputBuffer(info, 10_000)
        when {
          outputIndex >= 0 -> {
            val buffer = codec.getOutputBuffer(outputIndex)
            if (buffer != null && info.size > 0) {
              buffer.position(info.offset)
              buffer.limit(info.offset + info.size)
              val frameCount = when (pcmEncoding) {
                AudioFormat.ENCODING_PCM_FLOAT -> info.size / (4 * max(1, channels))
                else -> info.size / (2 * max(1, channels))
              }
              val mono = ShortArray(frameCount)
              if (pcmEncoding == AudioFormat.ENCODING_PCM_FLOAT) {
                val floats = buffer.order(ByteOrder.LITTLE_ENDIAN).asFloatBuffer()
                for (frame in 0 until frameCount) {
                  var sum = 0.0f
                  for (channel in 0 until channels) sum += floats.get()
                  val value = (sum / max(1, channels)).coerceIn(-1.0f, 1.0f)
                  mono[frame] = (value * Short.MAX_VALUE).toInt().toShort()
                }
              } else {
                val shorts = buffer.order(ByteOrder.LITTLE_ENDIAN).asShortBuffer()
                for (frame in 0 until frameCount) {
                  var sum = 0
                  for (channel in 0 until channels) sum += shorts.get().toInt()
                  mono[frame] = (sum / max(1, channels)).coerceIn(Short.MIN_VALUE.toInt(), Short.MAX_VALUE.toInt()).toShort()
                }
              }

              val globalEnd = sourceFramesSeen + frameCount
              val sourceStep = sampleRate.toDouble() / 16_000.0
              while (nextOutputSourceFrame < globalEnd) {
                val local = (nextOutputSourceFrame - sourceFramesSeen).toInt().coerceIn(0, max(0, frameCount - 1))
                val sample = mono[local].toInt()
                wav.write(sample and 0xff)
                wav.write((sample ushr 8) and 0xff)
                outputBytes += 2
                nextOutputSourceFrame += sourceStep
              }
              sourceFramesSeen = globalEnd
            }
            outputDone = info.flags and MediaCodec.BUFFER_FLAG_END_OF_STREAM != 0
            codec.releaseOutputBuffer(outputIndex, false)
          }
          outputIndex == MediaCodec.INFO_OUTPUT_FORMAT_CHANGED -> {
            val outputFormat = codec.outputFormat
            if (outputFormat.containsKey(MediaFormat.KEY_SAMPLE_RATE)) sampleRate = outputFormat.getInteger(MediaFormat.KEY_SAMPLE_RATE)
            if (outputFormat.containsKey(MediaFormat.KEY_CHANNEL_COUNT)) channels = outputFormat.getInteger(MediaFormat.KEY_CHANNEL_COUNT)
            if (outputFormat.containsKey(MediaFormat.KEY_PCM_ENCODING)) pcmEncoding = outputFormat.getInteger(MediaFormat.KEY_PCM_ENCODING)
            if (pcmEncoding != AudioFormat.ENCODING_PCM_16BIT && pcmEncoding != AudioFormat.ENCODING_PCM_FLOAT) {
              throw IllegalArgumentException("此裝置回傳不支援的 PCM 編碼。")
            }
          }
        }
      }

      writeWavHeader(wav, outputBytes, 16_000, 1, 16)
      val durationUs = if (audioFormat.containsKey(MediaFormat.KEY_DURATION)) audioFormat.getLong(MediaFormat.KEY_DURATION) else 0L
      return durationUs / 1_000L
    } finally {
      wav.close()
      codec.stop()
      codec.release()
      extractor.release()
    }
  }

  private fun writeWavHeader(file: RandomAccessFile, dataBytes: Long, sampleRate: Int, channels: Int, bits: Int) {
    val byteRate = sampleRate * channels * bits / 8
    val blockAlign = channels * bits / 8
    val header = ByteBuffer.allocate(44).order(ByteOrder.LITTLE_ENDIAN)
    header.put("RIFF".toByteArray(Charsets.US_ASCII))
    header.putInt((36L + dataBytes).coerceAtMost(Int.MAX_VALUE.toLong()).toInt())
    header.put("WAVEfmt ".toByteArray(Charsets.US_ASCII))
    header.putInt(16)
    header.putShort(1.toShort())
    header.putShort(channels.toShort())
    header.putInt(sampleRate)
    header.putInt(byteRate)
    header.putShort(blockAlign.toShort())
    header.putShort(bits.toShort())
    header.put("data".toByteArray(Charsets.US_ASCII))
    header.putInt(dataBytes.coerceAtMost(Int.MAX_VALUE.toLong()).toInt())
    file.seek(0)
    file.write(header.array())
  }

  @ReactMethod
  fun runOcr(input: ReadableMap, promise: Promise) {
    // Fail-safe placeholder. ML Kit frame sampling stays disabled until physical-device tests reject random UI and road text reliably.
    promise.resolve(Arguments.createArray())
  }

  @ReactMethod
  fun cleanupPreparedMedia(token: String?, promise: Promise) {
    try {
      if (!token.isNullOrBlank()) File(token).deleteRecursively()
      promise.resolve(null)
    } catch (error: Throwable) {
      promise.reject("CLEANUP", error.message, error)
    }
  }

  @ReactMethod
  fun saveCheckpoint(input: ReadableMap, promise: Promise) {
    // Disabled until model hash, media fingerprint and settings are persisted atomically.
    promise.resolve(null)
  }

  @ReactMethod
  fun resumeLastTask(promise: Promise) {
    promise.resolve(null)
  }

  override fun invalidate() {
    executor.shutdownNow()
    super.invalidate()
  }

  private companion object {
    val RELEASE_SHA256: Map<String, String> = emptyMap()
    val MODEL_HOSTS = setOf(
      "huggingface.co",
      "cdn-lfs.huggingface.co",
      "cdn-lfs-us-1.hf.co",
      "cdn-lfs-eu-1.hf.co",
      "cas-bridge.xethub.hf.co",
      "transfer.xethub.hf.co",
    )
    val MEDIA_HOSTS = setOf("cdninstagram.com", "fbcdn.net", "googlevideo.com")
  }
}
