const fs = require('fs');

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

async function scanFolder(f) {
  const url = `https://drive.google.com/drive/folders/${f.id}`;
  const res = await fetch(url);
  const html = await res.text();

  const regex = /AF_initDataCallback\s*\(\s*({.*?})\s*\)\s*;/gs;
  let match;
  const files = [];

  while ((match = regex.exec(html)) !== null) {
    try {
      const fn = new Function('return ' + match[1]);
      const obj = fn();
      const list = obj?.data?.[27]?.[7]?.[0]?.[0];
      if (Array.isArray(list) && list.length > 0) {
        list.forEach((item) => {
          const id = Array.isArray(item[0]) ? item[0][1] : item[0];
          const name = item[35]?.[0]?.[0]?.[0] || 
                       item[24]?.[2]?.[0]?.[2]?.[1]?.[0]?.[0]?.[0] || 
                       item[24]?.[2]?.[0]?.[5]?.[0]?.[0]?.[0] ||
                       item[24]?.[2]?.[0]?.[9]?.[0]?.[0]?.[0];
          const mime = item[53]?.[1] || item[53] || 'unknown';
          if (id && name) {
            files.push({ id, name, mime });
          }
        });
      }
    } catch (e) {}
  }
  return files;
}

async function run() {
  const catalog = {};
  for (const f of folders) {
    console.log(`Scanning ${f.name} (${f.slug})...`);
    const files = await scanFolder(f);
    console.log(`Found ${files.length} items for ${f.name}:`);
    files.forEach(x => console.log(`   - [${x.name}] (${x.mime}) ID: ${x.id}`));
    catalog[f.slug] = {
      ...f,
      files
    };
  }
  fs.writeFileSync('all_drive_files.json', JSON.stringify(catalog, null, 2));
  console.log('Saved all_drive_files.json successfully!');
}

run();
