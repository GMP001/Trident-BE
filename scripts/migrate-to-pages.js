// ============================================================
// ONE-TIME MIGRATION: Move all root-level pages into content.pages
// Run: node scripts/migrate-to-pages.js
// ============================================================

const fs = require('fs');
const path = require('path');

const CONTENT_FILE = path.join(__dirname, '..', 'data', 'content.json');

function migrateContent() {
  console.log('📖 Reading content.json...\n');
  
  const rawData = fs.readFileSync(CONTENT_FILE, 'utf8');
  const content = JSON.parse(rawData);
  
  // Create backup
  const backupFile = CONTENT_FILE.replace('.json', `_backup_${Date.now()}.json`);
  fs.writeFileSync(backupFile, rawData, 'utf8');
  console.log(`💾 Backup created: ${path.basename(backupFile)}\n`);
  
  // Ensure pages object exists
  if (!content.pages) {
    content.pages = {};
  }
  
  const knownKeys = ['pages', 'globalSettings', 'lastUpdated'];
  const rootPageIds = Object.keys(content).filter(key => !knownKeys.includes(key));
  
  console.log(`🔍 Found ${rootPageIds.length} pages at root level:\n`);
  rootPageIds.forEach(id => console.log(`   📄 ${id}`));
  
  let migratedCount = 0;
  let skippedCount = 0;
  
  console.log('\n📦 Moving pages into content.pages...\n');
  
  rootPageIds.forEach(pageId => {
    if (content.pages[pageId]) {
      console.log(`⚠️  SKIPPED: "${pageId}" already exists in content.pages`);
      skippedCount++;
    } else {
      content.pages[pageId] = content[pageId];
      console.log(`✅ MIGRATED: "${pageId}" → content.pages.${pageId}`);
      migratedCount++;
    }
    delete content[pageId];
  });
  
  content.lastUpdated = new Date().toISOString();
  fs.writeFileSync(CONTENT_FILE, JSON.stringify(content, null, 2), 'utf8');
  
  console.log(`\n${'='.repeat(60)}`);
  console.log(`🎉 MIGRATION COMPLETE!`);
  console.log(`   ✅ Migrated: ${migratedCount}`);
  console.log(`   ⚠️  Skipped: ${skippedCount}`);
  console.log(`\n📋 All pages now under: content.pages`);
  console.log(`   Total: ${Object.keys(content.pages).length} pages`);
  console.log(`${'='.repeat(60)}`);
}

try {
  migrateContent();
} catch (error) {
  console.error('❌ Migration failed:', error.message);
  process.exit(1);
}
