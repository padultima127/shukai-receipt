// macOS標準のVisionで画像の文字を読み取り、JSONで出力する。
// 使い方: swift tools/ocr.swift 画像1 [画像2 ...] > out.json
// 出力: { "ファイル名": [ { "t": 文字列, "x": 左, "y": 上, "h": 高さ }, ... ] }（座標は0〜1、上が0）
import Foundation
import Vision
import AppKit

var result: [String: [[String: Any]]] = [:]
for path in CommandLine.arguments.dropFirst() {
    guard let image = NSImage(contentsOfFile: path),
          let cg = image.cgImage(forProposedRect: nil, context: nil, hints: nil) else { continue }
    let request = VNRecognizeTextRequest()
    request.recognitionLanguages = ["ja-JP", "en-US"]
    request.recognitionLevel = .accurate
    request.usesLanguageCorrection = false
    try? VNImageRequestHandler(cgImage: cg).perform([request])
    let lines = (request.results ?? []).compactMap { obs -> [String: Any]? in
        guard let text = obs.topCandidates(1).first?.string else { return nil }
        let b = obs.boundingBox
        return ["t": text, "x": b.minX, "y": 1 - b.maxY, "h": b.height]
    }
    result[(path as NSString).lastPathComponent] = lines
}
let data = try JSONSerialization.data(withJSONObject: result, options: [.sortedKeys])
FileHandle.standardOutput.write(data)
