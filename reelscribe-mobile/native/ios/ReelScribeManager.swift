import AVFoundation
import CryptoKit
import Foundation
import React

@objc(ReelScribeManager)
final class ReelScribeManager: RCTEventEmitter, URLSessionDownloadDelegate {
  private struct ModelSpec {
    let id: String
    let url: URL
    let expectedSHA256: String?
  }

  private static let modelHost = "huggingface.co"
  private static let remoteMediaHosts = ["cdninstagram.com", "fbcdn.net", "googlevideo.com"]

  // Release builds intentionally fail closed until independently verified hashes are inserted.
  private static let releaseSHA256: [String: String] = [:]

  private let ioQueue = DispatchQueue(label: "io.github.paq6809.reelscribe.manager", qos: .utility)
  private var downloadCompletion: ((Result<URL, Error>) -> Void)?
  private var currentDownloadModelId: String?
  private var hasListeners = false

  private lazy var downloadSession: URLSession = {
    let configuration = URLSessionConfiguration.ephemeral
    configuration.waitsForConnectivity = true
    configuration.timeoutIntervalForRequest = 60
    configuration.timeoutIntervalForResource = 60 * 60
    configuration.requestCachePolicy = .reloadIgnoringLocalCacheData
    configuration.urlCache = nil
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
    default:
      throw NSError(
        domain: "ReelScribe",
        code: 400,
        userInfo: [NSLocalizedDescriptionKey: "此模型尚未核准給 iOS 使用。"]
      )
    }
    guard let url = URL(string: "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/\(filename)") else {
      throw NSError(domain: "ReelScribe", code: 500, userInfo: [NSLocalizedDescriptionKey: "模型網址無效。"])
    }
    return ModelSpec(id: id, url: url, expectedSHA256: Self.releaseSHA256[id])
  }

  private func appSupportDirectory() throws -> URL {
    let base = try FileManager.default.url(
      for: .applicationSupportDirectory,
      in: .userDomainMask,
      appropriateFor: nil,
      create: true
    )
    var directory = base.appendingPathComponent("ReelScribe", isDirectory: true)
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

  private func localModelURL(for spec: ModelSpec) throws -> URL {
    try modelDirectory().appendingPathComponent(spec.url.lastPathComponent)
  }

  private func sha256(_ url: URL) throws -> String {
    let handle = try FileHandle(forReadingFrom: url)
    defer { try? handle.close() }
    var hasher = SHA256()
    while true {
      guard let data = try handle.read(upToCount: 1024 * 1024), !data.isEmpty else { break }
      hasher.update(data: data)
    }
    return hasher.finalize().map { String(format: "%02x", $0) }.joined()
  }

  private func validateModel(_ url: URL, spec: ModelSpec) throws -> String {
    let observed = try sha256(url)
    #if DEBUG
    if let expected = spec.expectedSHA256,
       observed.caseInsensitiveCompare(expected) != .orderedSame {
      throw NSError(domain: "ReelScribe", code: 422, userInfo: [NSLocalizedDescriptionKey: "模型 SHA-256 驗證失敗。"])
    }
    #else
    guard let expected = spec.expectedSHA256, expected.range(of: "^[a-fA-F0-9]{64}$", options: .regularExpression) != nil else {
      throw NSError(domain: "ReelScribe", code: 412, userInfo: [NSLocalizedDescriptionKey: "正式版模型尚未鎖定 SHA-256。"])
    }
    guard observed.caseInsensitiveCompare(expected) == .orderedSame else {
      throw NSError(domain: "ReelScribe", code: 422, userInfo: [NSLocalizedDescriptionKey: "模型 SHA-256 驗證失敗。"])
    }
    #endif
    return observed
  }

  private func availableCapacity() throws -> Int64 {
    let values = try appSupportDirectory().resourceValues(forKeys: [.volumeAvailableCapacityForImportantUsageKey])
    return values.volumeAvailableCapacityForImportantUsage ?? 0
  }

  @objc(getCapabilities:rejecter:)
  func getCapabilities(
    _ resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    ioQueue.async {
      do {
        let thermal: String
        switch ProcessInfo.processInfo.thermalState {
        case .nominal: thermal = "nominal"
        case .fair: thermal = "fair"
        case .serious: thermal = "serious"
        case .critical: thermal = "critical"
        @unknown default: thermal = "fair"
        }
        resolve([
          "totalMemoryGb": Double(ProcessInfo.processInfo.physicalMemory) / 1_073_741_824,
          "freeStorageMb": Double(try self.availableCapacity()) / 1_048_576,
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
          self.emit("ReelScribeModelProgress", ["modelId": modelId, "phase": "ready", "message": "模型已就緒"])
          resolve(["path": destination.path, "sha256": hash])
          return
        }

        guard try self.availableCapacity() >= 300 * 1_048_576 else {
          throw NSError(domain: "ReelScribe", code: 507, userInfo: [NSLocalizedDescriptionKey: "裝置可用空間不足，無法安全下載模型。"])
        }

        self.currentDownloadModelId = modelId
        self.emit("ReelScribeModelProgress", ["modelId": modelId, "phase": "downloading", "message": "正在下載模型"])
        let temporary = try self.download(spec.url, allowedHosts: [Self.modelHost])
        defer { try? FileManager.default.removeItem(at: temporary) }

        self.emit("ReelScribeModelProgress", ["modelId": modelId, "phase": "verifying", "message": "正在驗證模型"])
        let observed = try self.validateModel(temporary, spec: spec)
        let partial = destination.appendingPathExtension("partial")
        try? FileManager.default.removeItem(at: partial)
        try FileManager.default.moveItem(at: temporary, to: partial)
        try? FileManager.default.removeItem(at: destination)
        try FileManager.default.moveItem(at: partial, to: destination)

        self.emit("ReelScribeModelProgress", ["modelId": modelId, "phase": "ready", "message": "模型已驗證"])
        resolve(["path": destination.path, "sha256": observed])
      } catch {
        self.emit("ReelScribeModelProgress", ["modelId": modelId, "phase": "failed", "message": error.localizedDescription])
        reject("MODEL", error.localizedDescription, error)
      }
    }
  }

  private func download(_ url: URL, allowedHosts: [String]) throws -> URL {
    guard url.scheme?.lowercased() == "https",
          let host = url.host?.lowercased(),
          allowedHosts.contains(where: { host == $0 || host.hasSuffix(".\($0)") }) else {
      throw NSError(domain: "ReelScribe", code: 403, userInfo: [NSLocalizedDescriptionKey: "下載來源不在允許清單。"])
    }

    let semaphore = DispatchSemaphore(value: 0)
    var result: Result<URL, Error>?
    downloadCompletion = {
      result = $0
      semaphore.signal()
    }
    downloadSession.downloadTask(with: url).resume()
    semaphore.wait()
    downloadCompletion = nil
    guard let result else {
      throw NSError(domain: "ReelScribe", code: 500, userInfo: [NSLocalizedDescriptionKey: "下載工作沒有回傳結果。"])
    }
    return try result.get()
  }

  func urlSession(
    _ session: URLSession,
    downloadTask: URLSessionDownloadTask,
    didWriteData bytesWritten: Int64,
    totalBytesWritten: Int64,
    totalBytesExpectedToWrite: Int64
  ) {
    guard let modelId = currentDownloadModelId else { return }
    emit("ReelScribeModelProgress", [
      "modelId": modelId,
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
      try? FileManager.default.removeItem(at: target)
      try FileManager.default.moveItem(at: location, to: target)
      downloadCompletion?(.success(target))
    } catch {
      downloadCompletion?(.failure(error))
    }
    currentDownloadModelId = nil
  }

  func urlSession(
    _ session: URLSession,
    task: URLSessionTask,
    didCompleteWithError error: Error?
  ) {
    if let error, downloadCompletion != nil {
      downloadCompletion?(.failure(error))
      currentDownloadModelId = nil
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
        try? FileManager.default.removeItem(at: try self.localModelURL(for: spec))
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
        let jobDirectory = try self.workingDirectory().appendingPathComponent(UUID().uuidString, isDirectory: true)
        try FileManager.default.createDirectory(at: jobDirectory, withIntermediateDirectories: true)
        let source = try self.importMedia(mediaUri, into: jobDirectory)
        let output = jobDirectory.appendingPathComponent("audio.wav")
        let durationMs = try self.extractMonoWav(source: source, destination: output)
        resolve([
          "localAudioPath": output.path,
          "durationMs": durationMs,
          "cleanupToken": jobDirectory.path,
        ])
      } catch {
        reject("PREPARE_MEDIA", error.localizedDescription, error)
      }
    }
  }

  private func importMedia(_ value: String, into directory: URL) throws -> URL {
    guard let source = URL(string: value) else {
      throw NSError(domain: "ReelScribe", code: 400, userInfo: [NSLocalizedDescriptionKey: "媒體網址無效。"])
    }

    let destination = directory.appendingPathComponent("source.\(source.pathExtension.isEmpty ? "media" : source.pathExtension)")
    if source.isFileURL {
      let scoped = source.startAccessingSecurityScopedResource()
      defer { if scoped { source.stopAccessingSecurityScopedResource() } }
      try FileManager.default.copyItem(at: source, to: destination)
      return destination
    }

    let downloaded = try download(source, allowedHosts: Self.remoteMediaHosts)
    defer { try? FileManager.default.removeItem(at: downloaded) }
    let size = try downloaded.resourceValues(forKeys: [.fileSizeKey]).fileSize ?? 0
    guard size <= 300 * 1_048_576 else {
      throw NSError(domain: "ReelScribe", code: 413, userInfo: [NSLocalizedDescriptionKey: "媒體超過 300 MB 上限。"])
    }
    try FileManager.default.moveItem(at: downloaded, to: destination)
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

    FileManager.default.createFile(atPath: destination.path, contents: Data(count: 44))
    let file = try FileHandle(forWritingTo: destination)
    defer { try? file.close() }
    try file.seek(toOffset: 44)

    guard reader.startReading() else {
      throw reader.error ?? NSError(domain: "ReelScribe", code: 500, userInfo: [NSLocalizedDescriptionKey: "音訊解碼啟動失敗。"])
    }

    var pcmBytes: UInt32 = 0
    while let sample = output.copyNextSampleBuffer() {
      autoreleasepool {
        guard let block = CMSampleBufferGetDataBuffer(sample) else { return }
        let length = CMBlockBufferGetDataLength(block)
        var chunk = Data(count: length)
        let status = chunk.withUnsafeMutableBytes { bytes -> OSStatus in
          guard let base = bytes.baseAddress else { return kCMBlockBufferBadCustomBlockSourceErr }
          return CMBlockBufferCopyDataBytes(block, atOffset: 0, dataLength: length, destination: base)
        }
        if status == kCMBlockBufferNoErr {
          try? file.write(contentsOf: chunk)
          pcmBytes = pcmBytes &+ UInt32(length)
        }
        CMSampleBufferInvalidate(sample)
      }
    }

    guard reader.status == .completed else {
      throw reader.error ?? NSError(domain: "ReelScribe", code: 500, userInfo: [NSLocalizedDescriptionKey: "音訊解碼中斷。"])
    }

    try file.seek(toOffset: 0)
    try file.write(contentsOf: wavHeader(dataBytes: pcmBytes, sampleRate: 16_000, channels: 1, bitsPerSample: 16))
    return Int(CMTimeGetSeconds(asset.duration) * 1000)
  }

  private func littleEndianData<T: FixedWidthInteger>(_ value: T) -> Data {
    var little = value.littleEndian
    return Data(bytes: &little, count: MemoryLayout<T>.size)
  }

  private func wavHeader(dataBytes: UInt32, sampleRate: UInt32, channels: UInt16, bitsPerSample: UInt16) -> Data {
    let blockAlign = channels * bitsPerSample / 8
    let byteRate = sampleRate * UInt32(blockAlign)
    var header = Data("RIFF".utf8)
    header.append(littleEndianData(UInt32(36) &+ dataBytes))
    header.append(Data("WAVEfmt ".utf8))
    header.append(littleEndianData(UInt32(16)))
    header.append(littleEndianData(UInt16(1)))
    header.append(littleEndianData(channels))
    header.append(littleEndianData(sampleRate))
    header.append(littleEndianData(byteRate))
    header.append(littleEndianData(blockAlign))
    header.append(littleEndianData(bitsPerSample))
    header.append(Data("data".utf8))
    header.append(littleEndianData(dataBytes))
    return header
  }

  @objc(runOcr:resolver:rejecter:)
  func runOcr(
    _ input: [String: Any],
    resolver resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    // Fail-safe placeholder: native frame sampling and Vision confidence fusion must pass physical-device tests first.
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
    // Remains disabled until media fingerprint, model hash and settings are persisted atomically.
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
