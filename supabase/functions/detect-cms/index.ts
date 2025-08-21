// Supabase Edge Function: detect-cms
// Deploy: supabase functions deploy detect-cms --no-verify-jwt
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

interface CMSDetectionRequest {
  url: string;
}

interface CMSDetectionResult {
  cms: string;
  confidence: number; // 0-100
  version?: string;
  detectedBy: string[]; // What signals detected it
  instructions: PlatformInstructions;
}

interface PlatformInstructions {
  schemaMarkup: {
    location: string;
    steps: string[];
    example?: string;
  };
  faqSection: {
    location: string;
    steps: string[];
    example?: string;
  };
  contentEditing: {
    location: string;
    steps: string[];
  };
}

// CMS detection signatures
const CMS_SIGNATURES = {
  wordpress: {
    headers: ['x-powered-by: PHP', 'server: Apache'],
    meta: ['generator: WordPress'],
    paths: ['/wp-content/', '/wp-includes/', '/wp-admin/'],
    scripts: ['wp-includes', 'wp-content'],
    comments: ['<!-- This site is optimized by the Yoast SEO plugin'],
    confidence: 95
  },
  shopify: {
    headers: ['server: nginx', 'x-shopid'],
    meta: ['generator: Shopify'],
    paths: ['/cdn/shop/', '/assets/', '/_shopify/'],
    scripts: ['Shopify', 'shop.js'],
    comments: ['<!-- BEGIN Shopify'],
    confidence: 98
  },
  webflow: {
    headers: ['server: nginx'],
    meta: ['generator: Webflow'],
    paths: ['/webflow-style/'],
    scripts: ['webflow.js', 'webflow'],
    comments: ['<!-- Webflow'],
    confidence: 95
  },
  squarespace: {
    headers: ['server: nginx'],
    meta: ['generator: Squarespace'],
    paths: ['/universal/', '/assets/'],
    scripts: ['squarespace'],
    comments: ['<!-- Squarespace'],
    confidence: 95
  },
  wix: {
    headers: ['server: nginx'],
    meta: ['generator: Wix.com'],
    paths: ['/corvid/', '/_partials/'],
    scripts: ['wix.js', 'wixapps'],
    comments: ['<!-- Wix'],
    confidence: 95
  },
  hubspot: {
    headers: ['x-powered-by: HubSpot'],
    meta: ['generator: HubSpot'],
    paths: ['/hubfs/', '/hs/'],
    scripts: ['hubspot', 'hubspot.js'],
    comments: ['<!-- HubSpot'],
    confidence: 95
  }
};

async function detectCMS(url: string): Promise<CMSDetectionResult> {
  try {
    // Ensure URL has protocol
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url;
    }
    
    console.log('Detecting CMS for:', url);
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; CMS-Detection-Bot/1.0)',
      },
      signal: AbortSignal.timeout(10000),
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    const html = await response.text();
    const headers = Object.fromEntries(response.headers.entries());
    
    // Analyze for CMS signatures
    const detectionScores: { [cms: string]: { score: number; signals: string[] } } = {};
    
    for (const [cmsName, signatures] of Object.entries(CMS_SIGNATURES)) {
      const detection = { score: 0, signals: [] as string[] };
      
      // Check headers
      for (const headerSignature of signatures.headers) {
        const [headerName, expectedValue] = headerSignature.split(': ');
        if (headers[headerName]?.toLowerCase().includes(expectedValue?.toLowerCase() || headerName)) {
          detection.score += 25;
          detection.signals.push(`Header: ${headerSignature}`);
        }
      }
      
      // Check meta tags
      for (const metaSignature of signatures.meta) {
        if (html.toLowerCase().includes(metaSignature.toLowerCase())) {
          detection.score += 30;
          detection.signals.push(`Meta: ${metaSignature}`);
        }
      }
      
      // Check paths in HTML
      for (const pathSignature of signatures.paths) {
        if (html.includes(pathSignature)) {
          detection.score += 15;
          detection.signals.push(`Path: ${pathSignature}`);
        }
      }
      
      // Check scripts
      for (const scriptSignature of signatures.scripts) {
        if (html.toLowerCase().includes(scriptSignature.toLowerCase())) {
          detection.score += 20;
          detection.signals.push(`Script: ${scriptSignature}`);
        }
      }
      
      // Check HTML comments
      for (const commentSignature of signatures.comments) {
        if (html.includes(commentSignature)) {
          detection.score += 25;
          detection.signals.push(`Comment: ${commentSignature}`);
        }
      }
      
      detectionScores[cmsName] = detection;
    }
    
    // Find the CMS with highest score
    let bestMatch = { cms: 'custom', score: 0, signals: [] as string[] };
    for (const [cms, detection] of Object.entries(detectionScores)) {
      if (detection.score > bestMatch.score) {
        bestMatch = { cms, score: detection.score, signals: detection.signals };
      }
    }
    
    // If no clear match, it's likely a custom site
    const detectedCMS = bestMatch.score > 40 ? bestMatch.cms : 'custom';
    
    console.log(`CMS Detection: ${detectedCMS} (score: ${bestMatch.score})`);
    
    return {
      cms: detectedCMS,
      confidence: Math.min(100, bestMatch.score),
      detectedBy: bestMatch.signals,
      instructions: getPlatformInstructions(detectedCMS)
    };
    
  } catch (error) {
    console.error('CMS detection failed:', error);
    
    // Return custom site as fallback
    return {
      cms: 'custom',
      confidence: 0,
      detectedBy: ['Detection failed - assuming custom site'],
      instructions: getPlatformInstructions('custom')
    };
  }
}

