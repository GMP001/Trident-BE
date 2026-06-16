const express = require('express');
const fs = require('fs');
const path = require('path');
const router = express.Router();

// Path to content file
const contentFilePath = path.join(__dirname, '..', 'data', 'content.json');

// Ensure data directory exists
if (!fs.existsSync(path.join(__dirname, '..', 'data'))) {
  fs.mkdirSync(path.join(__dirname, '..', 'data'), { recursive: true });
}

// Initialize content file if it doesn't exist
if (!fs.existsSync(contentFilePath)) {
  const defaultContent = {
    pages: {},
    globalSettings: {
      companyName: "Trident Global Logistics",
      contactEmail: "info@trident.com",
      contactPhone: "+880 1234 567890"
    },
    lastUpdated: new Date().toISOString()
  };
  fs.writeFileSync(contentFilePath, JSON.stringify(defaultContent, null, 2));
}

// Middleware to verify auth token
const verifyAuth = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (token) {
    next();
  } else {
    res.status(401).json({ error: 'Unauthorized' });
  }
};

// ============================================================
// GET /api/content - Get ALL content (for admin panel)
// ============================================================
router.get('/', (req, res) => {
  try {
    const content = JSON.parse(fs.readFileSync(contentFilePath, 'utf8'));
    
    // ===== AUTO-NORMALIZE: Move any root-level pages into content.pages =====
    // This ensures backward compatibility and fixes mixed structure
    const knownKeys = ['pages', 'globalSettings', 'lastUpdated'];
    let normalized = false;
    
    Object.keys(content).forEach(key => {
      if (!knownKeys.includes(key) && typeof content[key] === 'object' && content[key] !== null) {
        // This is a page at root level - move it to content.pages
        if (!content.pages) {
          content.pages = {};
        }
        if (!content.pages[key]) {
          content.pages[key] = content[key];
          console.log(`🔄 Auto-normalized: Moved "${key}" from root to content.pages`);
          normalized = true;
        }
        delete content[key];
      }
    });
    
    // Save the normalized structure back (one-time auto-fix)
    if (normalized) {
      content.lastUpdated = new Date().toISOString();
      fs.writeFileSync(contentFilePath, JSON.stringify(content, null, 2));
      console.log('✅ Content structure normalized - all pages now under content.pages');
    }
    
    res.json(content);
  } catch (error) {
    console.error('Error reading content:', error);
    res.status(500).json({ error: 'Failed to read content' });
  }
});

// ============================================================
// GET /api/content/page/:pageId - Get single page content
// ============================================================
router.get('/page/:pageId', (req, res) => {
  try {
    const content = JSON.parse(fs.readFileSync(contentFilePath, 'utf8'));
    const pageId = req.params.pageId;
    
    // PRIMARY: Look in content.pages (the standardized location)
    if (content.pages && content.pages[pageId]) {
      return res.json(content.pages[pageId]);
    }
    
    // FALLBACK: Look at root level (for pages not yet migrated)
    if (content[pageId]) {
      console.log(`⚠️  Page "${pageId}" found at root level - should be in content.pages`);
      return res.json(content[pageId]);
    }
    
    // NOT FOUND: Return empty object so frontend can use default content
    // DO NOT return 404 - frontend expects {} to use defaults
    return res.json({});
    
  } catch (error) {
    console.error('Error reading content:', error);
    res.status(500).json({ error: 'Failed to read content' });
  }
});

// ============================================================
// PUT /api/content/page/:pageId - Update page content
// ALWAYS saves to content.pages[pageId] (standardized location)
// ============================================================
router.put('/page/:pageId', verifyAuth, (req, res) => {
  try {
    const content = JSON.parse(fs.readFileSync(contentFilePath, 'utf8'));
    const pageId = req.params.pageId;
    const newPageData = req.body;
    
    // Ensure pages object exists
    if (!content.pages) {
      content.pages = {};
    }
    
    // Get existing page data from EITHER location (pages object OR root level)
    let existingPage = content.pages[pageId] || content[pageId] || {};
    
    // ===== ALWAYS SAVE TO content.pages =====
    // Deep merge: preserve all existing sections, override with new data
    content.pages[pageId] = {
      ...existingPage,
      ...newPageData,
      // Ensure isActive is always set
      isActive: newPageData.isActive !== undefined 
        ? newPageData.isActive 
        : (existingPage.isActive !== undefined ? existingPage.isActive : true)
    };
    
    // ===== CLEAN UP: Remove from root level if it exists there =====
    if (content[pageId]) {
      delete content[pageId];
      console.log(`🧹 Cleaned up: Removed "${pageId}" from root level`);
    }
    
    // Update timestamp
    content.lastUpdated = new Date().toISOString();
    
    // Write to file
    fs.writeFileSync(contentFilePath, JSON.stringify(content, null, 2));
    
    console.log(`✅ Page "${pageId}" saved to content.pages.${pageId}`);
    
    res.json({ 
      success: true, 
      message: `Page '${pageId}' updated successfully`,
      page: content.pages[pageId]
    });
    
  } catch (error) {
    console.error('Error updating content:', error);
    res.status(500).json({ error: 'Failed to update content' });
  }
});

// ============================================================
// PUT /api/content/settings - Update global settings
// ============================================================
router.put('/settings', verifyAuth, (req, res) => {
  try {
    const content = JSON.parse(fs.readFileSync(contentFilePath, 'utf8'));
    content.globalSettings = req.body;
    content.lastUpdated = new Date().toISOString();
    fs.writeFileSync(contentFilePath, JSON.stringify(content, null, 2));
    res.json({ success: true, message: 'Settings updated successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

module.exports = router;
