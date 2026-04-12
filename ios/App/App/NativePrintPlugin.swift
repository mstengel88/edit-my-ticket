import Foundation
import UIKit
import Capacitor
import WebKit

@objc(NativePrintPlugin)
public class NativePrintPlugin: CAPPlugin, CAPBridgedPlugin, WKNavigationDelegate {
    public let identifier = "NativePrintPlugin"
    public let jsName = "NativePrint"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "printHtml", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "printTicketImage", returnType: CAPPluginReturnPromise)
    ]

    private var pendingCall: CAPPluginCall?
    private var printWebView: WKWebView?
    private let letterPageSize = CGSize(width: 8.5 * 72.0, height: 11.0 * 72.0)

    @objc func printHtml(_ call: CAPPluginCall) {
        guard let html = call.getString("html"), !html.isEmpty else {
            call.reject("Missing html content")
            return
        }

        DispatchQueue.main.async { [weak self] in
            guard let self else {
                call.reject("Unable to start print flow")
                return
            }

            let configuration = WKWebViewConfiguration()
            let webView = WKWebView(frame: CGRect(origin: .zero, size: self.letterPageSize), configuration: configuration)
            webView.isHidden = true
            webView.navigationDelegate = self

            self.pendingCall = call
            self.printWebView = webView
            webView.loadHTMLString(html, baseURL: nil)
        }
    }

    @objc func printTicketImage(_ call: CAPPluginCall) {
        guard let imageDataUrl = call.getString("imageDataUrl"), !imageDataUrl.isEmpty else {
            call.reject("Missing ticket image")
            return
        }

        guard
            let base64 = imageDataUrl.components(separatedBy: ",").last,
            let imageData = Data(base64Encoded: base64),
            let image = UIImage(data: imageData)
        else {
            call.reject("Invalid ticket image")
            return
        }

        let copiesPerPage = max(call.getInt("copiesPerPage") ?? 1, 1)
        let marginTop = CGFloat(call.getDouble("pageMarginTop") ?? 0.2) * 72.0
        let marginRight = CGFloat(call.getDouble("pageMarginRight") ?? 0.2) * 72.0
        let marginBottom = CGFloat(call.getDouble("pageMarginBottom") ?? 0.2) * 72.0
        let marginLeft = CGFloat(call.getDouble("pageMarginLeft") ?? 0.2) * 72.0
        let printableRect = CGRect(
            x: marginLeft,
            y: marginTop,
            width: letterPageSize.width - marginLeft - marginRight,
            height: letterPageSize.height - marginTop - marginBottom
        )

        let offsets = call.getArray("ticketOffsets", JSObject.self) ?? []
        let sizes = call.getArray("ticketSizes", JSObject.self) ?? []

        let format = UIGraphicsPDFRendererFormat()
        let renderer = UIGraphicsPDFRenderer(bounds: CGRect(origin: .zero, size: letterPageSize), format: format)
        let pdfData = renderer.pdfData { context in
            context.beginPage()
            var currentY = printableRect.origin.y

            for index in 0..<copiesPerPage {
                let offset = index < offsets.count ? offsets[index] : JSObject()
                let size = index < sizes.count ? sizes[index] : JSObject()

                let offsetX = CGFloat((offset["x"] as? Double) ?? 0) * 72.0
                let offsetY = CGFloat((offset["y"] as? Double) ?? 0) * 72.0
                let defaultWidth = printableRect.width
                let defaultHeight = printableRect.height / CGFloat(copiesPerPage)
                let width = CGFloat((size["width"] as? Double) ?? Double(defaultWidth / 72.0)) * 72.0
                let height = CGFloat((size["height"] as? Double) ?? Double(defaultHeight / 72.0)) * 72.0

                let targetRect = CGRect(
                    x: printableRect.origin.x + offsetX,
                    y: currentY + offsetY,
                    width: width,
                    height: height
                )

                image.draw(in: targetRect)
                currentY += height
            }
        }

        DispatchQueue.main.async { [weak self] in
            guard let self, let viewController = self.bridge?.viewController, let sourceView = viewController.view else {
                call.reject("Unable to present print controller")
                return
            }

            self.presentPrintController(
                printingItem: pdfData,
                jobName: call.getString("jobName") ?? "Ticket",
                sourceView: sourceView,
                call: call
            )
        }
    }

    public func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
        guard
            let call = pendingCall,
            let viewController = bridge?.viewController,
            let sourceView = viewController.view
        else {
            resetPrintState()
            return
        }

        if #available(iOS 14.0, *) {
            let pdfConfiguration = WKPDFConfiguration()
            pdfConfiguration.rect = CGRect(origin: .zero, size: letterPageSize)

            webView.createPDF(configuration: pdfConfiguration) { [weak self] result in
                guard let self else { return }

                switch result {
                case .success(let data):
                    self.presentPrintController(
                        printingItem: data,
                        jobName: call.getString("jobName") ?? "Ticket",
                        sourceView: sourceView,
                        call: call
                    )
                case .failure(let error):
                    call.reject(error.localizedDescription)
                    self.resetPrintState()
                }
            }
            return
        }

        presentPrintController(
            printingItem: webView.viewPrintFormatter(),
            jobName: call.getString("jobName") ?? "Ticket",
            sourceView: sourceView,
            call: call
        )
    }

    public func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError error: Error) {
        pendingCall?.reject(error.localizedDescription)
        resetPrintState()
    }

    public func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError error: Error) {
        pendingCall?.reject(error.localizedDescription)
        resetPrintState()
    }

    private func resetPrintState() {
        printWebView?.navigationDelegate = nil
        printWebView = nil
        pendingCall = nil
    }

    private func presentPrintController(
        printingItem: Any,
        jobName: String,
        sourceView: UIView,
        call: CAPPluginCall
    ) {
        let printController = UIPrintInteractionController.shared
        let printInfo = UIPrintInfo(dictionary: nil)
        printInfo.outputType = .general
        printInfo.jobName = jobName
        printController.printInfo = printInfo
        printController.showsNumberOfCopies = true

        if let data = printingItem as? Data {
            printController.printingItem = data
        } else if let formatter = printingItem as? UIViewPrintFormatter {
            printController.printFormatter = formatter
        }

        let completion: UIPrintInteractionController.CompletionHandler = { [weak self] _, completed, error in
            defer { self?.resetPrintState() }

            if let error {
                call.reject(error.localizedDescription)
                return
            }

            call.resolve([
                "completed": completed
            ])
        }

        if UIDevice.current.userInterfaceIdiom == .pad {
            let targetRect = sourceView.bounds.insetBy(dx: sourceView.bounds.width * 0.2, dy: sourceView.bounds.height * 0.2)
            printController.present(from: targetRect, in: sourceView, animated: true, completionHandler: completion)
        } else {
            printController.present(animated: true, completionHandler: completion)
        }
    }
}