function getPlatformInstructions(cms: string): PlatformInstructions {
  const instructionMap: { [key: string]: PlatformInstructions } = {
    wordpress: {
      schemaMarkup: {
        location: "WordPress Admin → Appearance → Theme Editor or Plugin",
        steps: [
          "Install 'Schema Pro' or 'RankMath' plugin",
          "Go to Schema settings in your plugin",
          "Add FAQ schema type",
          "Paste the generated JSON-LD code",
          "Publish changes"
        ],
        example: "Add to functions.php or use a schema plugin"
      },
      faqSection: {
        location: "WordPress Admin → Pages/Posts → Edit",
        steps: [
          "Edit the page where you want to add FAQ",
          "Add a new 'FAQ Block' or HTML block",
          "Copy and paste the FAQ content",
          "Update the page"
        ],
        example: "Use Gutenberg FAQ block or HTML"
      },
      contentEditing: {
        location: "WordPress Admin → Pages/Posts",
        steps: [
          "Go to Pages or Posts in admin",
          "Click 'Edit' on the page to modify",
          "Make your content changes",
          "Click 'Update' to publish"
        ]
      }
    },
    
    shopify: {
      schemaMarkup: {
        location: "Shopify Admin → Online Store → Themes → Edit Code",
        steps: [
          "Go to 'Edit code' in your theme",
          "Find theme.liquid file",
          "Add JSON-LD schema in the <head> section",
          "Save the file"
        ],
        example: "Add to theme.liquid before </head>"
      },
      faqSection: {
        location: "Shopify Admin → Online Store → Pages",
        steps: [
          "Create or edit a page",
          "In the content editor, add FAQ section",
          "Use Rich Text editor or HTML",
          "Save the page"
        ]
      },
      contentEditing: {
        location: "Shopify Admin → Online Store → Pages/Products",
        steps: [
          "Navigate to the page or product to edit",
          "Click 'Edit' button",
          "Modify content in the editor",
          "Save changes"
        ]
      }
    },

    webflow: {
      schemaMarkup: {
        location: "Webflow Designer → Page Settings → Custom Code",
        steps: [
          "Open Webflow Designer",
          "Go to Page Settings (gear icon)",
          "Scroll to 'Custom Code' section",
          "Paste JSON-LD in 'Head Code'",
          "Publish site"
        ]
      },
      faqSection: {
        location: "Webflow Designer → Add Elements",
        steps: [
          "Open page in Webflow Designer",
          "Drag a 'Rich Text' or 'HTML Embed' element",
          "Add your FAQ content",
          "Style as needed",
          "Publish site"
        ]
      },
      contentEditing: {
        location: "Webflow Designer or Editor",
        steps: [
          "Open Webflow Designer",
          "Select the element to edit",
          "Modify text content",
          "Publish changes"
        ]
      }
    },

    custom: {
      schemaMarkup: {
        location: "Your website's HTML files or CMS",
        steps: [
          "Access your website files via FTP or admin panel",
          "Find the relevant HTML file or template",
          "Add the JSON-LD schema in the <head> section",
          "Save and upload the file",
          "Share this code with your developer if needed"
        ],
        example: "Add before </head> tag"
      },
      faqSection: {
        location: "Your website's content management system",
        steps: [
          "Access your website admin or file system",
          "Find the page template or content area",
          "Add the FAQ HTML structure",
          "Save changes",
          "Contact your developer if you need assistance"
        ]
      },
      contentEditing: {
        location: "Your website's admin panel or files",
        steps: [
          "Log into your website admin",
          "Navigate to the page to edit",
          "Make content changes",
          "Save and publish changes"
        ]
      }
    }
  };
  
  return instructionMap[cms] || instructionMap.custom;
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders });
  if (req.method !== 'POST') return new Response('Method Not Allowed', { status: 405, headers: corsHeaders });
  
  try {
    const body = await req.json();
    console.log('detect-cms request:', { url: body.url });
    
    if (!body.url) {
      throw new Error('Website URL is required');
    }
    
    const detection = await detectCMS(body.url);
    
    console.log('detect-cms completed successfully');
    return new Response(JSON.stringify({ detection }), { 
      headers: { 'Content-Type': 'application/json', ...corsHeaders } 
    });
    
  } catch (error) {
    console.error('detect-cms error:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    return new Response(JSON.stringify({ 
      error: errorMessage,
      detection: null
    }), { 
      status: 500, 
      headers: { 'Content-Type': 'application/json', ...corsHeaders } 
    });
  }
});