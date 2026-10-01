const fs = require('fs');
const path = require('path');

const folders = [
  { slug: 'ants', name: 'Ant Control', id: '1B8vi5ZcQXS_VJ4GuEVcmlZfmTilKQLMb' },
  { slug: 'bedbugs', name: 'Bed Bug Control', id: '1WWcTV2q-OIBM4t7tCwSUPLnfgU6n9hNS' },
  { slug: 'birds', name: 'Bird Control', id: '15Ysx_m7G3C0A03s7NYcZfXWeGkx37erR' },
  { slug: 'cockroaches', name: 'Cockroach Control', id: '1JVYiCqN8P1W831mwq0zPfabgHgYB1XEl' },
  { slug: 'housefly', name: 'Housefly Control', id: '1_5XtQmIkfTNOqzuqIkFguoRngzly4bth' },
  { slug: 'mosquitoes', name: 'Mosquito Control', id: '1okR5CveraaPRDNe0pMRrsH1mgr5yPDQN' },
  { slug: 'rodents', name: 'Rodent Control', id: '1ip3ljo7e2i3KDqjTct5suEPUa-Y7q9zW' },
  { slug: 'silverfish', name: 'Silverfish Control', id: '1nzZ_y5pDadc9dJycT13BzwqWEM0LRRZ1' },
  { slug: 'spiders', name: 'Spider Control', id: '13xPRbRf9H_beHfPoe61yu1ap_PlohYaS' },
  { slug: 'termites', name: 'Termite Control', id: '1ZPK8RuZ4Rus5NbgylnAwIIUaikWLWTML' }
];

async function getFolderItems(folderId) {
  const url = `https://drive.google.com/drive/folders/${folderId}`;
  const res = await fetch(url);
  const html = await res.text();
  
  // Parse AF_initDataCallback
  const regex = /AF_initDataCallback\s*\(\s*({.*?})\s*\)\s*;/gs;
  let match;
  const files = [];

  while ((match = regex.exec(html)) !== null) {
    try {
      const fn = new Function('return ' + match[1]);
      const obj = fn();
      // Check if data is array
      function extract(node) {
        if (!node) return;
        if (Array.isArray(node)) {
          // A file entry in ds:4 or ds:5 usually starts with file ID (33 chars alphanumeric)
          // or has [id, title, mimeType, ...]
          if (typeof node[0] === 'string' && /^[a-zA-Z0-9_-]{28,45}$/.test(node[0])) {
            const id = node[0];
            // search for filename in node
            const allStrings = [];
            function collect(x) {
              if (typeof x === 'string') allStrings.push(x);
              else if (Array.isArray(x)) x.forEach(collect);
            }
            collect(node);
            const foundName = allStrings.find(s => 
              s.includes('.') && !s.includes('/') && !s.includes('http') && 
              (s.endsWith('.txt') || s.endsWith('.odt') || s.endsWith('.docx') || s.endsWith('.doc') || 
               s.endsWith('.jpg') || s.endsWith('.jpeg') || s.endsWith('.png') || s.endsWith('.webp') || s.endsWith('.pdf'))
            );
            if (foundName) {
              const mime = allStrings.find(s => s.startsWith('image/') || s.startsWith('text/') || s.includes('word') || s.includes('opendocument')) || 'unknown';
              if (!files.some(f => f.id === id)) {
                files.push({ id, name: foundName, mime });
              }
            }
          }
          node.forEach(extract);
        } else if (typeof node === 'object') {
          Object.keys(node).forEach(k => extract(node[k]));
        }
      }
      extract(obj.data);
    } catch (e) {}
  }
  return files;
}

async function run() {
  const allResults = {};
  for (const f of folders) {
    console.log(`Scanning ${f.name} (${f.slug})...`);
    const items = await getFolderItems(f.id);
    console.log(`  Found ${items.length} items for ${f.slug}:`, items.map(i => i.name));
    allResults[f.slug] = {
      ...f,
      files: items
    };
  }
  fs.writeFileSync('drive_catalog.json', JSON.stringify(allResults, null, 2));
  console.log('Saved drive_catalog.json');
}

run();
