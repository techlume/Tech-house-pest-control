const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const catalog = JSON.parse(fs.readFileSync('all_drive_files.json', 'utf8'));

const assetsDir = path.join(__dirname, 'client', 'public', 'drive_assets');
if (!fs.existsSync(assetsDir)) {
  fs.mkdirSync(assetsDir, { recursive: true });
}

// Function to download a file from Google Drive
async function downloadFile(id, destPath) {
  const url = `https://drive.usercontent.google.com/download?id=${id}&export=download`;
  try {
    const res = await fetch(url);
    if (!res.ok) {
      console.error(`Failed to download ${id}: HTTP ${res.status}`);
      return false;
    }
    const buf = Buffer.from(await res.arrayBuffer());
    fs.writeFileSync(destPath, buf);
    return true;
  } catch (err) {
    console.error(`Error downloading ${id}:`, err.message);
    return false;
  }
}

// Helper to extract text from .odt
function extractTextFromOdt(odtPath) {
  try {
    const tempZip = odtPath + '.zip';
    const tempDir = odtPath + '_extracted';
    fs.copyFileSync(odtPath, tempZip);
    execSync(`powershell -Command "Expand-Archive -Force -Path '${tempZip}' -DestinationPath '${tempDir}'"`);
    const contentXmlPath = path.join(tempDir, 'content.xml');
    if (fs.existsSync(contentXmlPath)) {
      const xml = fs.readFileSync(contentXmlPath, 'utf8');
      // replace XML tags with spaces
      const text = xml.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
      // cleanup
      try {
        fs.unlinkSync(tempZip);
        fs.rmSync(tempDir, { recursive: true, force: true });
      } catch (e) {}
      return text;
    }
  } catch (e) {
    console.error('Error extracting ODT:', e.message);
  }
  return '';
}

// Helper to extract text from .rtf
function extractTextFromRtf(rtfPath) {
  try {
    const raw = fs.readFileSync(rtfPath, 'utf8');
    // simple RTF strip
    const stripped = raw
      .replace(/\\par[d]?/g, '\n')
      .replace(/\\{.*?\\}/g, '')
      .replace(/\\[a-z0-9\-]+/gi, ' ')
      .replace(/[{}]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    return stripped;
  } catch (e) {
    return '';
  }
}

async function run() {
  const extractedData = {};

  for (const [slug, service] of Object.entries(catalog)) {
    console.log(`Processing service: ${service.name} (${slug})`);
    const serviceFolder = path.join(assetsDir, slug);
    if (!fs.existsSync(serviceFolder)) {
      fs.mkdirSync(serviceFolder, { recursive: true });
    }

    const downloadedImages = [];
    const textPieces = [];

    for (const f of service.files) {
      // sanitize filename
      const cleanName = f.name.replace(/[/\\?%*:|"<>]/g, '_');
      const localPath = path.join(serviceFolder, cleanName);

      const isText = cleanName.endsWith('.txt');
      const isOdt = cleanName.endsWith('.odt');
      const isRtf = cleanName.endsWith('.rtf');
      const isDoc = cleanName.endsWith('.docx') || cleanName.endsWith('.doc');
      const isImage = cleanName.endsWith('.jpg') || cleanName.endsWith('.jpeg') || cleanName.endsWith('.png') || cleanName.endsWith('.webp');

      if (isImage || isText || isOdt || isRtf || isDoc) {
        if (!fs.existsSync(localPath)) {
          console.log(`  Downloading ${f.name}...`);
          await downloadFile(f.id, localPath);
        }

        if (isImage) {
          downloadedImages.push({
            name: f.name,
            path: `/drive_assets/${slug}/${cleanName}`,
            id: f.id
          });
        } else if (isText) {
          const txt = fs.readFileSync(localPath, 'utf8');
          textPieces.push({ file: f.name, text: txt });
        } else if (isOdt) {
          const txt = extractTextFromOdt(localPath);
          if (txt) {
            textPieces.push({ file: f.name, text: txt });
          }
        } else if (isRtf) {
          const txt = extractTextFromRtf(localPath);
          if (txt) {
            textPieces.push({ file: f.name, text: txt });
          }
        }
      }
    }

    extractedData[slug] = {
      slug,
      name: service.name,
      images: downloadedImages,
      texts: textPieces
    };
  }

  const outPath = path.join(__dirname, 'client', 'src', 'data', 'driveExtractedData.json');
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(extractedData, null, 2));
  console.log(`\nSuccessfully downloaded all files and wrote driveExtractedData.json!`);
}

run();
