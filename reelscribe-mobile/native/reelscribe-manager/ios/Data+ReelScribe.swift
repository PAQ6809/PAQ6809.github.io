import Foundation

extension Data {
  mutating func append(_ buffer: UnsafeBufferPointer<Int8>) {
    guard let baseAddress = buffer.baseAddress, buffer.count > 0 else { return }
    let unsigned = UnsafeRawPointer(baseAddress).assumingMemoryBound(to: UInt8.self)
    append(unsigned, count: buffer.count)
  }
}
