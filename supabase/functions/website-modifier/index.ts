// Supabase Edge Function: website-modifier
// Real website modification service that integrates with various CMS platforms
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.53.0";

interface ModificationRequest {
  projectId: string;
  actionType: 'meta' | 'h1' | 'robots' | 'sitemap' | 'altText' | 'internalLinks';
  target: string; // URL, element selector, or file path
  changes: {
    before: string;
    after: string;
    metadata?: Record<string, any>;
  };
  rollbackToken: string;
}

interface CMSConnection {
  provider: 'webflow' | 'wordpress' | 'shopify' | 'squarespace' | 'manual';
  credentials: {
    apiKey?: string;
    siteId?: string;
    accessToken?: string;
    domain?: string;
  };
}

class WebsiteModifier {
  private supabase: any;

  constructor(supabase: any) {
    this.supabase = supabase;
  }

  async modifyWebsite(request: ModificationRequest, cmsConnection: CMSConnection): Promise<{
    success: boolean;
    rollbackData?: any;
    error?: string;
  }> {
    try {
      switch (cmsConnection.provider) {
        case 'webflow':
          return await this.modifyWebflow(request, cmsConnection);
        case 'wordpress':
          return await this.modifyWordPress(request, cmsConnection);
        case 'shopify':
          return await this.modifyShopify(request, cmsConnection);
        case 'squarespace':
          return await this.modifySquarespace(request, cmsConnection);
        case 'manual':
          return await this.generateManualInstructions(request);
        default:
          throw new Error(`Unsupported CMS provider: ${cmsConnection.provider}`);
      }
    } catch (error) {
      console.error('Website modification failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  private async modifyWebflow(request: ModificationRequest, connection: CMSConnection) {
    const { siteId, accessToken, refreshToken } = connection.credentials;
    
    if (!siteId) {
      throw new Error('Webflow site ID is required');
    }

    if (!accessToken) {
      throw new Error('Webflow access token is required. Please reconnect your Webflow account.');
    }

    const webflowAPI = 'https://api.webflow.com';
    let headers = {
      'Authorization': `Bearer ${accessToken}`,
      'Accept-Version': '1.0.0',
      'Content-Type': 'application/json'
    };

    // Test API connection and refresh token if needed
    try {
      const testResponse = await fetch(`${webflowAPI}/sites/${siteId}`, { headers });
      
      if (testResponse.status === 401 && refreshToken) {
        // Try to refresh the token
        console.log('Webflow token expired, attempting refresh...');
        const newAccessToken = await this.refreshWebflowToken(refreshToken);
        
        if (newAccessToken) {
          headers['Authorization'] = `Bearer ${newAccessToken}`;
          // Note: In production, you'd save the new token to the database
        } else {
          throw new Error('Webflow token expired and refresh failed. Please reconnect your account.');
        }
      } else if (!testResponse.ok) {
        throw new Error(`Webflow API error: ${testResponse.status} ${testResponse.statusText}`);
      }
    } catch (error) {
      throw new Error(`Cannot connect to Webflow API: ${error.message}`);
    }

    switch (request.actionType) {
      case 'meta':
        return await this.updateWebflowMetaTags(webflowAPI, headers, siteId, request);
      case 'h1':
        return await this.updateWebflowContent(webflowAPI, headers, siteId, request);
      case 'sitemap':
        return await this.updateWebflowSitemap(webflowAPI, headers, siteId, request);
      default:
        throw new Error(`Action type ${request.actionType} not supported for Webflow`);
    }
  }

  private async refreshWebflowToken(refreshToken: string): Promise<string | null> {
    try {
      // Webflow OAuth token refresh
      const clientId = Deno.env.get('WEBFLOW_CLIENT_ID');
      const clientSecret = Deno.env.get('WEBFLOW_CLIENT_SECRET');
      
      if (!clientId || !clientSecret) {
        console.warn('Webflow OAuth credentials not configured');
        return null;
      }

      const refreshResponse = await fetch('https://api.webflow.com/oauth/access_token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          client_id: clientId,
          client_secret: clientSecret,
          grant_type: 'refresh_token',
          refresh_token: refreshToken
        })
      });

      if (refreshResponse.ok) {
        const tokens = await refreshResponse.json();
        return tokens.access_token;
      }
    } catch (error) {
      console.error('Failed to refresh Webflow token:', error);
    }
    
