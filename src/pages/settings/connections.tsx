import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/integrations/supabase/client'
import AppShell from '@/components/layout/AppShell'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { ArrowLeft, Globe, Settings, Shield, Code, Copy, CheckCircle2, AlertCircle } from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'
import { CMSSetupDialog } from '@/components/CMSSetupDialog'

interface Project {
  id: string
  site_url: string
  cms_provider: string
  site_script_status: 'connected' | 'missing'
  autopilot_enabled: boolean
  autopilot_scopes: string[]
}

const AUTOPILOT_SCOPES = [
  { id: 'meta', label: 'Meta Descriptions', description: 'Optimize page titles and descriptions' },
  { id: 'h1', label: 'H1 Tags', description: 'Fix duplicate or missing H1 tags' },
  { id: 'robots', label: 'Robots.txt', description: 'Update robots.txt configuration' },
  { id: 'sitemap', label: 'XML Sitemap', description: 'Generate and update sitemap' },
  { id: 'altText', label: 'Alt Text', description: 'Add missing image alt text' },
  { id: 'internalLinks', label: 'Internal Links', description: 'Add contextual internal links' }
]

export default function ConnectionsSettings() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { toast } = useToast()
  
  const [project, setProject] = useState<Project | null>(null)
  const [loading, setLoading] = useState(true)
  const [scriptCopied, setScriptCopied] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)
  const [showCMSSetup, setShowCMSSetup] = useState<string | null>(null)

  useEffect(() => {
    if (user) {
      loadProject()
    }
  }, [user])

  const loadProject = async () => {
    try {
      // First try the projects table
      const { data: projects, error: projectsError } = await supabase
        .from('projects')
        .select('*')
        .eq('user_id', user?.id)
        .limit(1)

      if (projects?.[0]) {
        setProject(projects[0])
        return
      }

      // If projects table doesn't exist, try companies table as fallback
      if (projectsError?.message?.includes('does not exist')) {
        const { data: companies } = await supabase
          .from('companies')
          .select('*')
          .limit(1)

        if (companies?.[0]) {
          // Convert company to project format
          const mockProject = {
            id: companies[0].id,
            site_url: companies[0].website || 'https://example.com',
            cms_provider: 'manual',
            site_script_status: 'missing' as const,
            autopilot_enabled: false,
            autopilot_scopes: [] as string[]
          }
          setProject(mockProject)
          
          toast({
            title: 'Notice',
            description: 'Using existing company data. Create database schema for full functionality.',
            variant: 'default'
          })
        }
      }
    } catch (error) {
      console.error('Error loading project:', error)
      toast({
        title: 'Info',
        description: 'Create database schema to enable full autopilot functionality',
        variant: 'default'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleToggleAutopilot = async () => {
    if (!project || isUpdating) return

    setIsUpdating(true)
    try {
      // Check if we have real projects table
      const { error: checkError } = await supabase.from('projects').select('id').limit(1)
      
      if (checkError?.message?.includes('does not exist')) {
        // Mock behavior for demo
        setProject({
          ...project,
          autopilot_enabled: !project.autopilot_enabled
        })

        toast({
          title: 'Demo Mode',
          description: `Autopilot ${!project.autopilot_enabled ? 'enabled' : 'disabled'} (create schema for real functionality)`
        })
        return
      }

      const { data: result, error } = await supabase.functions.invoke('toggle-autopilot', {
        body: {
          projectId: project.id,
          enabled: !project.autopilot_enabled
        }
      })

      if (error) throw new Error(error.message || 'Failed to toggle autopilot')

      setProject({
        ...project,
        autopilot_enabled: result.project.autopilot_enabled
      })

      toast({
        title: 'Success',
        description: `Autopilot ${result.project.autopilot_enabled ? 'enabled' : 'disabled'}`
      })
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to toggle autopilot',
        variant: 'destructive'
      })
    } finally {
      setIsUpdating(false)
    }
  }

  const handleScopeToggle = async (scopeId: string) => {
    if (!project) return

    const newScopes = project.autopilot_scopes.includes(scopeId)
      ? project.autopilot_scopes.filter(s => s !== scopeId)
      : [...project.autopilot_scopes, scopeId]

    try {
      // Check if projects table exists
      const { error: checkError } = await supabase.from('projects').select('id').limit(1)
      
      if (checkError?.message?.includes('does not exist')) {
        // Demo mode - just update local state
        setProject({
          ...project,
          autopilot_scopes: newScopes
        })

        toast({
          title: 'Demo Mode',
          description: 'Scope updated (create schema for persistence)'
        })
        return
      }

      const { error } = await supabase
        .from('projects')
        .update({ autopilot_scopes: newScopes })
        .eq('id', project.id)

      if (error) throw error

      setProject({
        ...project,
        autopilot_scopes: newScopes
      })

      toast({
        title: 'Success',
        description: 'Autopilot scopes updated'
      })
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update autopilot scopes',
        variant: 'destructive'
      })
    }
  }

  const copyScript = () => {
    const script = `<!-- AI Spotlight Pro Script -->
<script async src="https://cdn.aispotlight.pro/tracker.js" data-project="${project?.id}"></script>`
    
    navigator.clipboard.writeText(script)
    setScriptCopied(true)
    setTimeout(() => setScriptCopied(false), 2000)
    
    toast({
      title: 'Copied!',
      description: 'Script copied to clipboard'
    })
  }

  const simulateConnection = async () => {
    if (!project) return
    
    // Always simulate connection in demo mode
    setProject({
      ...project,
      site_script_status: 'connected'
    })

    toast({
      title: 'Success',
      description: 'Site script connected! (Demo simulation)'
    })
  }

  const handleCMSSetup = (cmsType: string) => {
    if (project?.cms_provider === cmsType) {
      // Already connected, show disconnect option
      handleCMSDisconnect()
    } else {
      // Show setup dialog
      setShowCMSSetup(cmsType)
    }
  }

  const handleCMSDisconnect = async () => {
    if (!project) return
    
    try {
      const { error } = await supabase
        .from('projects')
        .update({ 
          cms_provider: 'manual',
          cms_credentials: {}
        })
        .eq('id', project.id)

      if (error) throw error

      setProject({
        ...project,
        cms_provider: 'manual'
      })

      toast({
        title: 'Disconnected',
        description: 'CMS connection removed - switched to manual mode'
      })
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to disconnect CMS',
        variant: 'destructive'
      })
    }
  }

  const completeCMSSetup = async (cmsType: string, credentials: any) => {
    if (!project) return
    
    try {
      // Check if projects table exists
      const { error: checkError } = await supabase.from('projects').select('id').limit(1)
      
      if (checkError?.message?.includes('does not exist')) {
        // Demo mode - just update local state
        setProject({
          ...project,
          cms_provider: cmsType
        })

        setShowCMSSetup(null)

        toast({
          title: 'Demo Connected',
          description: `${cmsType} connected in demo mode! Create schema for real functionality.`
        })
        return
      }

      const { error } = await supabase
        .from('projects')
        .update({ 
          cms_provider: cmsType,
          cms_credentials: credentials
        })
        .eq('id', project.id)

      if (error) throw error

      setProject({
        ...project,
        cms_provider: cmsType
      })

      setShowCMSSetup(null)

      toast({
        title: 'Success',
        description: `${cmsType} connected successfully! Autopilot can now modify your website automatically.`
      })
    } catch (error) {
      toast({
        title: 'Error',
        description: `Failed to connect ${cmsType}`,
        variant: 'destructive'
      })
    }
  }

  if (loading) {
    return (
      <AppShell>
        <div className="max-w-4xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-200 rounded w-64"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
        </div>
      </AppShell>
    )
  }

  if (!project) {
    return (
      <AppShell>
        <div className="max-w-4xl mx-auto text-center py-20">
          <Settings className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <h2 className="h2 mb-2">No Project Found</h2>
          <p className="body text-gray-600 mb-6">
            Create a project to configure connections.
          </p>
          <Button onClick={() => navigate('/dashboard')}>
            Back to Dashboard
          </Button>
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button 
            onClick={() => navigate('/dashboard')}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="h1">Settings & Connections</h1>
            <p className="body text-gray-600">Manage site script and autopilot configuration</p>
          </div>
        </div>

        <div className="space-y-6">
          {/* Site Connection Status */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="w-5 h-5" />
                Site Connection
              </CardTitle>
              <p className="text-gray-600">
                Connect your site to enable automatic improvements
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${
                    project.site_script_status === 'connected' ? 'bg-green-500' : 'bg-red-500'
                  }`}></div>
                  <div>
                    <p className="font-medium">
                      {project.site_url}
                    </p>
                    <p className="text-sm text-gray-600">
                      Script status: {project.site_script_status === 'connected' ? 'Connected' : 'Not Connected'}
                    </p>
                  </div>
                </div>
                <Badge 
                  variant={project.site_script_status === 'connected' ? 'default' : 'destructive'}
                  className={project.site_script_status === 'connected' ? 'bg-green-600' : ''}
                >
                  {project.site_script_status === 'connected' ? 'Connected' : 'Missing'}
                </Badge>
              </div>

              {project.site_script_status === 'missing' && (
                <div className="border rounded-lg p-4 bg-yellow-50 border-yellow-200">
                  <h4 className="font-medium mb-2">Install Site Script</h4>
                  <p className="text-sm text-gray-600 mb-4">
                    Add this script to your site's &lt;head&gt; section to enable automatic improvements:
                  </p>
                  
                  <div className="relative">
                    <pre className="bg-gray-900 text-white p-3 rounded text-xs overflow-x-auto">
{`<!-- AI Spotlight Pro Script -->
<script async src="https://cdn.aispotlight.pro/tracker.js" 
        data-project="${project.id}"></script>`}
                    </pre>
                    <button
                      onClick={copyScript}
                      className="absolute top-2 right-2 p-2 bg-gray-700 hover:bg-gray-600 rounded text-white"
                    >
                      {scriptCopied ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>

                  <div className="flex gap-2 mt-4">
                    <Button variant="outline" onClick={copyScript}>
                      <Copy className="w-4 h-4 mr-2" />
                      Copy Script
                    </Button>
                    <Button variant="outline" onClick={simulateConnection}>
                      <Code className="w-4 h-4 mr-2" />
                      Test Connection (Mock)
                    </Button>
                  </div>
                </div>
              )}

              {project.site_script_status === 'connected' && (
                <div className="border rounded-lg p-4 bg-green-50 border-green-200">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                    <div>
                      <h4 className="font-medium text-green-900">Script Connected</h4>
                      <p className="text-sm text-green-700">
                        Your site is ready for automatic improvements
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Autopilot Configuration */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Autopilot Settings
              </CardTitle>
              <p className="text-gray-600">
                Configure what improvements can be applied automatically
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Master Toggle */}
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${
                    project.autopilot_enabled ? 'bg-green-500' : 'bg-gray-400'
                  }`}></div>
                  <div>
                    <h4 className="font-medium">Autopilot</h4>
                    <p className="text-sm text-gray-600">
                      {project.autopilot_enabled 
                        ? 'Automatically applying safe improvements'
                        : 'Manual approval required for all changes'}
                    </p>
                  </div>
                </div>
                <Switch
                  checked={project.autopilot_enabled}
                  onCheckedChange={handleToggleAutopilot}
                  disabled={isUpdating || project.site_script_status !== 'connected'}
                />
              </div>

              {project.site_script_status !== 'connected' && (
                <div className="flex items-center gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <AlertCircle className="w-4 h-4 text-yellow-600" />
                  <p className="text-sm text-yellow-700">
                    Connect your site script to enable autopilot
                  </p>
                </div>
              )}

              {/* Scopes Configuration */}
              {project.autopilot_enabled && (
                <div className="space-y-4">
                  <h4 className="font-medium">Allowed Improvements</h4>
                  <div className="grid gap-3">
                    {AUTOPILOT_SCOPES.map((scope) => (
                      <div key={scope.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <h5 className="font-medium text-sm">{scope.label}</h5>
                          <p className="text-xs text-gray-600">{scope.description}</p>
                        </div>
                        <Switch
                          checked={project.autopilot_scopes.includes(scope.id)}
                          onCheckedChange={() => handleScopeToggle(scope.id)}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Safety Notice */}
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h4 className="font-medium text-blue-900 mb-2">Safety Promise</h4>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• All changes are reversible with one click</li>
                  <li>• We only make technical SEO improvements</li>
                  <li>• Your content and design remain untouched</li>
                  <li>• Full changelog available for transparency</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          {/* CMS Integration */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Code className="w-5 h-5" />
                CMS Integration
              </CardTitle>
              <p className="text-gray-600">
                Connect your content management system for automated website modifications
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Current CMS Status */}
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <h4 className="font-medium capitalize">{project.cms_provider}</h4>
                  <p className="text-sm text-gray-600">
                    {project.cms_provider === 'manual' 
                      ? 'No CMS connected - using manual instructions mode'
                      : `Connected to ${project.cms_provider}`}
                  </p>
                </div>
                <Badge variant={project.cms_provider === 'manual' ? 'outline' : 'default'}>
                  {project.cms_provider === 'manual' ? 'Manual' : 'Connected'}
                </Badge>
              </div>

              {/* CMS Provider Selection */}
              <div className="space-y-3">
                <h4 className="font-medium">Connect Your CMS</h4>
                <div className="grid gap-3">
                  {/* WordPress */}
                  <div className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center">
                          <span className="text-white text-sm font-bold">W</span>
                        </div>
                        <div>
                          <h5 className="font-medium">WordPress</h5>
                          <p className="text-sm text-gray-600">Self-hosted WordPress sites</p>
                        </div>
                      </div>
                      <Button 
                        variant={project.cms_provider === 'wordpress' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => handleCMSSetup('wordpress')}
                      >
                        {project.cms_provider === 'wordpress' ? 'Connected' : 'Connect'}
                      </Button>
                    </div>
                    {project.cms_provider === 'wordpress' && (
                      <div className="text-sm text-green-700 bg-green-50 p-2 rounded">
                        ✅ WordPress connected - can modify posts, pages, and media
                      </div>
                    )}
                  </div>

                  {/* Webflow */}
                  <div className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-purple-600 rounded flex items-center justify-center">
                          <span className="text-white text-sm font-bold">W</span>
                        </div>
                        <div>
                          <h5 className="font-medium">Webflow</h5>
                          <p className="text-sm text-gray-600">Webflow designer sites</p>
                        </div>
                      </div>
                      <Button 
                        variant={project.cms_provider === 'webflow' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => handleCMSSetup('webflow')}
                      >
                        {project.cms_provider === 'webflow' ? 'Connected' : 'Connect'}
                      </Button>
                    </div>
                    {project.cms_provider === 'webflow' && (
                      <div className="text-sm text-green-700 bg-green-50 p-2 rounded">
                        ✅ Webflow connected - can modify pages, CMS content, and meta tags
                      </div>
                    )}
                  </div>

                  {/* Shopify */}
                  <div className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-green-600 rounded flex items-center justify-center">
                          <span className="text-white text-sm font-bold">S</span>
                        </div>
                        <div>
                          <h5 className="font-medium">Shopify</h5>
                          <p className="text-sm text-gray-600">Shopify e-commerce stores</p>
                        </div>
                      </div>
                      <Button 
                        variant={project.cms_provider === 'shopify' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => handleCMSSetup('shopify')}
                      >
                        {project.cms_provider === 'shopify' ? 'Connected' : 'Connect'}
                      </Button>
                    </div>
                    {project.cms_provider === 'shopify' && (
                      <div className="text-sm text-green-700 bg-green-50 p-2 rounded">
                        ✅ Shopify connected - can modify products, pages, and SEO settings
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Manual Mode Info */}
              {project.cms_provider === 'manual' && (
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <h4 className="font-medium text-yellow-900 mb-2">Manual Mode Active</h4>
                  <p className="text-sm text-yellow-800 mb-3">
                    Autopilot will provide detailed instructions for SEO fixes instead of applying them automatically.
                  </p>
                  <p className="text-xs text-yellow-700">
                    Connect a CMS above to enable automatic website modifications.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <CMSSetupDialog
        cmsType={showCMSSetup}
        open={!!showCMSSetup}
        onClose={() => setShowCMSSetup(null)}
        onComplete={completeCMSSetup}
      />
    </AppShell>
  )
}