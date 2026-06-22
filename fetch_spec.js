const url = 'https://dxxghnnajjlgkjoavyfj.supabase.co/rest/v1/';
const apiKey = 'sb_publishable_Nz4RccWltNot4ct3Dc43lA_FFmVsp84';

async function main() {
  const res = await fetch(url, {
    headers: {
      'apikey': apiKey,
      'Authorization': `Bearer ${apiKey}`
    }
  });
  if (!res.ok) {
    console.error('Failed to fetch:', res.status, res.statusText);
    return;
  }
  const spec = await res.json();
  console.log("TABLES AND COLUMNS:");
  for (const [path, definition] of Object.entries(spec.definitions || {})) {
    console.log(`\nTable: ${path}`);
    console.log("Properties:");
    for (const [propName, propDef] of Object.entries(definition.properties || {})) {
      console.log(`  - ${propName} (${propDef.type || 'unknown'}${propDef.format ? ', ' + propDef.format : ''})`);
    }
  }
}

main();
