import React from 'react'
import { Activity, Settings, ExternalLink } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

interface AutopilotCardProps {
  isEnabled: boolean
  scriptConnected: boolean
  recentChanges: number
  lastRunAt?: string
  isApplying?: boolean
  recentFixes?: Array<{
    scope: string
    description: string
    count: number
  }>
  onApplyFixes?: () => void
  onToggleAutopilot?: () => void
}

export function AutopilotCard({ 
  isEnabled, 
  scriptConnected, 
  recentChanges, 
  lastRunAt,
  isApplying = false,
  recentFixes = [],
  onApplyFixes,
  onToggleAutopilot
}: AutopilotCardProps) {
  const navigate = useNavigate()

  // Show setup state if not enabled or script missing
  if (!isEnabled || !scriptConnected) {
    return (
      <div className="space-y-4">
        <div>
          <h3 className="font-corben text-[#282823] text-xl" style={{fontWeight: 400}}>Ready to improve your site</h3>
          <p className="text-sm font-inter text-[#3d3d38] mt-1">
            {!scriptConnected 
              ? 'Connect your website to enable automatic SEO improvements and technical fixes' 
              : 'Enable Autopilot to apply technical SEO improvements automatically'
            }
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3">
          <button 
            onClick={!scriptConnected ? () => navigate('/site-connection') : onToggleAutopilot}
            className="group px-4 py-2.5 bg-[#282823] text-white hover:bg-white hover:text-[#282823] rounded-2xl text-sm font-corben transition-colors shadow-sm hover:shadow-md border border-[#282823]"
          >
            {!scriptConnected ? 'Connect Site' : 'Enable Autopilot'}
          </button>
          <button 
            onClick={() => navigate('/site-connection')}
            className="px-4 py-2.5 text-sm font-inter text-[#3d3d38] hover:text-[#282823] rounded-2xl transition-colors border border-[#e7e5df] hover:border-[#ddff89]"
          >
            View details →
          </button>
        </div>

        {/* EULA notice for first-time setup */}
        {scriptConnected && !isEnabled && (
          <p className="text-xs font-inter text-[#3d3d38]">
            We'll make safe, reversible SEO fixes. You can review and roll back anytime.
          </p>
        )}
      </div>
    )
  }

  // Show active autopilot state
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-corben text-[#282823] text-xl" style={{fontWeight: 400}}>We just improved your site</h3>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-[#ddff89] rounded-full animate-pulse"></div>
          <span className="text-xs font-inter text-[#3d3d38] font-medium">Active</span>
        </div>
      </div>
      
      {recentChanges > 0 ? (
        <div className="mb-3">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-sm font-inter font-medium text-[#282823]">
              {recentChanges} fixes applied
            </span>
            {lastRunAt && (
              <span className="text-xs font-inter text-[#3d3d38]">
                · {new Date(lastRunAt).toLocaleDateString()}
              </span>
            )}
          </div>
          
          {/* Collapsible recent changes */}
          {(recentFixes || []).length > 0 && (
            <details className="mb-3">
              <summary className="text-sm font-inter text-[#3d3d38] cursor-pointer hover:text-[#282823]">
                Recent changes
              </summary>
              <div className="mt-2 space-y-1">
                {(recentFixes || []).slice(0, 3).map((fix, index) => (
                  <div key={index} className="text-xs font-inter text-[#3d3d38] flex items-center gap-1">
                    <div className="w-1 h-1 bg-[#ddff89] rounded-full"></div>
                    {fix.description}
                  </div>
                ))}
              </div>
            </details>
          )}
        </div>
      ) : (
        <div className="mb-3">
          <p className="text-sm font-inter text-[#3d3d38] mb-3">
            Ready to apply new technical fixes to your site.
          </p>
          {onApplyFixes && (
            <button
              onClick={onApplyFixes}
              disabled={isApplying}
              className="group px-4 py-2 bg-[#282823] text-white hover:bg-white hover:text-[#282823] rounded-2xl text-sm font-corben transition-colors disabled:opacity-50 flex items-center gap-2 border border-[#282823]"
            >
              <Activity className={`w-4 h-4 ${isApplying ? 'animate-spin' : ''}`} />
              {isApplying ? 'Applying fixes...' : 'Apply fixes'}
            </button>
          )}
        </div>
      )}

      <div className="flex items-center justify-between">
        <button 
          onClick={() => navigate('/site-connection')}
          className="text-sm font-inter text-[#3d3d38] hover:text-[#282823] transition-colors"
        >
          View details →
        </button>
        <button
          onClick={() => navigate('/site-connection')}
          className="text-sm font-inter text-[#3d3d38] hover:text-[#282823] transition-colors"
          title="Autopilot Settings"
        >
          <Settings className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}