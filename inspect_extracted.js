const fs = require('fs');
const data = JSON.parse(fs.readFileSync('client/src/data/driveExtractedData.json', 'utf8'));

for (const [slug, item] of Object.entries(data)) {
  console.log('==============================================');
  console.log('SERVICE:', item.name, '[' + slug + ']');
  console.log('Images count:', item.images.length);
  console.log('Images:', item.images.map(i => i.name).slice(0, 6));
  console.log('Text pieces count:', item.texts.length);
  item.texts.forEach((t, i) => {
    console.log(`-- Text #${i+1} [${t.file}] length: ${t.text.length}`);
    console.log(t.text.slice(0, 350).replace(/\r?\n/g, ' '));
  });
}
