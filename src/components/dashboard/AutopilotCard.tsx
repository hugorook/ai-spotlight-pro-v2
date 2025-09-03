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
      <div className="bg-white rounded-lg p-3 border">
        <h3 className="h3 mb-1">Ready to improve your site</h3>
        <p className="text-sm text-gray-600 mb-3">
          {!scriptConnected 
            ? 'Install the site script to enable automatic fixes' 
            : 'Enable Autopilot to apply technical SEO improvements automatically'
          }
        </p>
        
        <div className="flex gap-2">
          <button 
            onClick={!scriptConnected ? () => navigate('/settings/connections') : onToggleAutopilot}
            className="px-4 py-2 bg-[#5F209B] text-white rounded-md text-sm hover:opacity-90 transition-opacity font-medium"
          >
            {!scriptConnected ? 'Connect Site' : 'Enable Autopilot'}
          </button>
          <button 
            onClick={() => navigate('/analytics')}
            className="px-3 py-2 text-sm text-gray-600 hover:text-gray-900 rounded-md transition-colors"
          >
            View details →
          </button>
        </div>

        {/* EULA notice for first-time setup */}
        {scriptConnected && !isEnabled && (
          <p className="text-xs text-gray-500 mt-3">
            We'll make safe, reversible SEO fixes. You can review and roll back anytime.
          </p>
        )}
      </div>
    )
  }

  // Show active autopilot state
  return (
    <div className="bg-white rounded-lg p-3 border">
      <div className="flex items-center justify-between mb-2">
        <h3 className="h3">We just improved your site</h3>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
          <span className="text-xs text-gray-500">Active</span>
        </div>
      </div>
      
      {recentChanges > 0 ? (
        <div className="mb-3">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-sm font-medium text-gray-900">
              {recentChanges} fixes applied
            </span>
            {lastRunAt && (
              <span className="text-xs text-gray-500">
                · {new Date(lastRunAt).toLocaleDateString()}
              </span>
            )}
          </div>
          
          {/* Collapsible recent changes */}
          {recentFixes.length > 0 && (
            <details className="mb-3">
              <summary className="text-sm text-gray-600 cursor-pointer hover:text-gray-900">
                Recent changes
              </summary>
              <div className="mt-2 space-y-1">
                {recentFixes.slice(0, 3).map((fix, index) => (
                  <div key={index} className="text-xs text-gray-500 flex items-center gap-1">
                    <div className="w-1 h-1 bg-gray-400 rounded-full"></div>
                    {fix.description}
                  </div>
                ))}
              </div>
            </details>
          )}
        </div>
      ) : (
        <div className="mb-3">
          <p className="text-sm text-gray-600 mb-3">
            Ready to apply new technical fixes to your site.
          </p>
          {onApplyFixes && (
            <button
              onClick={onApplyFixes}
              disabled={isApplying}
              className="px-4 py-2 bg-[#5F209B] text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-2"
            >
              <Activity className={`w-4 h-4 ${isApplying ? 'animate-spin' : ''}`} />
              {isApplying ? 'Applying fixes...' : 'Apply fixes'}
            </button>
          )}
        </div>
      )}

      <div className="flex items-center justify-between">
        <button 
          onClick={() => navigate('/analytics')}
          className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
        >
          View details →
        </button>
        <button
          onClick={() => navigate('/settings/connections')}
          className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
          title="Autopilot Settings"
        >
          <Settings className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}