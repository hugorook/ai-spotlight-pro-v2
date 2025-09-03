import React from 'react'
import { ExternalLink, TrendingUp } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

interface Win {
  id: string
  prompt: string
  rank: number
  url: string
  lastSeen: string
}

interface WinsCardProps {
  wins: Win[]
  isLoading?: boolean
  onRefresh?: () => void
}

export function WinsCard({ wins, isLoading = false, onRefresh }: WinsCardProps) {
  const navigate = useNavigate()

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg p-4 border">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-48 mb-3"></div>
          <div className="space-y-2">
            {[1, 2, 3].map(i => (
              <div key={i} className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-1"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </div>
                <div className="w-8 h-6 bg-gray-200 rounded ml-2"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg p-3 border">
      <div className="flex items-center justify-between mb-2">
        <h3 className="h3">Where you're winning</h3>
        {wins.length > 0 && (
          <div className="flex items-center gap-1 text-green-600">
            <TrendingUp className="w-4 h-4" />
            <span className="text-xs font-medium">{wins.length} live</span>
          </div>
        )}
      </div>
      
      {wins.length === 0 ? (
        <div className="text-center py-6">
          <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <TrendingUp className="w-6 h-6 text-gray-400" />
          </div>
          <p className="text-sm text-gray-600 mb-3">
            No wins yet
          </p>
          <button
            onClick={onRefresh}
            className="px-4 py-2 bg-[#5F209B] text-white rounded-md text-sm hover:opacity-90 transition-opacity"
          >
            Run health check
          </button>
        </div>
      ) : (
        <>
          <div className="space-y-2 mb-3">
            {wins.slice(0, 8).map((win, index) => (
              <div key={win.id} className="group">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900 line-clamp-1">
                      "{win.prompt}"
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-gray-500 truncate">
                        {new URL(win.url).pathname}
                      </span>
                      <span className="text-xs text-gray-400">
                        · {new Date(win.lastSeen).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 ml-3 flex-shrink-0">
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-gray-500">Rank</span>
                      <span className={`px-2 py-0.5 text-xs font-medium rounded ${
                        win.rank <= 3 
                          ? 'bg-green-100 text-green-800' 
                          : win.rank <= 10 
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        #{win.rank}
                      </span>
                    </div>
                    
                    {/* Hover to reveal URL */}
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => window.open(win.url, '_blank')}
                        className="p-1 text-gray-400 hover:text-gray-600"
                        title={`View: ${win.url}`}
                      >
                        <ExternalLink className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          {wins.length > 8 && (
            <div className="text-xs text-gray-500 text-center mb-2">
              +{wins.length - 8} more wins
            </div>
          )}
        </>
      )}

      <button 
        onClick={() => navigate('/analytics?tab=results')}
        className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
      >
        View all wins →
      </button>
    </div>
  )
}