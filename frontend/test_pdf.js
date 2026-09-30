import * as fs from 'fs';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';

const docPath = process.argv[2];
const data = new Uint8Array(fs.readFileSync(docPath));

async function parse() {
    const pdf = await pdfjsLib.getDocument({ data }).promise;
    let fullText = '';
    
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map((item) => item.str).join(' ');
      fullText += pageText + ' ';
    }

    fullText = fullText.replace(/\s+/g, ' ');
    console.log("PDF Full Text Joined:\n", fullText);
    
    const parts = fullText.split(/Ft/i);
    const allRows = [];
    
    for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        const match = part.match(/(.*?)\s+(\d{1,2})\s+([\d\s]+)\s*$/);
        
        if (match) {
            let rawName = match[1];
            const nameSplits = rawName.split(/fizetendő/i);
            let name = nameSplits[nameSplits.length - 1].trim();
            
            if (name.toLowerCase().includes('összesen') || name.trim() === '') {
                continue;
            }

            const participation = parseInt(match[2].trim(), 10);
            const amountStr = match[3].replace(/\s/g, '');
            const amount = parseInt(amountStr, 10);
            
            if (!isNaN(participation) && !isNaN(amount)) {
                allRows.push({ name, participation, amount });
            }
        }
    }
    
    console.log("Parsed rows:", allRows);
}

parse().catch(console.error);
