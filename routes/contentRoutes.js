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
    pages: {
      about: {
        isActive: true,
        hero: {
          title: "To improve life for all",
          subtitle: "by integrating the world"
        },
        purpose: {
          heading: "Our purpose is the reason we strive to go all the way, every day.",
          text: "To deliver a more connected, agile and sustainable future for global logistics.",
          tags: ["Sustainability", "Our History", "Careers"]
        },
        vision: {
          title: "Trident Global Logistics' vision is to become the Global Integrator",
          description: "Increasing complexity in global supply chains is making them inefficient."
        }
      },
      'supply-chain-management': {
        isActive: true,
        hero: {
          title: "Control, visibility, efficiency – from start to finish",
          subtitle: "Supply Chain Management solutions designed to handle your logistics complexities",
          ctaText: "Learn more",
          ctaLink: "/contact"
        }
      },
      'cold-storage': {
        isActive: true,
        hero: {
          title: "Cold Storage",
          subtitle: "Store, handle, and transport temperature-sensitive cargo.",
          ctaText: "Contact us",
          ctaLink: "/contact"
        }
      },
      'project-logistics': {
        isActive: true,
        hero: {
          title: "Project Logistics",
          subtitle: "Whatever your project, we have the logistics.",
          ctaText: "Contact us",
          ctaLink: "/contact"
        }
      },
      'garments-on-hanger': {
        isActive: true,
        hero: {
          title: "Garments on Hangers",
          subtitle: "Specialised containers with built-in hangers.",
          ctaText: "Contact us",
          ctaLink: "/contact"
        }
      },
      'cars-in-containers': {
        isActive: true,
        hero: {
          title: "Shift into higher gear to overcome automotive disruptions",
          subtitle: "Integrated logistics brings greater flexibility and agility.",
          ctaText: "Contact us",
          ctaLink: "/contact"
        }
      },
      'flexibag-logistics': {
        isActive: true,
        hero: {
          title: "Flexibag Logistics",
          subtitle: "Transport bulk liquids safely and efficiently.",
          ctaText: "Contact us",
          ctaLink: "/contact"
        }
      }
    },
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
  // Simple verification - in production, verify JWT properly
  if (token) {
    next();
  } else {
    res.status(401).json({ error: 'Unauthorized' });
  }
};

// GET all content
router.get('/', (req, res) => {
  try {
    const content = JSON.parse(fs.readFileSync(contentFilePath, 'utf8'));
    res.json(content);
  } catch (error) {
    res.status(500).json({ error: 'Failed to read content' });
  }
});

  // GET specific page content
  router.get('/page/:pageId', (req, res) => {
    try {
      const content = JSON.parse(fs.readFileSync(contentFilePath, 'utf8'));
      const pageId = req.params.pageId;
      
      // First try to find in 'pages' object, then at root level
      let page = null;
      
      if (content.pages && content.pages[pageId]) {
        page = content.pages[pageId];
      } else if (content[pageId]) {
        page = content[pageId];
      }
      
      if (page) {
        res.json(page);
      } else {
        res.status(404).json({ error: `Page '${pageId}' not found` });
      }
    } catch (error) {
      console.error('Error reading content:', error);
      res.status(500).json({ error: 'Failed to read content' });
    }
  });

  // UPDATE page content (protected)
  router.put('/page/:pageId', verifyAuth, (req, res) => {
    try {
      const content = JSON.parse(fs.readFileSync(contentFilePath, 'utf8'));
      const pageId = req.params.pageId;
      const newPageData = req.body;
      
      // Find the page in either pages object or root level
      let existingPage = null;
      let pageLocation = null;
      
      if (content.pages && content.pages[pageId]) {
        existingPage = content.pages[pageId];
        pageLocation = 'pages';
      } else if (content[pageId]) {
        existingPage = content[pageId];
        pageLocation = 'root';
      }
      
      if (existingPage) {
        // MERGE: Only update the fields that were sent, preserve everything else
        const mergedPage = { ...existingPage, ...newPageData };
        
        if (pageLocation === 'pages') {
          content.pages[pageId] = mergedPage;
        } else {
          content[pageId] = mergedPage;
        }
      } else {
        // Page doesn't exist, create it
        if (content.pages) {
          content.pages[pageId] = newPageData;
        } else {
          content[pageId] = newPageData;
        }
      }
      
      content.lastUpdated = new Date().toISOString();
      fs.writeFileSync(contentFilePath, JSON.stringify(content, null, 2));
      res.json({ success: true, message: 'Page updated successfully' });
    } catch (error) {
      console.error('Error updating content:', error);
      res.status(500).json({ error: 'Failed to update content' });
    }
  });

// UPDATE global settings (protected)
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
