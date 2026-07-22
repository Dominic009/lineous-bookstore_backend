import * as fs from 'fs';
import * as path from 'path';
import * as Handlebars from 'handlebars';
import puppeteer, { Browser } from 'puppeteer';

let browserInstance: Browser | null = null;

async function getBrowser(): Promise<Browser> {
  if (!browserInstance) {
    browserInstance = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--disable-web-security',
        '--allow-file-access-from-files',
      ],
    });
  }
  return browserInstance;
}

export async function closeBrowser(): Promise<void> {
  if (browserInstance) {
    await browserInstance.close();
    browserInstance = null;
  }
}

export async function generatePdfFromTemplate(
  templatePath: string,
  data: Record<string, unknown>,
): Promise<Buffer> {
  const source = fs.readFileSync(templatePath, 'utf8');
  const template = Handlebars.compile(source);
  const html = template(data as any);

  console.log('Template path:', templatePath);
  console.log('HTML length:', html.length);

  const browser = await getBrowser();
  const page = await browser.newPage();

  try {
    // Set content and wait for DOM to be ready
    await page.setContent(html, {
      waitUntil: 'domcontentloaded',
      timeout: 60000,
    });

    // Small delay to ensure fonts and styles are applied
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Generate PDF
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '0',
        right: '0',
        bottom: '0',
        left: '0',
      },
    });

    const buffer = Buffer.from(pdfBuffer);

    console.log('PDF buffer length:', buffer.length);
    console.log('PDF buffer first bytes:', buffer.slice(0, 10).toString('hex'));

    if (buffer.length === 0) {
      throw new Error('Generated PDF is empty');
    }

    // Verify it's actually a PDF (starts with %PDF)
    if (!buffer.toString('utf8', 0, 4).startsWith('%PDF')) {
      throw new Error('Generated file is not a valid PDF');
    }

    return buffer;
  } finally {
    await page.close();
  }
}

export function getTemplatePath(templateName: string): string {
  // Use __dirname so the path resolves correctly regardless of the working directory
  // Compiled location: dist/utils/pdf.js → __dirname = dist/utils/
  return path.join(__dirname, '..', '..', 'src', 'templates', templateName);
}
