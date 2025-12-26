import { pdfjs } from 'react-pdf';

// Ensure worker is configured (reusing the config from PdfViewer)
if (!pdfjs.GlobalWorkerOptions.workerSrc) {
  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url,
  ).toString();
}

export async function extractTextFromPdf(pdfBlob: Blob): Promise<string> {
  try {
    const arrayBuffer = await pdfBlob.arrayBuffer();
    const pdf = await pdfjs.getDocument(arrayBuffer).promise;
    let fullText = '';

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item: any) => item.str)
        .join(' ');
      fullText += `\n--- Page ${i} ---\n${pageText}`;
    }

    return fullText;
  } catch (error) {
    console.error('Failed to extract text from PDF:', error);
    throw new Error('PDF text extraction failed');
  }
}

export async function convertPdfToImages(pdfBlob: Blob): Promise<string[]> {
  try {
    const arrayBuffer = await pdfBlob.arrayBuffer();
    const pdf = await pdfjs.getDocument(arrayBuffer).promise;
    const images: string[] = [];

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      // Scale 1.5 provides a good balance between clarity and size
      const viewport = page.getViewport({ scale: 1.5 });
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      canvas.height = viewport.height;
      canvas.width = viewport.width;

      if (context) {
        await page.render({ canvasContext: context, viewport } as any).promise;
        // Use JPEG with 0.8 quality to reduce payload size
        images.push(canvas.toDataURL('image/jpeg', 0.8));
      }
    }
    return images;
  } catch (error) {
    console.error('Failed to convert PDF to images:', error);
    throw new Error('PDF to image conversion failed');
  }
}
