import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

/**
 * Captures an HTML element using html2canvas and exports it as an A4 monochrome PDF using jsPDF.
 * Handles multi-page paging seamlessly.
 *
 * @param {HTMLElement|string} target - The DOM element or element ID to capture
 * @param {string} filename - The output PDF filename
 * @returns {Promise<boolean>}
 */
export async function generatePdfWithHtml2Canvas(target, filename = 'Executive_Audit_Report.pdf') {
  const element = typeof target === 'string' ? document.getElementById(target) : target;
  if (!element) {
    console.error('generatePdfWithHtml2Canvas: Target element not found');
    return false;
  }

  try {
    // Ensure element is visible and styled for capture
    const originalDisplay = element.style.display;
    element.style.display = 'block';

    const canvas = await html2canvas(element, {
      scale: 2, // 200 DPI crispness for print
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
      allowTaint: true,
      imageTimeout: 15000,
    });

    if (originalDisplay && originalDisplay !== 'block') {
      element.style.display = originalDisplay;
    }

    const imgData = canvas.toDataURL('image/jpeg', 0.95);
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
      compress: true,
    });

    const pageWidth = pdf.internal.pageSize.getWidth(); // 210 mm
    const pageHeight = pdf.internal.pageSize.getHeight(); // 297 mm
    const imgWidth = pageWidth;
    const imgHeight = (canvas.height * pageWidth) / canvas.width;

    let heightLeft = imgHeight;
    let position = 0;

    // First page
    pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight, undefined, 'FAST');
    heightLeft -= pageHeight;

    // Remaining pages
    while (heightLeft > 0) {
      position -= pageHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight, undefined, 'FAST');
      heightLeft -= pageHeight;
    }

    pdf.save(filename);
    return true;
  } catch (error) {
    console.error('Failed to generate PDF with html2canvas:', error);
    throw error;
  }
}
