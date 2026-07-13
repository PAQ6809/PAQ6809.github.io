import Foundation
import AVFoundation
import Vision
import React

@objc(ReelScribeManager)
final class ReelScribeManager: RCTEventEmitter {
  private let workQueue = DispatchQueue(label: "io.github.paq6809.reelscribe.manager", qos: .userInitiated)
  private let fileManager = FileManager.default

  override static func requiresMainQueueSetup() -> Bool { false }

  override func supportedEvents() -> [String]! {
    ["ReelScribeModelProgress", "ReelScribeTaskProgress"]
  }

  private var applicationSupportDirectory: URL {
    let root = fileManager.urls(for: .applicationSupportDirectory, in: .userDomainMask)[0]
    let directory = root.appendingPathComponent("ReelScribe", isDirectory: true)
    try? fileManager.createDirectory(at: directory, withIntermediateDirectories: true)
    var values = URLResourceValues()
    values.isExcludedFromBackup = true
    var mutable = directory
    try? mutable.setResourceValues(values)
    return directory
  }

  private var workDirectory: URL {
    let directory = fileManager.temporaryDirectory.appendingPathComponent("ReelScribeWork", isDirectory: true)
    try? fileManager.createDirectory(at: directory, withIntermediateDirectories: true)
    return directory
  }

  @objc(getCapabilities:rejecter:)
  func getCapabilities(
    _ resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    workQueue.async {
      do {
        let keys: Set<URLResourceKey> = [.volumeAvailableCapacityForImportantUsageKey]
        let values = try self.applicationSupportDirectory.resourceValues(forKeys: keys)
        let available = values.volumeAvailableCapacityForImportantUsage ?? 0
        let thermal: String
        switch ProcessInfo.processInfo.thermalState {
        case .nominal: thermal = "nominal"
        case .fair: thermal = "fair"
        case .serious: thermal = "serious"
        case .critical: thermal = "critical"
        @unknown default: thermal = "fair"
        }
        resolve([
          "totalMemoryGb": Double(ProcessInfo.processInfo.physicalMemory) / 1_073_741_824.0,
          "freeStorageMb": Double(available) / 1_048_576.0,
          "lowPowerMode": ProcessInfo.processInfo.isLowPowerModeEnabled,
          "thermalState": thermal,
          "supportsNeuralEngine": true,
          "supportsGpu": true,
          "supportsVisionOcr": true,
          "supportsMlKitOcr": false,
        ])
      } catch {
        reject("CAPABILITY_ERROR", error.localizedDescription, error)
      }
    }
  }

  @objc(prepareMedia:resolver:rejecter:)
  func prepareMedia(
    _ input: NSDictionary,
    resolver resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    guard let value = input["mediaUri"] as? String, let sourceURL = localURL(from: value) else {
      reject("INVALID_MEDIA", "無法讀取所選媒體網址。", nil)
      return
    }

    workQueue.async {
      let accessing = sourceURL.startAccessingSecurityScopedResource()
      defer { if accessing { sourceURL.stopAccessingSecurityScopedResource() } }
      do {
        let token = UUID().uuidString
        let output = self.workDirectory.appendingPathComponent("\(token).wav")
        let duration = try self.convertToMono16kWav(sourceURL: sourceURL, outputURL: output)
        resolve([
          "localAudioPath": output.path,
          "durationMs": Int(max(0, duration) * 1000),
          "cleanupToken": token,
        ])
      } catch {
        reject("MEDIA_PREPARATION_FAILED", error.localizedDescription, error)
      }
    }
  }

  @objc(cleanupPreparedMedia:resolver:rejecter:)
  func cleanupPreparedMedia(
    _ cleanupToken: String?,
    resolver resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    workQueue.async {
      guard let cleanupToken, cleanupToken.range(of: "^[A-Fa-f0-9-]{36}$", options: .regularExpression) != nil else {
        resolve(nil)
        return
      }
      let url = self.workDirectory.appendingPathComponent("\(cleanupToken).wav")
      try? self.fileManager.removeItem(at: url)
      resolve(nil)
    }
  }

  @objc(runOcr:resolver:rejecter:)
  func runOcr(
    _ input: NSDictionary,
    resolver resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    guard let value = input["mediaUri"] as? String, let sourceURL = localURL(from: value) else {
      reject("INVALID_MEDIA", "無法讀取 OCR 媒體。", nil)
      return
    }
    let language = (input["language"] as? String) ?? "auto"

    workQueue.async {
      let accessing = sourceURL.startAccessingSecurityScopedResource()
      defer { if accessing { sourceURL.stopAccessingSecurityScopedResource() } }
      do {
        let segments = try self.recognizeBurnedInText(sourceURL: sourceURL, language: language)
        resolve(segments)
      } catch {
        reject("OCR_FAILED", error.localizedDescription, error)
      }
    }
  }

