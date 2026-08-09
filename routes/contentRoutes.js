//D:/Trident Log/Trident-BE/routes/contentRoutes.js

const express = require('express');
const db = require('../models/db');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

const router = express.Router();

// ============================================================
// GET /api/content/pages
// Public - Get all pages list
// ============================================================
router.get('/pages', async (req, res) => {
    try {
        const result = await db.query(
            'SELECT id, page_key, is_active, created_at, updated_at FROM pages ORDER BY id'
        );
        res.json({ success: true, pages: result.rows });
    } catch (error) {
        console.error('Error fetching pages:', error);
        res.status(500).json({ error: 'Failed to fetch pages' });
    }
});

// ============================================================
// GET /api/content/page/:pageKey
// Public - Get full page content with all sections
// ============================================================
router.get('/page/:pageKey', async (req, res) => {
    try {
        const { pageKey } = req.params;

        // Get page
        const pageResult = await db.query(
            'SELECT id, page_key, is_active FROM pages WHERE page_key = $1',
            [pageKey]
        );

        if (pageResult.rows.length === 0) {
            return res.status(404).json({ error: 'Page not found' });
        }

        const page = pageResult.rows[0];

        // Get hero section
        const heroResult = await db.query(
            'SELECT * FROM hero_sections WHERE page_id = $1',
            [page.id]
        );

        // Get all sections
        const sectionsResult = await db.query(
            'SELECT * FROM page_sections WHERE page_id = $1 ORDER BY sort_order',
            [page.id]
        );

        const sections = [];

        for (const section of sectionsResult.rows) {
            const sectionData = { ...section };

            // Fetch related data based on section type
            if (section.section_type === 'cards_grid' || section.section_type === 'values_list') {
                const cardsResult = await db.query(
                    'SELECT * FROM section_cards WHERE section_id = $1 ORDER BY sort_order',
                    [section.id]
                );
                sectionData.cards = cardsResult.rows;
            }

            if (section.section_type === 'text_block' || section.section_type === 'segments_list') {
                const pointsResult = await db.query(
                    'SELECT * FROM section_points WHERE section_id = $1 ORDER BY sort_order',
                    [section.id]
                );
                if (pointsResult.rows.length > 0) {
                    sectionData.points = pointsResult.rows.map(p => p.point_text);
                }
            }

            const faqsResult = await db.query(
                'SELECT * FROM section_faqs WHERE section_id = $1 ORDER BY sort_order',
                [section.id]
            );
            if (faqsResult.rows.length > 0) {
                sectionData.faqs = faqsResult.rows;
            }

            const leadersResult = await db.query(
                'SELECT * FROM section_leaders WHERE section_id = $1 ORDER BY sort_order',
                [section.id]
            );
            if (leadersResult.rows.length > 0) {
                sectionData.leaders = leadersResult.rows;
            }

            const iconsResult = await db.query(
                'SELECT * FROM section_icons WHERE section_id = $1 ORDER BY sort_order',
                [section.id]
            );
            if (iconsResult.rows.length > 0) {
                sectionData.icons = iconsResult.rows;
            }

            const addressesResult = await db.query(
                'SELECT * FROM section_addresses WHERE section_id = $1 ORDER BY sort_order',
                [section.id]
            );
            if (addressesResult.rows.length > 0) {
                sectionData.address = addressesResult.rows.map(a => a.address_line);
            }

            sections.push(sectionData);
        }

        res.json({
            success: true,
            page: {
                ...page,
                hero: heroResult.rows[0] || null,
                sections: sections
            }
        });
    } catch (error) {
        console.error('Error fetching page:', error);
        res.status(500).json({ error: 'Failed to fetch page content' });
    }
});

// ============================================================
// GET /api/content/global-settings
// Public - Get global settings
// ============================================================
router.get('/global-settings', async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM global_settings LIMIT 1');

        if (result.rows.length === 0) {
            return res.json({ success: true, settings: null });
        }

        res.json({ success: true, settings: result.rows[0] });
    } catch (error) {
        console.error('Error fetching global settings:', error);
        res.status(500).json({ error: 'Failed to fetch global settings' });
    }
});