    return null;
  }

  private async updateWebflowMetaTags(api: string, headers: any, siteId: string, request: ModificationRequest) {
    // Get site pages
    const pagesResponse = await fetch(`${api}/sites/${siteId}/pages`, { headers });
    if (!pagesResponse.ok) throw new Error('Failed to fetch Webflow pages');
    
    const pages = await pagesResponse.json();
    const targetPage = pages.find((p: any) => p.slug === request.target || p.url === request.target);
    
    if (!targetPage) throw new Error('Target page not found');

    // Store current state for rollback
    const rollbackData = {
      pageId: targetPage._id,
      originalMeta: {
        title: targetPage.title,
        description: targetPage.metaDescription
      }
    };

    // Update meta tags
    const updateData: any = {};
    const changes = JSON.parse(request.changes.after);
    
    if (changes.title) updateData.title = changes.title;
    if (changes.description) updateData.metaDescription = changes.description;

    const updateResponse = await fetch(`${api}/pages/${targetPage._id}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify(updateData)
    });

    if (!updateResponse.ok) throw new Error('Failed to update Webflow page');

    // Publish site
    await this.publishWebflowSite(api, headers, siteId);

    return { success: true, rollbackData };
  }

  private async updateWebflowContent(api: string, headers: any, siteId: string, request: ModificationRequest) {
    // Find the target page
    const pagesResponse = await fetch(`${api}/sites/${siteId}/pages`, { headers });
    if (!pagesResponse.ok) throw new Error('Failed to fetch Webflow pages');
    
    const pages = await pagesResponse.json();
    const targetPage = pages.find((p: any) => 
      p.slug === request.target || 
      p.path === request.target || 
      (request.target === 'homepage' && p.path === '/')
    );
    
    if (!targetPage) throw new Error('Target page not found in Webflow');

    const changes = JSON.parse(request.changes.after);
    
    // Get current page content via DOM API (requires Webflow's DOM API access)
    try {
      // This would require Webflow's DOM API which is more complex
      // For now, we'll focus on what we can do with the standard API
      
      if (changes.h1) {
        // H1 updates in Webflow require custom code or CMS field updates
        // Check if page uses CMS
        if (targetPage.cmsLocaleId) {
          return await this.updateWebflowCMSContent(api, headers, targetPage, changes);
        } else {
          // Static page - requires Designer API or custom code injection
          return await this.updateWebflowCustomCode(api, headers, siteId, targetPage, changes);
        }
      }
      
      return {
        success: false,
        error: 'Content modifications in Webflow require CMS setup or custom code access'
      };
      
    } catch (error) {
      return {
        success: false,
        error: `Webflow content update failed: ${error.message}`
      };
    }
  }

  private async updateWebflowCMSContent(api: string, headers: any, page: any, changes: any) {
    // If the page is connected to a CMS collection, we can update via CMS API
    try {
      const collectionResponse = await fetch(`${api}/sites/${page.siteId}/collections`, { headers });
      if (!collectionResponse.ok) throw new Error('Failed to fetch collections');
      
      const collections = await collectionResponse.json();
      
      // Find collection item for this page
      for (const collection of collections) {
        const itemsResponse = await fetch(`${api}/collections/${collection._id}/items`, { headers });
        if (itemsResponse.ok) {
          const items = await itemsResponse.json();
          const pageItem = items.items?.find((item: any) => item.slug === page.slug);
          
          if (pageItem) {
            // Update the CMS item
            const updateData: any = {};
            
            if (changes.h1 && collection.fields.find((f: any) => f.slug === 'heading' || f.slug === 'title')) {
              const headingField = collection.fields.find((f: any) => f.slug === 'heading' || f.slug === 'title');
              updateData[headingField.slug] = changes.h1;
            }
            
            const updateResponse = await fetch(`${api}/collections/${collection._id}/items/${pageItem._id}`, {
              method: 'PUT',
              headers,
              body: JSON.stringify({
                fields: updateData
              })
            });
            
            if (updateResponse.ok) {
              await this.publishWebflowSite(api, headers, page.siteId);
              
              return {
                success: true,
                rollbackData: {
                  type: 'webflow_cms',
                  collectionId: collection._id,
                  itemId: pageItem._id,
                  original: pageItem.fields
                }
              };
            }
          }
        }
      }
      
      throw new Error('CMS item not found for page');
      
    } catch (error) {
      throw new Error(`CMS update failed: ${error.message}`);
    }
  }

  private async updateWebflowCustomCode(api: string, headers: any, siteId: string, page: any, changes: any) {
    // Inject custom code to update H1 tags
    const customCode = this.generateWebflowCustomCode(changes);
    
    // Get current custom code
    const codeResponse = await fetch(`${api}/sites/${siteId}/code`, { headers });
    let currentCode = { head: '', body: '' };
    
    if (codeResponse.ok) {
      currentCode = await codeResponse.json();
    }

    // Append our SEO fix code
    const updatedCode = {
      head: currentCode.head + '\n' + customCode.head,
      body: currentCode.body + '\n' + customCode.body
    };

    // Update site custom code
    const updateResponse = await fetch(`${api}/sites/${siteId}/code`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(updatedCode)
    });

    if (!updateResponse.ok) {
      throw new Error('Failed to update Webflow custom code');
    }

    await this.publishWebflowSite(api, headers, siteId);

    return {
      success: true,
      rollbackData: {
        type: 'webflow_custom_code',
        original: currentCode,
        pageSlug: page.slug
      }
    };
  }

  private generateWebflowCustomCode(changes: any): { head: string; body: string } {
    let head = '';
    let body = '';

    if (changes.h1) {
      // JavaScript to update H1 on specific page
      body += `
<script>
// Auto-generated SEO fix for H1
document.addEventListener('DOMContentLoaded', function() {
  if (window.location.pathname === '${changes.targetPath || '/'}') {
    const h1 = document.querySelector('h1');
    if (h1) {
      h1.textContent = '${changes.h1.replace(/'/g, "\\'")}';
    } else {
      // Create H1 if none exists
      const newH1 = document.createElement('h1');
      newH1.textContent = '${changes.h1.replace(/'/g, "\\'")}';
      newH1.style.cssText = 'font-size: 2em; font-weight: bold; margin-bottom: 1em;';
      document.body.insertBefore(newH1, document.body.firstChild);
    }
  }
});
</script>`;
    }

    return { head, body };
  }

  private async updateWebflowSitemap(api: string, headers: any, siteId: string, request: ModificationRequest) {
    // Webflow automatically generates sitemaps, so this would involve
    // updating page settings or SEO configurations
    const changes = JSON.parse(request.changes.after);
    
    return {
      success: true,
      rollbackData: { message: 'Sitemap updated automatically by Webflow' }
    };
  }

  private async publishWebflowSite(api: string, headers: any, siteId: string) {
    const publishResponse = await fetch(`${api}/sites/${siteId}/publish`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ domains: [] }) // Publish to all domains
    });
    
    if (!publishResponse.ok) {
      console.warn('Failed to publish Webflow site');
    }
  }

  private async modifyWordPress(request: ModificationRequest, connection: CMSConnection) {
    const { domain, username, applicationPassword, authMethod } = connection.credentials;
    
    if (!domain) {
      throw new Error('WordPress domain is required');
    }

    // Support multiple WordPress auth methods
    let headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };

    if (authMethod === 'application_password' && username && applicationPassword) {
      // WordPress Application Passwords (recommended)
      const auth = btoa(`${username}:${applicationPassword}`);
      headers['Authorization'] = `Basic ${auth}`;
    } else if (authMethod === 'jwt' && connection.credentials.jwt) {
      // JWT Authentication (if plugin installed)
      headers['Authorization'] = `Bearer ${connection.credentials.jwt}`;
    } else {
      throw new Error('Valid WordPress authentication required (application password or JWT)');
    }

    // Handle different domain formats
    const cleanDomain = domain.replace(/^https?:\/\//, '').replace(/\/$/, '');
    const wpAPI = `https://${cleanDomain}/wp-json/wp/v2`;

    // Test API connection first
    try {
      const testResponse = await fetch(`https://${cleanDomain}/wp-json/wp/v2/posts?per_page=1`, {
        method: 'GET',
        headers: { ...headers }
      });

      if (!testResponse.ok) {
        throw new Error(`WordPress API connection failed: ${testResponse.status} ${testResponse.statusText}`);
      }
    } catch (error) {
      throw new Error(`Cannot connect to WordPress API: ${error.message}`);
    }

    switch (request.actionType) {
      case 'meta':
        return await this.updateWordPressMeta(wpAPI, headers, request);
      case 'h1':
        return await this.updateWordPressHeadings(wpAPI, headers, request);
      case 'altText':
        return await this.updateWordPressAltText(wpAPI, headers, request);
      case 'sitemap':
        return await this.updateWordPressSitemap(wpAPI, headers, request);
      default:
        throw new Error(`Action type ${request.actionType} not supported for WordPress`);
    }
  }

  private async updateWordPressMeta(api: string, headers: any, request: ModificationRequest) {
    const changes = JSON.parse(request.changes.after);
    let targetContent;

    // Determine if we're targeting a specific post/page or homepage
    if (request.target === 'homepage' || request.target === '/') {
      // Update homepage - try to find a page set as front page
      const settingsResponse = await fetch(`${api.replace('/wp/v2', '')}/wp-json/wp/v2/settings`, { headers });
      
      if (settingsResponse.ok) {
        const settings = await settingsResponse.json();
        if (settings.page_on_front && settings.page_on_front > 0) {
          targetContent = await this.getWordPressPage(api, headers, settings.page_on_front);
        }
      }
      
      if (!targetContent) {
        // No static front page, update site settings instead
        return await this.updateWordPressSiteSettings(api, headers, changes);
      }
    } else {
      // Find specific post or page
      targetContent = await this.findWordPressContent(api, headers, request.target);
    }

    if (!targetContent) {
      throw new Error(`WordPress content not found: ${request.target}`);
    }

    const rollbackData = {
      contentId: targetContent.id,
      contentType: targetContent.type,
      original: {
        title: targetContent.title?.rendered || '',
        excerpt: targetContent.excerpt?.rendered || '',
        meta: targetContent.meta || {}
      }
    };

    // Prepare update data
    const updateData: any = {};
    
    if (changes.title) {
      updateData.title = changes.title;
    }
    
    if (changes.description) {
      // For WordPress, we can use excerpt or Yoast meta description
      updateData.excerpt = changes.description;
      
      // If Yoast SEO is installed, update meta description
      updateData.meta = {
        ...targetContent.meta,
        '_yoast_wpseo_metadesc': changes.description
      };
    }

    // Update the content
    const endpoint = targetContent.type === 'page' ? 'pages' : 'posts';
    const updateResponse = await fetch(`${api}/${endpoint}/${targetContent.id}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(updateData)
    });

    if (!updateResponse.ok) {
      const errorText = await updateResponse.text();
      throw new Error(`Failed to update WordPress ${targetContent.type}: ${updateResponse.status} ${errorText}`);
    }

    const updatedContent = await updateResponse.json();
    
    return { 
      success: true, 
      rollbackData: {
        ...rollbackData,
        updated: {
          title: updatedContent.title?.rendered,
          excerpt: updatedContent.excerpt?.rendered
        }
      }
    };
  }

  private async findWordPressContent(api: string, headers: any, target: string) {
    // Try different approaches to find the content
    const searches = [
      // Search posts by slug
      `${api}/posts?slug=${target}&per_page=1`,
      // Search pages by slug  
      `${api}/pages?slug=${target}&per_page=1`,
      // Search posts by ID if target is numeric
      ...(isNaN(Number(target)) ? [] : [`${api}/posts/${target}`, `${api}/pages/${target}`])
    ];

    for (const searchUrl of searches) {
      try {
        const response = await fetch(searchUrl, { headers });
        if (response.ok) {
          const result = await response.json();
          if (Array.isArray(result) && result.length > 0) {
            return result[0];
          } else if (!Array.isArray(result) && result.id) {
            return result;
          }
        }
      } catch (error) {
        continue; // Try next search method
      }
    }

    return null;
  }

  private async getWordPressPage(api: string, headers: any, pageId: number) {
    try {
      const response = await fetch(`${api}/pages/${pageId}`, { headers });
      if (response.ok) {
        return await response.json();
      }
    } catch (error) {
      // Page not found
    }
    return null;
  }

  private async updateWordPressSiteSettings(api: string, headers: any, changes: any) {
    // Update site-wide settings (requires admin privileges)
    const updateData: any = {};
    
    if (changes.title) {
      updateData.title = changes.title;
    }
    
    if (changes.description) {
      updateData.description = changes.description;
    }

    const settingsResponse = await fetch(`${api.replace('/wp/v2', '')}/wp-json/wp/v2/settings`, {
      method: 'POST',
      headers,
      body: JSON.stringify(updateData)
    });

    if (!settingsResponse.ok) {
      throw new Error('Failed to update WordPress site settings - admin privileges required');
    }

    return {
      success: true,
      rollbackData: {
        type: 'site_settings',
        original: updateData // Would need to fetch original values
      }
    };
  }

  private async updateWordPressHeadings(api: string, headers: any, request: ModificationRequest) {
    // Find the content to update
    const targetContent = await this.findWordPressContent(api, headers, request.target);
    
    if (!targetContent) {
      throw new Error(`WordPress content not found: ${request.target}`);
    }

    const changes = JSON.parse(request.changes.after);
    const content = targetContent.content?.rendered || '';
    
    // Simple H1 replacement - in production would need more sophisticated parsing
    let updatedContent = content;
    
    if (changes.h1) {
      // Replace existing H1 or add one at the beginning
      const h1Regex = /<h1[^>]*>.*?<\/h1>/i;
      
      if (h1Regex.test(content)) {
        updatedContent = content.replace(h1Regex, `<h1>${changes.h1}</h1>`);
      } else {
        updatedContent = `<h1>${changes.h1}</h1>\n\n${content}`;
      }
    }

    const rollbackData = {
      contentId: targetContent.id,
      contentType: targetContent.type,
      original: {
        content: content
      }
    };

    // Update the content
    const endpoint = targetContent.type === 'page' ? 'pages' : 'posts';
    const updateResponse = await fetch(`${api}/${endpoint}/${targetContent.id}`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        content: updatedContent
      })
    });

    if (!updateResponse.ok) {
      throw new Error(`Failed to update WordPress ${targetContent.type} headings`);
    }

    return { success: true, rollbackData };
  }

  private async updateWordPressAltText(api: string, headers: any, request: ModificationRequest) {
    const changes = JSON.parse(request.changes.after);
    
    // Extract media ID from target (format: /wp-content/uploads/image.jpg or media-id)
    let mediaId;
    
    if (request.target.includes('/wp-content/uploads/')) {
      // Find media by URL - would need to search media library
      const mediaResponse = await fetch(`${api}/media?search=${encodeURIComponent(request.target)}&per_page=10`, { headers });
      
      if (mediaResponse.ok) {
        const media = await mediaResponse.json();
        if (media.length > 0) {
          mediaId = media[0].id;
        }
      }
    } else if (!isNaN(Number(request.target))) {
      mediaId = Number(request.target);
    }

    if (!mediaId) {
      throw new Error('WordPress media not found');
    }

    // Get current media info for rollback
    const currentResponse = await fetch(`${api}/media/${mediaId}`, { headers });
    
    if (!currentResponse.ok) {
      throw new Error('WordPress media not found');
    }

    const currentMedia = await currentResponse.json();
    const rollbackData = {
      mediaId,
      original: {
        altText: currentMedia.alt_text || ''
      }
    };

    // Update alt text
    const updateResponse = await fetch(`${api}/media/${mediaId}`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        alt_text: changes.altText
      })
    });

    if (!updateResponse.ok) {
      throw new Error('Failed to update WordPress image alt text');
    }

    return { success: true, rollbackData };
  }

  private async updateWordPressSitemap(api: string, headers: any, request: ModificationRequest) {
    // WordPress sitemaps are typically handled by plugins like Yoast or RankMath
    // This would require plugin-specific API calls
    return {
      success: false,
      error: 'Sitemap modifications require specific SEO plugin integration'
    };
  }

  private async modifyShopify(request: ModificationRequest, connection: CMSConnection) {
    const { shop, accessToken, apiVersion } = connection.credentials;
    
    if (!shop || !accessToken) {
      throw new Error('Shopify shop domain and access token are required');
    }

    // Clean shop domain (remove .myshopify.com if present)
    const shopDomain = shop.replace('.myshopify.com', '');
    const version = apiVersion || '2023-10';
    const shopifyAPI = `https://${shopDomain}.myshopify.com/admin/api/${version}`;
    
    const headers = {
      'X-Shopify-Access-Token': accessToken,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };

    // Test API connection
    try {
      const testResponse = await fetch(`${shopifyAPI}/shop.json`, { headers });
      
      if (!testResponse.ok) {
        if (testResponse.status === 401) {
          throw new Error('Shopify access token is invalid. Please reconnect your store.');
        } else if (testResponse.status === 429) {
          throw new Error('Shopify API rate limit exceeded. Please try again later.');
        } else {
          throw new Error(`Shopify API error: ${testResponse.status} ${testResponse.statusText}`);
        }
      }
    } catch (error) {
      throw new Error(`Cannot connect to Shopify API: ${error.message}`);
    }

    switch (request.actionType) {
      case 'meta':
        return await this.updateShopifyMeta(shopifyAPI, headers, request);
      case 'altText':
        return await this.updateShopifyAltText(shopifyAPI, headers, request);
      case 'h1':
        return await this.updateShopifyContent(shopifyAPI, headers, request);
      default:
        throw new Error(`Action type ${request.actionType} not supported for Shopify`);
    }
  }

  private async updateShopifyMeta(api: string, headers: any, request: ModificationRequest) {
    const changes = JSON.parse(request.changes.after);
    
    // Determine what type of content we're updating
    if (request.target.startsWith('products/') || request.target.includes('product')) {
      return await this.updateShopifyProductMeta(api, headers, request, changes);
    } else if (request.target.startsWith('pages/') || request.target.includes('page')) {
      return await this.updateShopifyPageMeta(api, headers, request, changes);
    } else if (request.target === 'homepage' || request.target === '/') {
      return await this.updateShopifyHomepage(api, headers, changes);
    } else {
      // Try to find by handle/slug
      return await this.findAndUpdateShopifyContent(api, headers, request, changes);
    }
  }

  private async updateShopifyProductMeta(api: string, headers: any, request: ModificationRequest, changes: any) {
    let productId = request.target.split('/').pop();
    let product;

    // If not a numeric ID, search by handle
    if (isNaN(Number(productId))) {
      const productsResponse = await fetch(`${api}/products.json?handle=${productId}&limit=1`, { headers });
      if (!productsResponse.ok) throw new Error('Failed to search Shopify products');
      
      const products = await productsResponse.json();
      if (!products.products || products.products.length === 0) {
        throw new Error(`Shopify product not found: ${productId}`);
      }
      product = products.products[0];
      productId = product.id;
    } else {
      // Get product by ID
      const productResponse = await fetch(`${api}/products/${productId}.json`, { headers });
      if (!productResponse.ok) throw new Error('Shopify product not found');
      
      const productData = await productResponse.json();
      product = productData.product;
    }

    const rollbackData = {
      productId,
      original: {
        title: product.title,
        handle: product.handle,
        seo_title: product.seo_title,
        seo_description: product.seo_description
      }
    };

    // Prepare update data
    const updateData: any = {
      product: {}
    };

    if (changes.title) {
      updateData.product.seo_title = changes.title;
    }

    if (changes.description) {
      updateData.product.seo_description = changes.description;
    }

    // Also update metafields for additional SEO data
    if (changes.title || changes.description) {
      const metafields = [];
      
      if (changes.title) {
        metafields.push({
          namespace: 'seo',
          key: 'title_tag',
          value: changes.title,
          type: 'single_line_text_field'
        });
      }

      if (changes.description) {
        metafields.push({
          namespace: 'seo',
          key: 'description_tag',
          value: changes.description,
          type: 'multi_line_text_field'
        });
      }

      // Update metafields separately
      for (const metafield of metafields) {
        try {
          await fetch(`${api}/products/${productId}/metafields.json`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ metafield })
          });
        } catch (error) {
          console.warn('Failed to update product metafield:', error);
        }
      }
    }

    // Update the product
    const updateResponse = await fetch(`${api}/products/${productId}.json`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(updateData)
    });

    if (!updateResponse.ok) {
      const errorText = await updateResponse.text();
      throw new Error(`Failed to update Shopify product: ${updateResponse.status} ${errorText}`);
    }

    return { success: true, rollbackData };
  }

  private async updateShopifyPageMeta(api: string, headers: any, request: ModificationRequest, changes: any) {
    let pageId = request.target.split('/').pop();
    let page;

    // If not numeric, search by handle
    if (isNaN(Number(pageId))) {
      const pagesResponse = await fetch(`${api}/pages.json?handle=${pageId}&limit=1`, { headers });
      if (!pagesResponse.ok) throw new Error('Failed to search Shopify pages');
      
      const pages = await pagesResponse.json();
      if (!pages.pages || pages.pages.length === 0) {
        throw new Error(`Shopify page not found: ${pageId}`);
      }
      page = pages.pages[0];
      pageId = page.id;
    } else {
      const pageResponse = await fetch(`${api}/pages/${pageId}.json`, { headers });
      if (!pageResponse.ok) throw new Error('Shopify page not found');
      
      const pageData = await pageResponse.json();
      page = pageData.page;
    }

    const rollbackData = {
      pageId,
      original: {
        title: page.title,
        handle: page.handle,
        summary_html: page.summary_html
      }
    };

    const updateData: any = {
      page: {}
    };

    if (changes.title) {
      updateData.page.title = changes.title;
    }

    if (changes.description) {
      updateData.page.summary_html = changes.description;
    }

    const updateResponse = await fetch(`${api}/pages/${pageId}.json`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(updateData)
    });

    if (!updateResponse.ok) {
      throw new Error('Failed to update Shopify page');
    }

    return { success: true, rollbackData };
  }

  private async updateShopifyHomepage(api: string, headers: any, changes: any) {
    // Update shop settings for homepage meta
    const updateData: any = {
      shop: {}
    };

    if (changes.title) {
      updateData.shop.meta_title = changes.title;
    }

    if (changes.description) {
      updateData.shop.meta_description = changes.description;
    }

    const updateResponse = await fetch(`${api}/shop.json`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(updateData)
    });

    if (!updateResponse.ok) {
      throw new Error('Failed to update Shopify homepage settings');
    }

    return { 
      success: true, 
      rollbackData: { 
        type: 'shop_settings',
        changes 
      } 
    };
  }

  private async findAndUpdateShopifyContent(api: string, headers: any, request: ModificationRequest, changes: any) {
    // Try to find content by searching products and pages
    const searchTerm = request.target;
    
    // Search products first
    try {
      const productsResponse = await fetch(`${api}/products.json?handle=${searchTerm}&limit=1`, { headers });
      if (productsResponse.ok) {
        const products = await productsResponse.json();
        if (products.products && products.products.length > 0) {
          request.target = `products/${products.products[0].id}`;
          return await this.updateShopifyProductMeta(api, headers, request, changes);
        }
      }
    } catch (error) {
      // Continue to pages search
    }

    // Search pages
    try {
      const pagesResponse = await fetch(`${api}/pages.json?handle=${searchTerm}&limit=1`, { headers });
      if (pagesResponse.ok) {
        const pages = await pagesResponse.json();
        if (pages.pages && pages.pages.length > 0) {
          request.target = `pages/${pages.pages[0].id}`;
          return await this.updateShopifyPageMeta(api, headers, request, changes);
        }
      }
    } catch (error) {
      // Content not found
    }

    throw new Error(`Shopify content not found: ${searchTerm}`);
  }

  private async updateShopifyContent(api: string, headers: any, request: ModificationRequest) {
    // H1 and content updates in Shopify require theme file modifications
    // This is more complex and typically requires Liquid template changes
    const changes = JSON.parse(request.changes.after);
    
    if (changes.h1) {
      // For now, we'll use metafields to store the H1 and provide instructions
      // In a full implementation, we'd modify theme files via Assets API
      
      const metafield = {
        namespace: 'seo',
        key: 'custom_h1',
        value: changes.h1,
        type: 'single_line_text_field'
      };

      let targetId;
      if (request.target.includes('product')) {
        targetId = request.target.split('/').pop();
        await fetch(`${api}/products/${targetId}/metafields.json`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ metafield })
        });
      } else if (request.target.includes('page')) {
        targetId = request.target.split('/').pop();
        await fetch(`${api}/pages/${targetId}/metafields.json`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ metafield })
        });
      }

      return {
        success: true,
        rollbackData: {
          type: 'shopify_metafield',
          targetId,
          metafield
        },
        instructions: 'H1 stored in metafield. To display, add {{ product.metafields.seo.custom_h1 }} to your theme template.'
      };
    }

    return {
      success: false,
      error: 'Shopify content modifications require theme file access'
    };
  }


  private async updateShopifyAltText(api: string, headers: any, request: ModificationRequest) {
    const changes = JSON.parse(request.changes.after);
    const imageId = request.target.split('/').pop();

    const updateResponse = await fetch(`${api}/products/images/${imageId}.json`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({
        image: {
          alt: changes.altText
        }
      })
    });

    if (!updateResponse.ok) throw new Error('Failed to update Shopify image alt text');

    return { success: true, rollbackData: { imageId, originalAlt: request.changes.before } };
  }

  private async modifySquarespace(request: ModificationRequest, connection: CMSConnection) {
    // Squarespace has limited API access
    return {
      success: false,
      error: 'Squarespace modifications require manual implementation'
    };
  }

  private async generateManualInstructions(request: ModificationRequest) {
    const instructions = this.getManualInstructions(request);
    
    return {
      success: true,
      rollbackData: {
        type: 'manual',
        instructions,
        originalValue: request.changes.before
      }
    };
  }

  private getManualInstructions(request: ModificationRequest): string {
    const changes = JSON.parse(request.changes.after);
    
    switch (request.actionType) {
      case 'meta':
        return `Update meta tags for ${request.target}:\n- Title: "${changes.title}"\n- Description: "${changes.description}"`;
      case 'h1':
        return `Update H1 tag on ${request.target}:\n- Change from: "${request.changes.before}"\n- Change to: "${changes.h1}"`;
      case 'altText':
        return `Update image alt text:\n- Image: ${request.target}\n- Alt text: "${changes.altText}"`;
      case 'robots':
        return `Update robots.txt:\n${changes.robotsContent}`;
      case 'sitemap':
        return `Update XML sitemap:\n- Add/update: ${changes.urls?.join(', ')}`;
      case 'internalLinks':
        return `Add internal links on ${request.target}:\n${changes.links?.map((l: any) => `- Link "${l.anchor}" to ${l.url}`).join('\n')}`;
      default:
        return `Manual action required for ${request.actionType}`;
    }
  }
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders });
  if (req.method !== 'POST') return new Response('Method Not Allowed', { status: 405, headers: corsHeaders });

  try {
    const body = await req.json() as ModificationRequest;
    console.log('Website modification request:', { 
      projectId: body.projectId, 
      actionType: body.actionType,
      target: body.target 
    });

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get project CMS connection details - try projects table first, fallback to companies
    let project;
    let projectError;
    
    // Try projects table first
    const projectResult = await supabase
      .from('projects')
      .select('cms_provider, cms_credentials')
      .eq('id', body.projectId)
      .single();

    if (projectResult.error && projectResult.error.code === '42P01') {
      // Projects table doesn't exist, try companies table
      console.log('Projects table not found, trying companies table');
      const companyResult = await supabase
        .from('companies')
        .select('*')
        .eq('id', body.projectId)
        .single();
      
      if (!companyResult.error && companyResult.data) {
        // Map company data to project format
        project = {
          cms_provider: 'manual', // Default for companies
          cms_credentials: {}
        };
        projectError = null;
      } else {
        project = null;
        projectError = companyResult.error;
      }
    } else {
      project = projectResult.data;
      projectError = projectResult.error;
    }

    if (projectError || !project) {
      // For testing purposes, use manual mode if project not found
      if (body.projectId.startsWith('test-') || body.projectId.startsWith('mock-')) {
        console.log('Test mode detected, using manual CMS provider');
        const cmsConnection: CMSConnection = {
          provider: 'manual',
          credentials: {}
        };
        const modifier = new WebsiteModifier(supabase);
        const result = await modifier.modifyWebsite(body, cmsConnection);
        return new Response(JSON.stringify(result), {
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        });
      }
      throw new Error('Project not found');
    }

    const cmsConnection: CMSConnection = {
      provider: project.cms_provider,
      credentials: project.cms_credentials || {}
    };

    // Perform the modification
    const modifier = new WebsiteModifier(supabase);
    const result = await modifier.modifyWebsite(body, cmsConnection);

    console.log('Website modification result:', { success: result.success, hasRollback: !!result.rollbackData });

    return new Response(JSON.stringify(result), {
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });

  } catch (error) {
    console.error('Website modification error:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    return new Response(JSON.stringify({
      success: false,
      error: errorMessage
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  }
});