import React from 'react'
import { ExternalLink, ArrowRight, Users, FileText, Code } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

interface Action {
  id: string
  title: string
  rationale: string
  impact: 'High' | 'Medium' | 'Low'
  effort: 'High' | 'Medium' | 'Low'
  suggestedOwner: 'Content' | 'PR' | 'Dev'
  actionType: string
  links?: string[]
  status?: 'todo' | 'in_progress' | 'done'
}

interface TopActionsCardProps {
  actions: Action[]
  isLoading?: boolean
  onActionClick?: (action: Action) => void
  embedded?: boolean
}

export function TopActionsCard({ actions, isLoading = false, onActionClick, embedded = false }: TopActionsCardProps) {
  const navigate = useNavigate()

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'High': return 'bg-red-100 text-red-800'
      case 'Medium': return 'bg-yellow-100 text-yellow-800' 
      case 'Low': return 'bg-green-100 text-green-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getOwnerIcon = (owner: string) => {
    switch (owner) {
      case 'Content': return <FileText className="w-3 h-3" />
      case 'PR': return <Users className="w-3 h-3" />
      case 'Dev': return <Code className="w-3 h-3" />
      default: return null
    }
  }

  const getOwnerColor = (owner: string) => {
    switch (owner) {
      case 'Content': return 'bg-blue-100 text-blue-800'
      case 'PR': return 'bg-purple-100 text-purple-800'
      case 'Dev': return 'bg-green-100 text-green-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  if (isLoading) {
    return (
      <div className={`${embedded ? 'p-4' : 'bg-white rounded-lg p-4 border shadow-sm'}`}>
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-64 mb-4"></div>
          {[1, 2, 3].map(i => (
            <div key={i} className="border-l-2 border-gray-200 pl-3 mb-3">
              <div className="h-4 bg-gray-200 rounded w-48 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-full mb-2"></div>
              <div className="h-6 bg-gray-200 rounded w-16"></div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className={`${embedded ? 'p-4' : 'bg-white rounded-lg p-4 border shadow-sm'}`}>
      <h3 className="h3 mb-2">Your Top 3 for the next 30 days</h3>
      <p className="text-sm text-gray-600 mb-4">Non-automatable, high-leverage actions</p>
      
      <div className="space-y-3 mb-4">
        {actions.slice(0, 3).map((action, index) => (
          <div key={action.id || index} className="border-l-2 border-gray-200 pl-4 relative">
            {/* Priority indicator dot */}
            <div className={`absolute -left-1.5 top-2 w-3 h-3 rounded-full border-2 border-white ${
              index === 0 ? 'bg-red-500' : index === 1 ? 'bg-yellow-500' : 'bg-green-500'
            }`}></div>
            
            <div className="flex items-start justify-between mb-2">
              <h4 className="text-sm font-medium text-gray-900 flex-1">
                {action.title}
              </h4>
              <div className="flex gap-1 ml-3 flex-shrink-0">
                <span className={`px-2 py-0.5 text-xs font-medium rounded ${getImpactColor(action.impact)}`}>
                  {action.impact}
                </span>
                <span className={`px-2 py-0.5 text-xs font-medium rounded flex items-center gap-1 ${getOwnerColor(action.suggestedOwner)}`}>
                  {getOwnerIcon(action.suggestedOwner)}
                  {action.suggestedOwner}
                </span>
              </div>
            </div>
            
            <p className="text-xs text-gray-600 mb-3 line-clamp-2">
              {action.rationale}
            </p>
            
            <div className="flex items-center gap-2">
              <button
                onClick={() => onActionClick?.(action)}
                className="px-3 py-1.5 bg-[#5F209B] text-white text-xs font-medium rounded-lg hover:opacity-90 transition-opacity flex items-center gap-1"
              >
                Do it
                <ArrowRight className="w-3 h-3" />
              </button>
              
              {/* Show links if available */}
              {action.links && action.links.length > 0 && (
                <button
                  onClick={() => window.open(action.links![0], '_blank')}
                  className="p-1.5 text-gray-400 hover:text-gray-600 transition-colors"
                  title="View resource"
                >
                  <ExternalLink className="w-3 h-3" />
                </button>
              )}
              
              {/* Effort indicator */}
              <span className="text-xs text-gray-500 ml-auto">
                {action.effort} effort
              </span>
            </div>
          </div>
        ))}
      </div>

      {actions.length === 0 && !isLoading && (
        <div className="text-center py-6">
          <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <ArrowRight className="w-6 h-6 text-gray-400" />
          </div>
          <p className="text-sm text-gray-600 mb-4">
            No actions ready. Run a health check first.
          </p>
        </div>
      )}

      <button 
        onClick={() => navigate('/analytics?tab=results')}
        className="text-sm text-gray-600 hover:text-[#5F209B] transition-colors font-medium"
      >
        View details →
      </button>
    </div>
  )
}