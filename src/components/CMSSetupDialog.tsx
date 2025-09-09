import React, { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { ExternalLink, Eye, EyeOff, HelpCircle } from 'lucide-react'

interface CMSSetupDialogProps {
  cmsType: string | null
  open: boolean
  onClose: () => void
  onComplete: (cmsType: string, credentials: any) => void
}

interface CMSCredentials {
  [key: string]: string
}

export function CMSSetupDialog({ cmsType, open, onClose, onComplete }: CMSSetupDialogProps) {
  const [credentials, setCredentials] = useState<CMSCredentials>({})
  const [showPassword, setShowPassword] = useState<Record<string, boolean>>({})
  const [isValidating, setIsValidating] = useState(false)
  const [validationError, setValidationError] = useState<string | null>(null)

  const updateCredential = (key: string, value: string) => {
    setCredentials(prev => ({ ...prev, [key]: value }))
    setValidationError(null)
  }

  const togglePasswordVisibility = (key: string) => {
    setShowPassword(prev => ({ ...prev, [key]: !prev[key] }))
  }

  const validateAndComplete = async () => {
    if (!cmsType) return

    setIsValidating(true)
    setValidationError(null)

    try {
      // Basic validation
      const requiredFields = getRequiredFields(cmsType)
      const missingFields = requiredFields.filter(field => !credentials[field]?.trim())
      
      if (missingFields.length > 0) {
        throw new Error(`Please fill in: ${missingFields.join(', ')}`)
      }

      // Additional validation based on CMS type
      if (cmsType === 'wordpress') {
        if (!credentials.domain?.includes('.')) {
          throw new Error('Please enter a valid WordPress domain (e.g., yoursite.com)')
        }
        if (credentials.authMethod === 'application_password' && (!credentials.username || !credentials.applicationPassword)) {
          throw new Error('Username and Application Password are required')
        }
      }

      if (cmsType === 'shopify') {
        if (!credentials.shop?.includes('.') && !credentials.shop?.includes('myshopify')) {
          throw new Error('Please enter a valid Shopify store URL')
        }
      }

      // Call completion handler
      onComplete(cmsType, credentials)
    } catch (error) {
      setValidationError(error instanceof Error ? error.message : 'Validation failed')
    } finally {
      setIsValidating(false)
    }
  }

  const getRequiredFields = (cms: string): string[] => {
    switch (cms) {
      case 'wordpress':
        return ['domain', 'authMethod', 'username', 'applicationPassword']
      case 'webflow':
        return ['accessToken']
      case 'shopify':
        return ['shop', 'accessToken']
      default:
        return []
    }
  }

  const renderWordPressSetup = () => (
    <div className="space-y-4">
      <div>
        <Label htmlFor="domain">WordPress Domain</Label>
        <Input
          id="domain"
          placeholder="yoursite.com"
          value={credentials.domain || ''}
          onChange={(e) => updateCredential('domain', e.target.value)}
          className="mt-1"
        />
        <p className="text-xs text-gray-500 mt-1">
          Your WordPress site domain (without https://)
        </p>
      </div>

      <div>
        <Label htmlFor="authMethod">Authentication Method</Label>
        <Select value={credentials.authMethod || 'application_password'} onValueChange={(value) => updateCredential('authMethod', value)}>
          <SelectTrigger className="mt-1">
            <SelectValue placeholder="Select authentication method" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="application_password">Application Password (Recommended)</SelectItem>
            <SelectItem value="jwt">JWT Token</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {credentials.authMethod === 'application_password' && (
        <>
          <div>
            <Label htmlFor="username">WordPress Username</Label>
            <Input
              id="username"
              value={credentials.username || ''}
              onChange={(e) => updateCredential('username', e.target.value)}
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="applicationPassword">Application Password</Label>
            <div className="relative mt-1">
              <Input
                id="applicationPassword"
                type={showPassword.applicationPassword ? 'text' : 'password'}
                value={credentials.applicationPassword || ''}
                onChange={(e) => updateCredential('applicationPassword', e.target.value)}
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => togglePasswordVisibility('applicationPassword')}
                className="absolute right-3 top-1/2 -translate-y-1/2"
              >
                {showPassword.applicationPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <div className="flex items-center gap-2 mt-2">
              <HelpCircle className="w-4 h-4 text-blue-500" />
              <a 
                href="https://wordpress.org/support/article/application-passwords/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-600 hover:underline flex items-center gap-1"
              >
                How to create an Application Password
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        </>
      )}

      {credentials.authMethod === 'jwt' && (
        <div>
          <Label htmlFor="jwt">JWT Token</Label>
          <div className="relative mt-1">
            <Input
              id="jwt"
              type={showPassword.jwt ? 'text' : 'password'}
              value={credentials.jwt || ''}
              onChange={(e) => updateCredential('jwt', e.target.value)}
              className="pr-10"
            />
            <button
              type="button"
              onClick={() => togglePasswordVisibility('jwt')}
              className="absolute right-3 top-1/2 -translate-y-1/2"
            >
              {showPassword.jwt ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Requires JWT Authentication plugin
          </p>
        </div>
      )}
    </div>
  )

  const renderWebflowSetup = () => (
    <div className="space-y-4">
      <div>
        <Label htmlFor="siteId">Site ID</Label>
        <Input
          id="siteId"
          value={credentials.siteId || ''}
          onChange={(e) => updateCredential('siteId', e.target.value)}
          className="mt-1"
          placeholder="5f4d2c1a0b8e3f2d1c0a9b8e"
        />
        <p className="text-xs text-gray-500 mt-1">
          Found in your Webflow project settings
        </p>
      </div>

      <div>
        <Label htmlFor="accessToken">Access Token</Label>
        <div className="relative mt-1">
          <Input
            id="accessToken"
            type={showPassword.accessToken ? 'text' : 'password'}
            value={credentials.accessToken || ''}
            onChange={(e) => updateCredential('accessToken', e.target.value)}
            className="pr-10"
          />
          <button
            type="button"
            onClick={() => togglePasswordVisibility('accessToken')}
            className="absolute right-3 top-1/2 -translate-y-1/2"
          >
            {showPassword.accessToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
        <div className="flex items-center gap-2 mt-2">
          <HelpCircle className="w-4 h-4 text-blue-500" />
          <a 
            href="https://developers.webflow.com/docs/getting-started-with-apps"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-blue-600 hover:underline flex items-center gap-1"
          >
            How to get Webflow API access token
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>
    </div>
  )

  const renderShopifySetup = () => (
    <div className="space-y-4">
      <div>
        <Label htmlFor="shop">Shop Domain</Label>
        <Input
          id="shop"
          value={credentials.shop || ''}
          onChange={(e) => updateCredential('shop', e.target.value)}
          className="mt-1"
          placeholder="yourstore.myshopify.com"
        />
        <p className="text-xs text-gray-500 mt-1">
          Your Shopify store URL
        </p>
      </div>

      <div>
        <Label htmlFor="accessToken">Access Token</Label>
        <div className="relative mt-1">
          <Input
            id="accessToken"
            type={showPassword.accessToken ? 'text' : 'password'}
            value={credentials.accessToken || ''}
            onChange={(e) => updateCredential('accessToken', e.target.value)}
            className="pr-10"
          />
          <button
            type="button"
            onClick={() => togglePasswordVisibility('accessToken')}
            className="absolute right-3 top-1/2 -translate-y-1/2"
          >
            {showPassword.accessToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
        <div className="flex items-center gap-2 mt-2">
          <HelpCircle className="w-4 h-4 text-blue-500" />
          <a 
            href="https://help.shopify.com/en/manual/apps/app-types/private-apps"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-blue-600 hover:underline flex items-center gap-1"
          >
            How to create Shopify private app token
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>

      <div>
        <Label htmlFor="apiVersion">API Version (Optional)</Label>
        <Input
          id="apiVersion"
          value={credentials.apiVersion || '2023-10'}
          onChange={(e) => updateCredential('apiVersion', e.target.value)}
          className="mt-1"
          placeholder="2023-10"
        />
      </div>
    </div>
  )

  const getCMSTitle = (cms: string | null) => {
    switch (cms) {
      case 'wordpress': return 'Connect WordPress'
      case 'webflow': return 'Connect Webflow'
      case 'shopify': return 'Connect Shopify'
      default: return 'Connect CMS'
    }
  }

  const getCMSDescription = (cms: string | null) => {
    switch (cms) {
      case 'wordpress': 
        return 'Connect your self-hosted WordPress site to enable automatic SEO improvements'
      case 'webflow': 
        return 'Connect your Webflow site to automatically update meta tags, content, and CMS items'
      case 'shopify': 
        return 'Connect your Shopify store to automatically optimize product and page SEO'
      default: 
        return 'Enter your CMS credentials to enable automatic website modifications'
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{getCMSTitle(cmsType)}</DialogTitle>
          <DialogDescription>
            {getCMSDescription(cmsType)}
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4">
          {cmsType === 'wordpress' && renderWordPressSetup()}
          {cmsType === 'webflow' && renderWebflowSetup()}
          {cmsType === 'shopify' && renderShopifySetup()}

          {validationError && (
            <Alert variant="destructive" className="mt-4">
              <AlertDescription>{validationError}</AlertDescription>
            </Alert>
          )}

          <div className="flex items-center gap-3 mt-6">
            <Button 
              onClick={validateAndComplete} 
              disabled={isValidating}
              className="flex-1"
            >
              {isValidating ? 'Connecting...' : 'Connect'}
            </Button>
            <Button 
              variant="outline" 
              onClick={onClose}
              disabled={isValidating}
            >
              Cancel
            </Button>
          </div>

          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              🔒 Your credentials are encrypted and stored securely. They're only used to make authorized API calls to your CMS.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}