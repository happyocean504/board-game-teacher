import React, { useState, useEffect } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { X, ChevronLeft, ChevronRight, ZoomIn, ZoomOut } from 'lucide-react';

// Configure PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString();

interface PdfViewerProps {
  file: Blob | null;
  onClose: () => void;
}

export default function PdfViewer({ file, onClose }: PdfViewerProps) {
  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [scale, setScale] = useState<number>(1.0);

  function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
    setNumPages(numPages);
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/90 flex flex-col animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex items-center justify-between p-4 text-white bg-black/50 backdrop-blur-sm">
        <div className="flex items-center gap-4">
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
            <X className="w-6 h-6" />
          </button>
          <span className="font-medium">
            Page {pageNumber} of {numPages}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setScale(s => Math.max(0.5, s - 0.25))}
            className="p-2 hover:bg-white/10 rounded-full"
          >
            <ZoomOut className="w-5 h-5" />
          </button>
          <span className="w-12 text-center text-sm">{Math.round(scale * 100)}%</span>
          <button 
            onClick={() => setScale(s => Math.min(3.0, s + 0.25))}
            className="p-2 hover:bg-white/10 rounded-full"
          >
            <ZoomIn className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* PDF Content */}
      <div className="flex-1 overflow-auto flex justify-center p-4">
        {file && (
          <Document
            file={file}
            onLoadSuccess={onDocumentLoadSuccess}
            loading={
              <div className="flex items-center justify-center h-full text-white">
                Loading PDF...
              </div>
            }
            error={
              <div className="flex items-center justify-center h-full text-red-400">
                Failed to load PDF
              </div>
            }
          >
            <Page 
              pageNumber={pageNumber} 
              scale={scale} 
              renderTextLayer={false} 
              renderAnnotationLayer={false}
              className="shadow-2xl"
            />
          </Document>
        )}
      </div>

      {/* Footer Navigation */}
      <div className="p-4 flex justify-center gap-8 text-white bg-black/50 backdrop-blur-sm safe-area-bottom">
        <button
          onClick={() => setPageNumber(p => Math.max(1, p - 1))}
          disabled={pageNumber <= 1}
          className="p-3 bg-white/10 rounded-full disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white/20 transition-colors"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
        <button
          onClick={() => setPageNumber(p => Math.min(numPages, p + 1))}
          disabled={pageNumber >= numPages}
          className="p-3 bg-white/10 rounded-full disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white/20 transition-colors"
        >
          <ChevronRight className="w-6 h-6" />
        </button>
      </div>
    </div>
  );
}
