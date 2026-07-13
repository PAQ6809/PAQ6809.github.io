require 'json'

package = JSON.parse(File.read(File.join(__dir__, 'package.json')))

Pod::Spec.new do |s|
  s.name         = 'ReelScribeManager'
  s.version      = package['version']
  s.summary      = 'Private on-device media preparation, OCR and checkpoint manager for ReelScribe.'
  s.homepage     = 'https://paq6809.github.io/reelscribe/'
  s.license      = { :type => 'Proprietary', :text => 'Private application component.' }
  s.author       = { 'PAQ' => 'pinranchen6809@gmail.com' }
  s.platforms    = { :ios => '16.0' }
  s.source       = { :path => '.' }
  s.source_files = 'ios/**/*.{h,m,mm,swift}'
  s.frameworks   = 'AVFoundation', 'Vision'
  s.dependency 'React-Core'
  s.swift_version = '5.10'
end