  @objc(saveCheckpoint:resolver:rejecter:)
  func saveCheckpoint(
    _ input: NSDictionary,
    resolver resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    workQueue.async {
      do {
        var checkpoint = input as? [String: Any] ?? [:]
        checkpoint["schemaVersion"] = 1
        checkpoint["updatedAt"] = ISO8601DateFormatter().string(from: Date())
        let data = try JSONSerialization.data(withJSONObject: checkpoint, options: [.prettyPrinted, .sortedKeys])
        let url = self.applicationSupportDirectory.appendingPathComponent("last-checkpoint.json")
        try data.write(to: url, options: [.atomic, .completeFileProtectionUntilFirstUserAuthentication])
        resolve(nil)
      } catch {
        reject("CHECKPOINT_SAVE_FAILED", error.localizedDescription, error)
      }
    }
  }

  @objc(resumeLastTask:rejecter:)
  func resumeLastTask(
    _ resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    workQueue.async {
      let url = self.applicationSupportDirectory.appendingPathComponent("last-checkpoint.json")
      guard self.fileManager.fileExists(atPath: url.path) else {
        resolve(nil)
        return
      }
      do {
        let data = try Data(contentsOf: url)
        guard let value = try JSONSerialization.jsonObject(with: data) as? [String: Any] else {
          resolve(nil)
          return
        }
        let segments = value["segments"] as? [[String: Any]] ?? []
        let text = segments.compactMap { $0["text"] as? String }.joined(separator: " ")
        let duration = segments.compactMap { $0["endMs"] as? NSNumber }.map(\.intValue).max() ?? 0
        resolve([
          "text": text,
          "durationMs": duration,
          "processingMs": 0,
          "modelId": value["modelId"] as? String ?? "whisper-tiny",
          "segments": segments,
          "resumedFromCheckpoint": true,
        ])
      } catch {
        reject("CHECKPOINT_READ_FAILED", error.localizedDescription, error)
      }
    }
  }

  private func localURL(from value: String) -> URL? {
    if let url = URL(string: value), url.isFileURL { return url }
    if value.hasPrefix("/") { return URL(fileURLWithPath: value) }
    return nil
  }

  private func convertToMono16kWav(sourceURL: URL, outputURL: URL) throws -> Double {
    try? fileManager.removeItem(at: outputURL)
    let asset = AVURLAsset(url: sourceURL)
    guard let track = asset.tracks(withMediaType: .audio).first else {
      throw NSError(domain: "ReelScribeManager", code: 10, userInfo: [NSLocalizedDescriptionKey: "影片沒有可讀取的音訊軌。"])
    }
    let reader = try AVAssetReader(asset: asset)
    let settings: [String: Any] = [
      AVFormatIDKey: kAudioFormatLinearPCM,
      AVSampleRateKey: 16_000,
      AVNumberOfChannelsKey: 1,
      AVLinearPCMBitDepthKey: 16,
      AVLinearPCMIsFloatKey: false,
      AVLinearPCMIsBigEndianKey: false,
      AVLinearPCMIsNonInterleaved: false,
    ]
    let output = AVAssetReaderTrackOutput(track: track, outputSettings: settings)
    output.alwaysCopiesSampleData = false
    guard reader.canAdd(output) else {
      throw NSError(domain: "ReelScribeManager", code: 11, userInfo: [NSLocalizedDescriptionKey: "目前裝置無法建立音訊解碼器。"])
    }
    reader.add(output)
    guard reader.startReading() else {
      throw reader.error ?? NSError(domain: "ReelScribeManager", code: 12, userInfo: [NSLocalizedDescriptionKey: "音訊解碼無法啟動。"])
    }

    guard fileManager.createFile(
      atPath: outputURL.path,
      contents: wavHeader(dataLength: 0, sampleRate: 16_000, channels: 1, bitsPerSample: 16)
    ) else {
      throw NSError(domain: "ReelScribeManager", code: 13, userInfo: [NSLocalizedDescriptionKey: "無法建立暫存音訊檔。"])
    }

    let handle = try FileHandle(forWritingTo: outputURL)
    var dataLength = 0
    do {
      handle.seekToEndOfFile()
      while reader.status == .reading, let sample = output.copyNextSampleBuffer() {
        guard let buffer = CMSampleBufferGetDataBuffer(sample) else { continue }
        let length = CMBlockBufferGetDataLength(buffer)
        guard length > 0 else { continue }

        var chunk = Data(count: length)
        let copyStatus = chunk.withUnsafeMutableBytes { destination -> OSStatus in
          guard let baseAddress = destination.baseAddress else { return kCMBlockBufferBadPointerParameterErr }
          return CMBlockBufferCopyDataBytes(buffer, atOffset: 0, dataLength: length, destination: baseAddress)
        }
        guard copyStatus == kCMBlockBufferNoErr else {
          throw NSError(domain: "ReelScribeManager", code: 14, userInfo: [NSLocalizedDescriptionKey: "音訊緩衝區讀取失敗。"])
        }

        handle.write(chunk)
        dataLength += length
        if dataLength > Int(UInt32.max) - 36 {
          throw NSError(domain: "ReelScribeManager", code: 15, userInfo: [NSLocalizedDescriptionKey: "音訊長度超過 WAV 安全上限。"])
        }
      }

      if reader.status == .failed {
        throw reader.error ?? NSError(domain: "ReelScribeManager", code: 16, userInfo: [NSLocalizedDescriptionKey: "音訊解碼失敗。"])
      }
      guard dataLength > 0 else {
        throw NSError(domain: "ReelScribeManager", code: 17, userInfo: [NSLocalizedDescriptionKey: "音訊內容是空的。"])
      }

      handle.seek(toFileOffset: 0)
      handle.write(wavHeader(dataLength: dataLength, sampleRate: 16_000, channels: 1, bitsPerSample: 16))
      handle.synchronizeFile()
      try handle.close()
    } catch {
      try? handle.close()
      try? fileManager.removeItem(at: outputURL)
      throw error
    }

    let decodedDuration = Double(dataLength) / 32_000.0
    let assetDuration = asset.duration.seconds
    return assetDuration.isFinite && assetDuration > 0 ? assetDuration : decodedDuration
  }

