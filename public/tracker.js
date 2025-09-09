/**
 * AI Spotlight Pro Website Tracker
 * Monitors website for SEO issues and sends data to autopilot system
 */

(function() {
  'use strict';

  // Configuration
  const API_BASE = 'https://hnixjucjhbozehjpevet.supabase.co/functions/v1';
  const TRACKER_VERSION = '1.0.0';
  
  // Get project ID from script tag
  const scriptTag = document.querySelector('script[data-project]');
  const PROJECT_ID = scriptTag ? scriptTag.getAttribute('data-project') : null;

  if (!PROJECT_ID) {
    console.warn('AI Spotlight Pro: No project ID found');
    return;
  }

  class WebsiteTracker {
    constructor(projectId) {
      this.projectId = projectId;
      this.issues = [];
      this.pageData = {};
      this.initialized = false;
    }

    async init() {
      if (this.initialized) return;
      
      console.log('AI Spotlight Pro: Initializing tracker', { version: TRACKER_VERSION, projectId: this.projectId });
      
      // Wait for DOM to be ready
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => this.startAnalysis());
      } else {
        this.startAnalysis();
      }
      
      this.initialized = true;
    }

    startAnalysis() {
      try {
        this.analyzeCurrentPage();
        this.schedulePeriodicChecks();
        this.sendInitialReport();
      } catch (error) {
        console.error('AI Spotlight Pro: Analysis failed', error);
      }
    }

    analyzeCurrentPage() {
      this.pageData = {
        url: window.location.href,
        title: document.title,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        viewport: {
          width: window.innerWidth,
          height: window.innerHeight
        }
      };

      // Run all SEO checks
      this.checkMetaTags();
      this.checkHeadings();
      this.checkImages();
      this.checkInternalLinks();
      this.checkPageSpeed();
      this.checkMobileOptimization();
      this.checkStructuredData();

      console.log('AI Spotlight Pro: Analysis complete', {
        issuesFound: this.issues.length,
        pageUrl: this.pageData.url
      });
    }

    checkMetaTags() {
      const title = document.querySelector('title');
      const metaDesc = document.querySelector('meta[name="description"]');
      const metaKeywords = document.querySelector('meta[name="keywords"]');

      // Title checks
      if (!title || !title.textContent.trim()) {
        this.addIssue('meta', 'missing_title', 'Page is missing a title tag', 'high');
      } else if (title.textContent.length < 30) {
        this.addIssue('meta', 'short_title', `Title is too short (${title.textContent.length} chars)`, 'medium');
      } else if (title.textContent.length > 60) {
        this.addIssue('meta', 'long_title', `Title is too long (${title.textContent.length} chars)`, 'medium');
      }

      // Meta description checks
      if (!metaDesc || !metaDesc.getAttribute('content')) {
        this.addIssue('meta', 'missing_description', 'Page is missing meta description', 'high');
      } else {
        const descLength = metaDesc.getAttribute('content').length;
        if (descLength < 120) {
          this.addIssue('meta', 'short_description', `Meta description is too short (${descLength} chars)`, 'medium');
        } else if (descLength > 160) {
          this.addIssue('meta', 'long_description', `Meta description is too long (${descLength} chars)`, 'medium');
        }
      }

      // Duplicate meta tags
      const allTitles = document.querySelectorAll('title');
      const allDescriptions = document.querySelectorAll('meta[name="description"]');
      
      if (allTitles.length > 1) {
        this.addIssue('meta', 'duplicate_title', `Found ${allTitles.length} title tags`, 'high');
      }
      
      if (allDescriptions.length > 1) {
        this.addIssue('meta', 'duplicate_description', `Found ${allDescriptions.length} meta descriptions`, 'high');
      }
    }

    checkHeadings() {
      const h1s = document.querySelectorAll('h1');
      const h2s = document.querySelectorAll('h2');
      const h3s = document.querySelectorAll('h3');

      // H1 checks
      if (h1s.length === 0) {
        this.addIssue('h1', 'missing_h1', 'Page is missing H1 tag', 'high');
      } else if (h1s.length > 1) {
        this.addIssue('h1', 'multiple_h1', `Found ${h1s.length} H1 tags`, 'high');
      }

      // Check for empty headings
      const allHeadings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
      allHeadings.forEach((heading, index) => {
        if (!heading.textContent.trim()) {
          this.addIssue('h1', 'empty_heading', `Empty ${heading.tagName} tag found`, 'medium');
        }
      });

      // Check heading hierarchy
      const headingLevels = Array.from(allHeadings).map(h => parseInt(h.tagName.charAt(1)));
      for (let i = 1; i < headingLevels.length; i++) {
        const current = headingLevels[i];
        const previous = headingLevels[i - 1];
        if (current > previous + 1) {
          this.addIssue('h1', 'broken_hierarchy', `Heading hierarchy jumps from H${previous} to H${current}`, 'low');
        }
      }
    }

    checkImages() {
      const images = document.querySelectorAll('img');
      let missingAltCount = 0;
      let emptyAltCount = 0;

      images.forEach(img => {
        const alt = img.getAttribute('alt');
        const src = img.getAttribute('src');

        if (alt === null) {
          missingAltCount++;
          this.addIssue('altText', 'missing_alt', `Image missing alt attribute: ${src}`, 'medium');
        } else if (alt.trim() === '') {
          emptyAltCount++;
          this.addIssue('altText', 'empty_alt', `Image has empty alt attribute: ${src}`, 'low');
        }

        // Check for oversized images
        if (img.naturalWidth && img.naturalHeight) {
          const displayWidth = img.offsetWidth;
          const displayHeight = img.offsetHeight;
          const naturalWidth = img.naturalWidth;
          const naturalHeight = img.naturalHeight;

          if (naturalWidth > displayWidth * 2 || naturalHeight > displayHeight * 2) {
            this.addIssue('altText', 'oversized_image', `Image is larger than needed: ${src}`, 'low');
          }
        }
      });

      if (missingAltCount > 0) {
        console.log(`AI Spotlight Pro: Found ${missingAltCount} images without alt attributes`);
      }
    }

    checkInternalLinks() {
      const links = document.querySelectorAll('a[href]');
      const internalLinks = [];
      const externalLinks = [];
      let brokenLinkCount = 0;

      links.forEach(link => {
        const href = link.getAttribute('href');
        
        if (!href || href.startsWith('#')) return;

        if (href.startsWith('/') || href.includes(window.location.hostname)) {
          internalLinks.push({ element: link, href, text: link.textContent.trim() });
        } else if (href.startsWith('http')) {
          externalLinks.push({ element: link, href, text: link.textContent.trim() });
        }

        // Check for empty link text
        if (!link.textContent.trim() && !link.querySelector('img')) {
          this.addIssue('internalLinks', 'empty_link_text', `Link has no text: ${href}`, 'medium');
        }

        // Check for generic link text
        const genericTexts = ['click here', 'read more', 'learn more', 'here', 'more'];
        if (genericTexts.includes(link.textContent.trim().toLowerCase())) {
          this.addIssue('internalLinks', 'generic_link_text', `Generic link text: "${link.textContent.trim()}"`, 'low');
        }
      });

      // Analyze internal linking opportunities
      const contentText = document.body.textContent;
      const commonKeywords = this.extractKeywords(contentText);
      
      // Check if we have enough internal links
      if (internalLinks.length < 3 && contentText.length > 1000) {
        this.addIssue('internalLinks', 'insufficient_internal_links', 'Page could benefit from more internal links', 'low');
      }
    }

    extractKeywords(text) {
      // Simple keyword extraction
      const words = text.toLowerCase()
        .replace(/[^\w\s]/g, '')
        .split(/\s+/)
        .filter(word => word.length > 4);

      const wordCount = {};
      words.forEach(word => {
        wordCount[word] = (wordCount[word] || 0) + 1;
      });

      return Object.entries(wordCount)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 10)
        .map(([word]) => word);
    }

    checkPageSpeed() {
      // Basic performance checks
      if (performance && performance.timing) {
        const timing = performance.timing;
        const loadTime = timing.loadEventEnd - timing.navigationStart;
        
        if (loadTime > 3000) {
          this.addIssue('performance', 'slow_load_time', `Page load time: ${loadTime}ms`, 'medium');
        }

        // Check for render-blocking resources
        const scripts = document.querySelectorAll('script[src]:not([async]):not([defer])');
        if (scripts.length > 5) {
          this.addIssue('performance', 'render_blocking_scripts', `${scripts.length} render-blocking scripts`, 'low');
        }

        const stylesheets = document.querySelectorAll('link[rel="stylesheet"]:not([media])');
        if (stylesheets.length > 3) {
          this.addIssue('performance', 'render_blocking_css', `${stylesheets.length} render-blocking stylesheets`, 'low');
        }
      }
    }

    checkMobileOptimization() {
      const viewport = document.querySelector('meta[name="viewport"]');
      
      if (!viewport) {
        this.addIssue('mobile', 'missing_viewport', 'Missing viewport meta tag', 'high');
      } else {
        const content = viewport.getAttribute('content');
        if (!content.includes('width=device-width')) {
          this.addIssue('mobile', 'invalid_viewport', 'Viewport meta tag should include width=device-width', 'medium');
        }
      }

      // Check for mobile-friendly font sizes
      const textElements = document.querySelectorAll('p, span, div, a, button');
      let smallTextCount = 0;
      
      textElements.forEach(element => {
        const fontSize = parseInt(window.getComputedStyle(element).fontSize);
        if (fontSize < 14 && element.textContent.trim()) {
          smallTextCount++;
        }
      });

      if (smallTextCount > 10) {
        this.addIssue('mobile', 'small_text', `${smallTextCount} elements with small text (< 14px)`, 'low');
      }
    }

    checkStructuredData() {
      const jsonLd = document.querySelectorAll('script[type="application/ld+json"]');
      const microdata = document.querySelectorAll('[itemtype]');
      
      if (jsonLd.length === 0 && microdata.length === 0) {
        this.addIssue('structured_data', 'missing_structured_data', 'No structured data found on page', 'low');
      }

      // Check for common structured data types
      const hasOrganization = document.querySelector('[itemtype*="Organization"]') || 
                             Array.from(jsonLd).some(script => script.textContent.includes('"@type": "Organization"'));
      
      if (!hasOrganization && window.location.pathname === '/') {
        this.addIssue('structured_data', 'missing_organization_schema', 'Homepage missing Organization schema', 'low');
      }
    }

    addIssue(category, type, description, priority) {
      this.issues.push({
        category,
        type,
        description,
        priority,
        url: window.location.href,
        timestamp: new Date().toISOString(),
        element: null // Could be enhanced to include DOM element reference
      });
    }

    async sendInitialReport() {
      if (this.issues.length === 0) {
        console.log('AI Spotlight Pro: No issues found');
        return;
      }

      const reportData = {
        projectId: this.projectId,
        pageUrl: window.location.href,
        issues: this.issues,
        pageData: this.pageData,
        trackerVersion: TRACKER_VERSION
      };

      try {
        const response = await fetch(`${API_BASE}/report-issues`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(reportData)
        });

        if (response.ok) {
          console.log('AI Spotlight Pro: Issues reported successfully', { count: this.issues.length });
        } else {
          console.warn('AI Spotlight Pro: Failed to report issues', response.status);
        }
      } catch (error) {
        console.error('AI Spotlight Pro: Error reporting issues', error);
      }
    }

    schedulePeriodicChecks() {
      // Check for new issues every 5 minutes
      setInterval(() => {
        const previousIssueCount = this.issues.length;
        this.issues = []; // Reset issues
        this.analyzeCurrentPage();
        
        if (this.issues.length !== previousIssueCount) {
          console.log('AI Spotlight Pro: Page changed, reporting new issues');
          this.sendInitialReport();
        }
      }, 5 * 60 * 1000);
    }
  }

  // Initialize tracker
  const tracker = new WebsiteTracker(PROJECT_ID);
  tracker.init();

  // Expose tracker for debugging
  window.AISpotlightTracker = tracker;

})();