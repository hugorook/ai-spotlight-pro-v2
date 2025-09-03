import React from 'react'
import { useNavigate } from 'react-router-dom'
import AppShell from '@/components/layout/AppShell'
import { ArrowLeft, TrendingUp } from 'lucide-react'

export default function PromptsAnalytics() {
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
            <h1 className="h1">Test Prompts</h1>
            <p className="body text-gray-600">AI model response testing and rankings</p>
          </div>
        </div>

        {/* Content */}
        <div className="bg-white rounded-lg p-8 border text-center">
          <TrendingUp className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <h2 className="h3 mb-4">Test Prompts Analytics</h2>
          <p className="body text-gray-600 mb-6">
            This page will show detailed prompt testing results, AI model comparisons, and ranking analysis. 
            Integration with the existing test prompts functionality is in progress.
          </p>
          <button 
            onClick={() => navigate('/analytics/health-check')}
            className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors"
          >
            Run Health Check to Generate Data
          </button>
        </div>
      </div>
    </AppShell>
  )
}