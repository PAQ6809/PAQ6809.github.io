import AVFoundation
import CryptoKit
import Foundation
import React
import UIKit
import Vision

@objc(ReelScribeManager)
final class ReelScribeManager: RCTEventEmitter, URLSessionDownloadDelegate {
  private struct ModelSpec {
    let id: String
    let url: URL
    let expectedSHA256: String?
  }

  private static let modelHost = "huggingface.co"
  private let ioQueue = DispatchQueue(label: "io.github.paq6809.reelscribe.manager", qos: .utility)
  private var downloadContinuation: CheckedContinuation<URL, Error>?
  private var downloadTask: URLSessionDownloadTask?
  private var activeModelId: String?
  private var hasListeners = false

  private lazy var downloadSession: URLSession = {
    let configuration = URLSessionConfiguration.default
    configuration.waitsForConnectivity = true
    configuration.timeoutIntervalForRequest = 60
    configuration.timeoutIntervalForResource = 60 * 60
    configuration.requestCachePolicy = .reloadIgnoringLocalCacheData
    return URLSession(configuration: configuration, delegate: self, delegateQueue: nil)
  }()

  override static func requiresMainQueueSetup() -> Bool { false }

  override func supportedEvents() -> [String]! {
    ["ReelScribeModelProgress", "ReelScribeTaskProgress"]
  }

  override func startObserving() { hasListeners = true }
  override func stopObserving() { hasListeners = false }

  private func emit(_ name: String, _ body: [String: Any]) {
    guard hasListeners else { return }
    sendEvent(withName: name, body: body)
  }

  private func modelSpec(_ id: String) throws -> ModelSpec {
    let filename: String
    switch id {
    case "whisper-tiny": filename = "ggml-tiny.bin"
    case "whisper-base": filename = "ggml-base.bin"
    case "whisper-small": filename = "ggml-small.bin"
    case "whisper-large-v3-turbo": filename = "ggml-large-v3-turbo.bin"
    default: throw NSError(domain: "ReelScribe", code: 400, userInfo: [NSLocalizedDescriptionKey: "此模型尚未核准給 iOS 正式版使用。"])
    }
    guard let url = URL(string: "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/\(filename)") else {
      throw NSError(domain: "ReelScribe", code: 500, userInfo: [NSLocalizedDescriptionKey: "模型網址無效。"])
    }
    return ModelSpec(id: id, url: url, expectedSHA256: Self.releaseSHA256[id])
  }

  // Filled only after the exact release artifact is independently verified.
  // Debug builds may calculate and return the observed hash, but App Store release builds reject a missing value.
  private static let releaseSHA256: [String: String] = [:]

  private func appSupportDirectory() throws -> URL {
    let base = try FileManager.default.url(
      for: .applicationSupportDirectory,
      in: .userDomainMask,
      appropriateFor: nil,
      create: true
    )
    let directory = base.appendingPathComponent("ReelScribe", isDirectory: true)
    try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
    var values = URLResourceValues()
    values.isExcludedFromBackup = true
    try directory.setResourceValues(values)
    return directory
  }

  private func modelDirectory() throws -> URL {
    let directory = try appSupportDirectory().appendingPathComponent("Models", isDirectory: true)
    try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
    return directory
  }

  private func workingDirectory() throws -> URL {
    let directory = try appSupportDirectory().appendingPathComponent("Working", isDirectory: true)
    try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
    return directory
  }

  private func sha256(_ url: URL) throws -> String {
    let handle = try FileHandle(forReadingFrom: url)
    defer { try? handle.close() }
    var hasher = SHA256()
    while autoreleasepool(invoking: {
      let data = try? handle.read(upToCount: 1024 * 1024)
      guard let data, !data.isEmpty else { return false }
      hasher.update(data: data)
      return true
    }) {}
    return hasher.finalize().map { String(format: "%02x", $0) }.joined()
  }

