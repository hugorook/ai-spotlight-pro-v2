import React from 'react'
import { useRouter } from 'next/router'
import AppShell from '@/components/layout/AppShell'
import { ArrowLeft, FileText } from 'lucide-react'

export default function RecommendationsAnalytics() {
  const router = useRouter()

  return (
    <AppShell>
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button 
            onClick={() => router.push('/analytics')}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="h1">Recommendations</h1>
            <p className="body text-gray-600">Actionable improvement suggestions</p>
          </div>
        </div>

        {/* Content */}
        <div className="bg-white rounded-lg p-8 border text-center">
          <FileText className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <h2 className="h3 mb-4">Detailed Recommendations</h2>
          <p className="body text-gray-600 mb-6">
            This page will show comprehensive recommendations, priority analysis, and implementation guides. 
            The dashboard shows your top 3 actions, while this page provides the full list with detailed insights.
          </p>
          <button 
            onClick={() => router.push('/dashboard')}
            className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors"
          >
            View Top 3 Actions
          </button>
        </div>
      </div>
    </AppShell>
  )
}