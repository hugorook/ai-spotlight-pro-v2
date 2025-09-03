import React from 'react'
import { useNavigate } from 'react-router-dom'
import AppShell from '@/components/layout/AppShell'
import { ArrowLeft, Award } from 'lucide-react'

export default function AuthorityAnalytics() {
  const navigate = useNavigate()

  return (
    <AppShell>
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button 
            onClick={() => navigate('/analytics')}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="h1">Authority</h1>
            <p className="body text-gray-600">Domain authority and trust metrics</p>
          </div>
        </div>

        {/* Content */}
        <div className="bg-white rounded-lg p-8 border text-center">
          <Award className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <h2 className="h3 mb-4">Authority Analysis</h2>
          <p className="body text-gray-600 mb-6">
            This section will display your domain authority metrics, trust signals, 
            and how AI models perceive your site's credibility and expertise.
          </p>
          <button 
            onClick={() => navigate('/settings/connections')}
            className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors"
          >
            Connect Your Site
          </button>
        </div>
      </div>
    </AppShell>
  )
}