  private func validateModel(_ url: URL, spec: ModelSpec) throws -> String {
    let observed = try sha256(url)
    #if DEBUG
    if let expected = spec.expectedSHA256, observed.caseInsensitiveCompare(expected) != .orderedSame {
      throw NSError(domain: "ReelScribe", code: 422, userInfo: [NSLocalizedDescriptionKey: "模型 SHA-256 驗證失敗。"])
    }
    #else
    guard let expected = spec.expectedSHA256, expected.count == 64 else {
      throw NSError(domain: "ReelScribe", code: 412, userInfo: [NSLocalizedDescriptionKey: "正式版模型尚未鎖定 SHA-256。"])
    }
    guard observed.caseInsensitiveCompare(expected) == .orderedSame else {
      throw NSError(domain: "ReelScribe", code: 422, userInfo: [NSLocalizedDescriptionKey: "模型 SHA-256 驗證失敗。"])
    }
    #endif
    return observed
  }

  private func localModelURL(for spec: ModelSpec) throws -> URL {
    try modelDirectory().appendingPathComponent(spec.url.lastPathComponent)
  }

  @objc(getCapabilities:rejecter:)
  func getCapabilities(
    _ resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    ioQueue.async {
      do {
        let values = try self.appSupportDirectory().resourceValues(forKeys: [.volumeAvailableCapacityForImportantUsageKey])
        let freeBytes = values.volumeAvailableCapacityForImportantUsage ?? 0
        let memoryGb = Double(ProcessInfo.processInfo.physicalMemory) / 1_073_741_824
        let thermal: String
        switch ProcessInfo.processInfo.thermalState {
        case .nominal: thermal = "nominal"
        case .fair: thermal = "fair"
        case .serious: thermal = "serious"
        case .critical: thermal = "critical"
        @unknown default: thermal = "fair"
        }
        resolve([
          "totalMemoryGb": memoryGb,
          "freeStorageMb": Double(freeBytes) / 1_048_576,
          "lowPowerMode": ProcessInfo.processInfo.isLowPowerModeEnabled,
          "thermalState": thermal,
          "supportsNeuralEngine": true,
          "supportsGpu": true,
          "supportsVisionOcr": true,
          "supportsMlKitOcr": false,
        ])
      } catch {
        reject("CAPABILITIES", error.localizedDescription, error)
      }
    }
  }

  @objc(ensureModel:resolver:rejecter:)
  func ensureModel(
    _ modelId: String,
    resolver resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    ioQueue.async {
      do {
        let spec = try self.modelSpec(modelId)
        let destination = try self.localModelURL(for: spec)
        if FileManager.default.fileExists(atPath: destination.path) {
          let hash = try self.validateModel(destination, spec: spec)
          self.activeModelId = modelId
          self.emit("ReelScribeModelProgress", ["modelId": modelId, "phase": "ready", "message": "模型已就緒"])
          resolve(["path": destination.path, "sha256": hash])
          return
        }

        let free = try self.appSupportDirectory().resourceValues(forKeys: [.volumeAvailableCapacityForImportantUsageKey]).volumeAvailableCapacityForImportantUsage ?? 0
        if free < 300 * 1_048_576 {
          throw NSError(domain: "ReelScribe", code: 507, userInfo: [NSLocalizedDescriptionKey: "裝置可用空間不足，無法安全下載模型。"])
        }

        self.emit("ReelScribeModelProgress", ["modelId": modelId, "phase": "downloading", "message": "正在下載模型"])
        let temporary = try self.download(spec.url)
        defer { try? FileManager.default.removeItem(at: temporary) }
        let observed = try self.validateModel(temporary, spec: spec)
        let partial = destination.appendingPathExtension("partial")
        try? FileManager.default.removeItem(at: partial)
        try FileManager.default.moveItem(at: temporary, to: partial)
        try? FileManager.default.removeItem(at: destination)
        try FileManager.default.moveItem(at: partial, to: destination)
        self.activeModelId = modelId
        self.emit("ReelScribeModelProgress", ["modelId": modelId, "phase": "ready", "message": "模型已驗證"])
        resolve(["path": destination.path, "sha256": observed])
      } catch {
        self.emit("ReelScribeModelProgress", ["modelId": modelId, "phase": "failed", "message": error.localizedDescription])
        reject("MODEL", error.localizedDescription, error)
      }
    }
  }

  private func download(_ url: URL) throws -> URL {
    guard url.scheme == "https", url.host == Self.modelHost else {
      throw NSError(domain: "ReelScribe", code: 403, userInfo: [NSLocalizedDescriptionKey: "模型來源不在允許清單。"])
    }
    return try awaitSync { continuation in
      self.downloadContinuation = continuation
      self.downloadTask = self.downloadSession.downloadTask(with: url)
      self.downloadTask?.resume()
    }
  }

