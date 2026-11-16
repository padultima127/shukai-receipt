import Foundation
import Vision
import AppKit
import CoreImage
func detect(_ cg: CGImage) -> String? {
    let req = VNDetectBarcodesRequest(); req.symbologies = [.qr]
    try? VNImageRequestHandler(cgImage: cg, options: [:]).perform([req])
    return req.results?.compactMap { $0.payloadStringValue }.first
}
for path in CommandLine.arguments.dropFirst() {
    guard let image = NSImage(contentsOfFile: path), let cg = image.cgImage(forProposedRect: nil, context: nil, hints: nil) else { continue }
    let w = CGFloat(cg.width), h = CGFloat(cg.height)
    var found: String? = nil
    outer: for frac in [0.25, 0.3, 0.4] as [CGFloat] {
        // 画像の上端（CGImageの座標は上が0）
        let side = w * frac
        guard let crop = cg.cropping(to: CGRect(x: 0, y: 0, width: side, height: side)) else { continue }
        for s in [4.0, 6.0, 8.0, 10.0] as [CGFloat] {
            for interp in [CIFilter(name: "CILanczosScaleTransform")] {
                let ci = CIImage(cgImage: crop)
                interp?.setValue(ci, forKey: kCIInputImageKey); interp?.setValue(s, forKey: kCIInputScaleKey); interp?.setValue(1.0, forKey: kCIInputAspectRatioKey)
                if let o = interp?.outputImage, let up = CIContext().createCGImage(o, from: o.extent), let r = detect(up) { found = r; break outer }
            }
            let ci = CIImage(cgImage: crop).samplingNearest().transformed(by: CGAffineTransform(scaleX: s, y: s))
            if let up = CIContext().createCGImage(ci, from: ci.extent), let r = detect(up) { found = r; break outer }
        }
    }
    print(path.split(separator: "/").last!, found ?? "NONE")
}
