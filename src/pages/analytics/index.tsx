import React from 'react'
import { useNavigate } from 'react-router-dom'
import AppShell from '@/components/layout/AppShell'
import { ArrowLeft } from 'lucide-react'

export default function Analytics() {
  const navigate = useNavigate()

  return (
    <AppShell>
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button 
            onClick={() => navigate('/dashboard')}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            title="Back to dashboard"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="h1">Analytics</h1>
            <p className="body text-gray-600">Detailed insights and performance data</p>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex space-x-1 mb-6 border-b border-gray-200">
          <button 
            onClick={() => navigate('/analytics/health-check')}
            className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 border-b-2 border-transparent hover:border-purple-500 transition-colors"
          >
            Health Check
          </button>
          <button 
            onClick={() => navigate('/analytics/prompts')}
            className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 border-b-2 border-transparent hover:border-purple-500 transition-colors"
          >
            Test Prompts
          </button>
          <button 
            onClick={() => navigate('/analytics/recommendations')}
            className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 border-b-2 border-transparent hover:border-purple-500 transition-colors"
          >
            Recommendations
          </button>
          <button 
            onClick={() => navigate('/analytics/benchmark')}
            className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 border-b-2 border-transparent hover:border-purple-500 transition-colors"
          >
            Benchmarking
          </button>
          <button 
            onClick={() => navigate('/analytics/authority')}
            className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 border-b-2 border-transparent hover:border-purple-500 transition-colors"
          >
            Authority
          </button>
          <button 
            onClick={() => navigate('/analytics/trending')}
            className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 border-b-2 border-transparent hover:border-purple-500 transition-colors"
          >
            Trending
          </button>
        </div>

        {/* Default Content */}
        <div className="bg-white rounded-lg p-6 border text-center">
          <h2 className="h3 mb-4">Choose an Analytics Section</h2>
          <p className="body text-gray-600 mb-6">
            Select a tab above to view detailed analytics and insights for different aspects of your AI visibility.
          </p>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="p-4 border rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
                 onClick={() => navigate('/analytics/health-check')}>
              <h3 className="font-medium mb-2">Health Check</h3>
              <p className="text-sm text-gray-600">Technical SEO and site health analysis</p>
            </div>
            
            <div className="p-4 border rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
                 onClick={() => navigate('/analytics/prompts')}>
              <h3 className="font-medium mb-2">Test Prompts</h3>
              <p className="text-sm text-gray-600">AI model response testing and rankings</p>
            </div>
            
            <div className="p-4 border rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
                 onClick={() => navigate('/analytics/recommendations')}>
              <h3 className="font-medium mb-2">Recommendations</h3>
              <p className="text-sm text-gray-600">Actionable improvement suggestions</p>
            </div>
            
            <div className="p-4 border rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
                 onClick={() => navigate('/analytics/benchmark')}>
              <h3 className="font-medium mb-2">Benchmarking</h3>
              <p className="text-sm text-gray-600">Competitor analysis and market position</p>
            </div>
            
            <div className="p-4 border rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
                 onClick={() => navigate('/analytics/authority')}>
              <h3 className="font-medium mb-2">Authority</h3>
              <p className="text-sm text-gray-600">Domain authority and trust metrics</p>
            </div>
            
            <div className="p-4 border rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
                 onClick={() => navigate('/analytics/trending')}>
              <h3 className="font-medium mb-2">Trending</h3>
              <p className="text-sm text-gray-600">Trending topics and opportunities</p>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  )
}