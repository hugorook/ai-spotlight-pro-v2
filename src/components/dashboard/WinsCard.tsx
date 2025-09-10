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
  embedded?: boolean
}

export function WinsCard({ wins, isLoading = false, onRefresh, embedded = false }: WinsCardProps) {
  const navigate = useNavigate()

  if (isLoading) {
    return (
      <div className={`${embedded ? 'p-4' : 'bg-white rounded-lg p-4 border shadow-sm'}`}>
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
    <div className={`${embedded ? 'pl-0 pr-4 py-0' : 'bg-white rounded-lg p-4 border shadow-sm'}`}>
      {!embedded && (
        <div className="flex items-center justify-between mb-3">
          <h3 className="h3">Where you're winning</h3>
          {(wins || []).length > 0 && (
            <div className="flex items-center gap-1 text-green-600">
              <TrendingUp className="w-4 h-4" />
              <span className="text-xs font-medium">{(wins || []).length} live</span>
            </div>
          )}
        </div>
      )}
      
      {(wins || []).length === 0 ? (
        <div className="text-center py-6">
          <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <TrendingUp className="w-6 h-6 text-gray-400" />
          </div>
          <p className="text-sm text-gray-600 mb-3">
            No wins yet
          </p>
          <button
            onClick={onRefresh}
            className="px-4 py-2 bg-[#5F209B] text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
          >
            Run health check
          </button>
        </div>
      ) : (
        <>
          <div className="mb-4">
            {(wins || []).slice(0, 8).map((win, index) => (
              <div key={win.id} className="relative mb-3 last:mb-0">
                <div className="flex items-start">
                  <span className="text-[#3d3d38] flex-shrink-0 mr-3" style={{lineHeight: '1.4em', marginTop: '0.1em'}}>•</span>
                  <div className="flex-1 pr-20">
                    <p className="text-[14px] text-[#3d3d38] leading-[1.5] break-words">
                      {win.prompt}
                    </p>
                  </div>
                </div>
                <div className="absolute right-0 top-0 flex gap-1 flex-shrink-0">
                  <span className="px-2 py-1 text-[11px] font-medium rounded bg-[#282823] text-white">
                    #{win.rank}
                  </span>
                </div>
              </div>
            ))}
          </div>
          
          {(wins || []).length > 8 && (
            <div className="text-[12px] text-[#3d3d38] text-center mb-3">
              +{(wins || []).length - 8} more
            </div>
          )}
        </>
      )}

      {!embedded && (
        <button 
          onClick={() => navigate('/analytics?tab=results')}
          className="text-sm text-gray-600 hover:text-[#5F209B] transition-colors font-medium"
        >
          View all wins →
        </button>
      )}
    </div>
  )
}