// ============================================================
// PUT /api/content/page/:pageKey
// Protected (admin) - Update page content
// ============================================================
router.put('/page/:pageKey', authenticateToken, authorizeRoles('super_admin', 'admin'), async (req, res) => {
    const client = await db.pool.connect();

    try {
        await client.query('BEGIN');

        const { pageKey } = req.params;
        const { isActive, hero, sections } = req.body;

        // Get page
        const pageResult = await client.query(
            'SELECT id FROM pages WHERE page_key = $1',
            [pageKey]
        );

        if (pageResult.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Page not found' });
        }

        const pageId = pageResult.rows[0].id;

        // Update page active status
        if (isActive !== undefined) {
            await client.query(
                'UPDATE pages SET is_active = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
                [isActive, pageId]
            );
        }

        // Update hero section
        if (hero) {
            await client.query(
                `DELETE FROM hero_sections WHERE page_id = $1`,
                [pageId]
            );

            await client.query(
                `INSERT INTO hero_sections (page_id, media, title, subtitle, button1_text, button2_text)
                 VALUES ($1, $2, $3, $4, $5, $6)`,
                [pageId, hero.media, hero.title, hero.subtitle, hero.button1_text, hero.button2_text]
            );
        }

        // Update sections
        if (sections && Array.isArray(sections)) {
            // Delete all existing sections for this page
            await client.query('DELETE FROM page_sections WHERE page_id = $1', [pageId]);

            for (const section of sections) {
                const sectionResult = await client.query(
                    `INSERT INTO page_sections 
                     (page_id, section_key, section_type, sort_order, title, subtitle, heading, description, 
                      sub_description, closing_text, process_label, process, video, image, background_image, 
                      image_left, cta_text, company_name, phone, email, map_url, vision_statement, mission_statement)
                     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23)
                     RETURNING id`,
                    [
                        pageId, section.section_key, section.section_type, section.sort_order || 0,
                        section.title, section.subtitle, section.heading, section.description,
                        section.sub_description, section.closing_text, section.process_label, section.process,
                        section.video, section.image, section.background_image,
                        section.image_left || false, section.cta_text, section.company_name,
                        section.phone, section.email, section.map_url,
                        section.vision_statement, section.mission_statement
                    ]
                );

                const sectionId = sectionResult.rows[0].id;

                // Insert related data
                if (section.cards) {
                    for (const card of section.cards) {
                        await client.query(
                            `INSERT INTO section_cards (section_id, title, description, image, link, gradient, reverse, hidden, sort_order)
                             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
                            [sectionId, card.title, card.description, card.image, card.link,
                             card.gradient, card.reverse || false, card.hidden || false, card.sort_order || 0]
                        );
                    }
                }

                if (section.points) {
                    for (let i = 0; i < section.points.length; i++) {
                        await client.query(
                            `INSERT INTO section_points (section_id, point_text, sort_order)
                             VALUES ($1,$2,$3)`,
                            [sectionId, section.points[i], i]
                        );
                    }
                }

                if (section.faqs) {
                    for (const faq of section.faqs) {
                        await client.query(
                            `INSERT INTO section_faqs (section_id, question, answer, title, narration, sort_order)
                             VALUES ($1,$2,$3,$4,$5,$6)`,
                            [sectionId, faq.question, faq.answer, faq.title, faq.narration, faq.sort_order || 0]
                        );
                    }
                }

                if (section.leaders) {
                    for (const leader of section.leaders) {
                        await client.query(
                            `INSERT INTO section_leaders (section_id, name, title, description, image, gradient, reverse, sort_order)
                             VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
                            [sectionId, leader.name, leader.title, leader.description, leader.image,
                             leader.gradient, leader.reverse || false, leader.sort_order || 0]
                        );
                    }
                }

                if (section.icons) {
                    for (const icon of section.icons) {
                        await client.query(
                            `INSERT INTO section_icons (section_id, icon, text, sort_order)
                             VALUES ($1,$2,$3,$4)`,
                            [sectionId, icon.icon, icon.text, icon.sort_order || 0]
                        );
                    }
                }

                if (section.address) {
                    for (let i = 0; i < section.address.length; i++) {
                        await client.query(
                            `INSERT INTO section_addresses (section_id, address_line, sort_order)
                             VALUES ($1,$2,$3)`,
                            [sectionId, section.address[i], i]
                        );
                    }
                }
            }
        }

        // Update timestamp
        await client.query(
            'UPDATE pages SET updated_at = CURRENT_TIMESTAMP WHERE id = $1',
            [pageId]
        );

        await client.query('COMMIT');

        console.log(`✅ Page updated: ${pageKey} by ${req.user.uid}`);

        res.json({
            success: true,
            message: `Page '${pageKey}' updated successfully`
        });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error updating page:', error);
        res.status(500).json({ error: 'Failed to update page content' });
    } finally {
        client.release();
    }
});