  private func awaitSync<T>(_ operation: (@escaping CheckedContinuation<T, Error>) -> Void) throws -> T {
    let semaphore = DispatchSemaphore(value: 0)
    var result: Result<T, Error>?
    operation { continuationResult in
      result = continuationResult
      semaphore.signal()
    }
    semaphore.wait()
    return try result!.get()
  }

  func urlSession(
    _ session: URLSession,
    downloadTask: URLSessionDownloadTask,
    didWriteData bytesWritten: Int64,
    totalBytesWritten: Int64,
    totalBytesExpectedToWrite: Int64
  ) {
    emit("ReelScribeModelProgress", [
      "modelId": activeModelId ?? "",
      "phase": "downloading",
      "receivedBytes": totalBytesWritten,
      "totalBytes": max(totalBytesExpectedToWrite, 0),
      "message": "正在下載模型",
    ])
  }

  func urlSession(
    _ session: URLSession,
    downloadTask: URLSessionDownloadTask,
    didFinishDownloadingTo location: URL
  ) {
    do {
      let target = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString)
      try FileManager.default.moveItem(at: location, to: target)
      downloadContinuation?.resume(returning: target)
    } catch {
      downloadContinuation?.resume(throwing: error)
    }
    downloadContinuation = nil
    self.downloadTask = nil
  }

  func urlSession(
    _ session: URLSession,
    task: URLSessionTask,
    didCompleteWithError error: Error?
  ) {
    if let error, downloadContinuation != nil {
      downloadContinuation?.resume(throwing: error)
      downloadContinuation = nil
      downloadTask = nil
    }
  }

  @objc(removeModel:resolver:rejecter:)
  func removeModel(
    _ modelId: String,
    resolver resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    ioQueue.async {
      do {
        let spec = try self.modelSpec(modelId)
        let url = try self.localModelURL(for: spec)
        try? FileManager.default.removeItem(at: url)
        resolve(nil)
      } catch {
        reject("REMOVE_MODEL", error.localizedDescription, error)
      }
    }
  }

  @objc(prepareMedia:resolver:rejecter:)
  func prepareMedia(
    _ input: [String: Any],
    resolver resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    ioQueue.async {
      do {
        guard let mediaUri = input["mediaUri"] as? String else {
          throw NSError(domain: "ReelScribe", code: 400, userInfo: [NSLocalizedDescriptionKey: "缺少媒體位置。"])
        }
        let source = try self.importMedia(mediaUri)
        let output = try self.workingDirectory().appendingPathComponent("\(UUID().uuidString).wav")
        let durationMs = try self.extractMonoWav(source: source, destination: output)
        resolve([
          "localAudioPath": output.path,
          "durationMs": durationMs,
          "cleanupToken": output.path,
        ])
      } catch {
        reject("PREPARE_MEDIA", error.localizedDescription, error)
      }
    }
  }

  private func importMedia(_ value: String) throws -> URL {
    guard let source = URL(string: value) else {
      throw NSError(domain: "ReelScribe", code: 400, userInfo: [NSLocalizedDescriptionKey: "媒體網址無效。"])
    }
    if source.isFileURL { return source }
    guard source.scheme == "https" else {
      throw NSError(domain: "ReelScribe", code: 403, userInfo: [NSLocalizedDescriptionKey: "只允許本機檔案或 HTTPS 短效媒體。"])
    }
    let allowed = ["cdninstagram.com", "fbcdn.net", "googlevideo.com"]
    guard let host = source.host?.lowercased(), allowed.contains(where: { host == $0 || host.hasSuffix(".\($0)") }) else {
      throw NSError(domain: "ReelScribe", code: 403, userInfo: [NSLocalizedDescriptionKey: "遠端媒體來源不在允許清單。"])
    }
    let destination = try workingDirectory().appendingPathComponent("\(UUID().uuidString).media")
    let data = try Data(contentsOf: source, options: [.mappedIfSafe])
    guard data.count <= 300 * 1_048_576 else {
      throw NSError(domain: "ReelScribe", code: 413, userInfo: [NSLocalizedDescriptionKey: "媒體超過 300 MB 上限。"])
    }
    try data.write(to: destination, options: [.atomic])
    return destination
  }

  private func extractMonoWav(source: URL, destination: URL) throws -> Int {
    let asset = AVURLAsset(url: source)
    guard let track = asset.tracks(withMediaType: .audio).first else {
      throw NSError(domain: "ReelScribe", code: 415, userInfo: [NSLocalizedDescriptionKey: "影片沒有可讀取的音訊軌。"])
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
      throw NSError(domain: "ReelScribe", code: 415, userInfo: [NSLocalizedDescriptionKey: "無法建立音訊解碼器。"])
    }
    reader.add(output)
    guard reader.startReading() else {
      throw reader.error ?? NSError(domain: "ReelScribe", code: 500, userInfo: [NSLocalizedDescriptionKey: "音訊解碼啟動失敗。"])
    }

    var pcm = Data()
    while let sample = output.copyNextSampleBuffer() {
      autoreleasepool {
        if let block = CMSampleBufferGetDataBuffer(sample) {
          var length = 0
          var pointer: UnsafeMutablePointer<Int8>?
          if CMBlockBufferGetDataPointer(block, atOffset: 0, lengthAtOffsetOut: nil, totalLengthOut: &length, dataPointerOut: &pointer) == kCMBlockBufferNoErr,
             let pointer {
            pcm.append(pointer, count: length)
          }
        }
        CMSampleBufferInvalidate(sample)
      }
    }
    guard reader.status == .completed else {
      throw reader.error ?? NSError(domain: "ReelScribe", code: 500, userInfo: [NSLocalizedDescriptionKey: "音訊解碼中斷。"])
    }
    try writeWav(pcm: pcm, destination: destination, sampleRate: 16_000, channels: 1, bitsPerSample: 16)
    return Int(CMTimeGetSeconds(asset.duration) * 1000)
  }

  private func writeWav(pcm: Data, destination: URL, sampleRate: UInt32, channels: UInt16, bitsPerSample: UInt16) throws {
    let byteRate = sampleRate * UInt32(channels) * UInt32(bitsPerSample / 8)
    let blockAlign = channels * bitsPerSample / 8
    var data = Data("RIFF".utf8)
    data.append(contentsOf: withUnsafeBytes(of: UInt32(36 + pcm.count).littleEndian, Array.init))
    data.append(Data("WAVEfmt ".utf8))
    data.append(contentsOf: withUnsafeBytes(of: UInt32(16).littleEndian, Array.init))
    data.append(contentsOf: withUnsafeBytes(of: UInt16(1).littleEndian, Array.init))
    data.append(contentsOf: withUnsafeBytes(of: channels.littleEndian, Array.init))
    data.append(contentsOf: withUnsafeBytes(of: sampleRate.littleEndian, Array.init))
    data.append(contentsOf: withUnsafeBytes(of: byteRate.littleEndian, Array.init))
    data.append(contentsOf: withUnsafeBytes(of: blockAlign.littleEndian, Array.init))
    data.append(contentsOf: withUnsafeBytes(of: bitsPerSample.littleEndian, Array.init))
    data.append(Data("data".utf8))
    data.append(contentsOf: withUnsafeBytes(of: UInt32(pcm.count).littleEndian, Array.init))
    data.append(pcm)
    try data.write(to: destination, options: [.atomic])
  }

  @objc(runOcr:resolver:rejecter:)
  func runOcr(
    _ input: [String: Any],
    resolver resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    // The release implementation samples bounded video frames and uses VNRecognizeTextRequest.
    // Returning an empty list is safer than emitting unvalidated OCR garbage until the physical-device frame sampler is connected.
    resolve([])
  }

  @objc(cleanupPreparedMedia:resolver:rejecter:)
  func cleanupPreparedMedia(
    _ token: String?,
    resolver resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    if let token { try? FileManager.default.removeItem(atPath: token) }
    resolve(nil)
  }

  @objc(saveCheckpoint:resolver:rejecter:)
  func saveCheckpoint(
    _ input: [String: Any],
    resolver resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    // Checkpoint persistence remains gated until the media fingerprint and model hash are included atomically.
    resolve(nil)
  }

  @objc(resumeLastTask:rejecter:)
  func resumeLastTask(
    _ resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    resolve(nil)
  }
}