  private func wavHeader(dataLength: Int, sampleRate: Int, channels: Int, bitsPerSample: Int) -> Data {
    var data = Data()
    func ascii(_ value: String) { data.append(value.data(using: .ascii)!) }
    func u16(_ value: UInt16) { var little = value.littleEndian; data.append(Data(bytes: &little, count: 2)) }
    func u32(_ value: UInt32) { var little = value.littleEndian; data.append(Data(bytes: &little, count: 4)) }
    let byteRate = sampleRate * channels * bitsPerSample / 8
    let blockAlign = channels * bitsPerSample / 8
    ascii("RIFF"); u32(UInt32(36 + dataLength)); ascii("WAVE")
    ascii("fmt "); u32(16); u16(1); u16(UInt16(channels)); u32(UInt32(sampleRate))
    u32(UInt32(byteRate)); u16(UInt16(blockAlign)); u16(UInt16(bitsPerSample))
    ascii("data"); u32(UInt32(dataLength))
    return data
  }

  private func recognitionLanguages(_ language: String) -> [String] {
    switch language {
    case "zh", "yue": return ["zh-Hant", "zh-Hans", "en-US"]
    case "ja": return ["ja-JP", "en-US"]
    case "ko": return ["ko-KR", "en-US"]
    case "en": return ["en-US"]
    default: return ["zh-Hant", "en-US", "ja-JP", "ko-KR"]
    }
  }

  private func recognizeBurnedInText(sourceURL: URL, language: String) throws -> [[String: Any]] {
    let asset = AVURLAsset(url: sourceURL)
    let duration = max(0, asset.duration.seconds)
    guard duration.isFinite, duration > 0 else { return [] }
    let generator = AVAssetImageGenerator(asset: asset)
    generator.appliesPreferredTrackTransform = true
    generator.requestedTimeToleranceBefore = CMTime(seconds: 0.15, preferredTimescale: 600)
    generator.requestedTimeToleranceAfter = CMTime(seconds: 0.15, preferredTimescale: 600)
    let interval = max(1.5, duration / 60.0)
    let total = min(60, max(1, Int(ceil(duration / interval))))
    var accepted: [[String: Any]] = []

    for index in 0..<total {
      autoreleasepool {
        let seconds = min(max(0, duration - 0.05), Double(index) * interval + min(0.25, interval / 3.0))
        guard let image = try? generator.copyCGImage(at: CMTime(seconds: seconds, preferredTimescale: 600), actualTime: nil) else { return }
        let cropHeight = max(1, Int(Double(image.height) * 0.45))
        let cropRect = CGRect(x: 0, y: 0, width: image.width, height: cropHeight)
        guard let cropped = image.cropping(to: cropRect) else { return }
        let request = VNRecognizeTextRequest()
        request.recognitionLevel = .accurate
        request.usesLanguageCorrection = true
        request.recognitionLanguages = recognitionLanguages(language)
        let handler = VNImageRequestHandler(cgImage: cropped, options: [:])
        guard (try? handler.perform([request])) != nil else { return }
        let candidates = (request.results ?? []).compactMap { $0.topCandidates(1).first }
        let strong = candidates.filter { $0.confidence >= 0.55 && $0.string.trimmingCharacters(in: .whitespacesAndNewlines).count >= 2 }
        guard !strong.isEmpty else { return }
        let text = strong.map(\.string).joined(separator: " ").replacingOccurrences(of: "\\s+", with: " ", options: .regularExpression).trimmingCharacters(in: .whitespacesAndNewlines)
        let confidence = strong.map { Double($0.confidence) }.reduce(0, +) / Double(strong.count)
        if let previous = accepted.last,
           let previousText = previous["text"] as? String,
           previousText == text,
           let previousStart = previous["startMs"] as? Int {
          accepted[accepted.count - 1] = [
            "startMs": previousStart,
            "endMs": Int(min(duration, seconds + interval) * 1000),
            "text": text,
            "confidence": Int(confidence * 100),
            "source": "ocr",
          ]
        } else {
          accepted.append([
            "startMs": Int(seconds * 1000),
            "endMs": Int(min(duration, seconds + interval) * 1000),
            "text": text,
            "confidence": Int(confidence * 100),
            "source": "ocr",
          ])
        }
      }
    }
    return accepted
  }
}