// ============================================================
// PUT /api/content/global-settings
// Protected (admin) - Update global settings
// ============================================================
router.put('/global-settings', authenticateToken, authorizeRoles('super_admin', 'admin'), async (req, res) => {
    try {
        const { company_name, contact_email, contact_phone, quote_recipients, contact_recipients } = req.body;

        const result = await db.query(
            `UPDATE global_settings 
             SET company_name = $1, contact_email = $2, contact_phone = $3, 
                 quote_recipients = $4, contact_recipients = $5, updated_at = CURRENT_TIMESTAMP
             WHERE id = (SELECT id FROM global_settings LIMIT 1)
             RETURNING *`,
            [company_name, contact_email, contact_phone, quote_recipients, contact_recipients]
        );

        console.log(`✅ Global settings updated by ${req.user.uid}`);

        res.json({
            success: true,
            message: 'Global settings updated successfully',
            settings: result.rows[0]
        });
    } catch (error) {
        console.error('Error updating global settings:', error);
        res.status(500).json({ error: 'Failed to update global settings' });
    }
});

// ============================================================
// PUT /api/content/settings/quote-recipients
// Protected (admin) - Update quote recipients only
// ============================================================
router.put('/settings/quote-recipients', authenticateToken, authorizeRoles('super_admin', 'admin'), async (req, res) => {
    try {
        const { emails } = req.body;

        if (!emails || !Array.isArray(emails)) {
            return res.status(400).json({ error: 'Emails array is required' });
        }

        await db.query(
            `UPDATE global_settings SET quote_recipients = $1, updated_at = CURRENT_TIMESTAMP
             WHERE id = (SELECT id FROM global_settings LIMIT 1)`,
            [emails]
        );

        res.json({
            success: true,
            message: 'Quote recipients updated successfully',
            recipients: emails
        });
    } catch (error) {
        console.error('Error updating quote recipients:', error);
        res.status(500).json({ error: 'Failed to update quote recipients' });
    }
});

// ============================================================
// PUT /api/content/settings/contact-recipients
// Protected (admin) - Update contact recipients only
// ============================================================
router.put('/settings/contact-recipients', authenticateToken, authorizeRoles('super_admin', 'admin'), async (req, res) => {
    try {
        const { emails } = req.body;

        if (!emails || !Array.isArray(emails)) {
            return res.status(400).json({ error: 'Emails array is required' });
        }

        await db.query(
            `UPDATE global_settings SET contact_recipients = $1, updated_at = CURRENT_TIMESTAMP
             WHERE id = (SELECT id FROM global_settings LIMIT 1)`,
            [emails]
        );

        res.json({
            success: true,
            message: 'Contact recipients updated successfully',
            recipients: emails
        });
    } catch (error) {
        console.error('Error updating contact recipients:', error);
        res.status(500).json({ error: 'Failed to update contact recipients' });
    }
});

module.exports = router;
