Pod::Spec.new do |spec|
  spec.name = 'ReelScribeManager'
  spec.version = '0.1.0'
  spec.summary = 'Private on-device model and media manager for ReelScribe Mobile.'
  spec.homepage = 'https://paq6809.github.io/reelscribe/'
  spec.license = { :type => 'MIT' }
  spec.author = { 'PAQ' => 'pinranchen6809@gmail.com' }
  spec.source = {
    :git => 'https://github.com/PAQ6809/PAQ6809.github.io.git',
    :branch => 'main'
  }
  spec.platform = :ios, '15.1'
  spec.swift_version = '5.10'
  spec.source_files = '*.{swift,m,h}'
  spec.frameworks = 'AVFoundation', 'CryptoKit', 'Foundation'
  spec.pod_target_xcconfig = { 'DEFINES_MODULE' => 'YES' }
  spec.dependency 'React-Core'
end
