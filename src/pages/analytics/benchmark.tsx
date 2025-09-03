import React from 'react'
import { useRouter } from 'next/router'
import AppShell from '@/components/layout/AppShell'
import { ArrowLeft, Activity } from 'lucide-react'

export default function BenchmarkAnalytics() {
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
            <h1 className="h1">Benchmarking</h1>
            <p className="body text-gray-600">Competitor analysis and market position</p>
          </div>
        </div>

        {/* Content */}
        <div className="bg-white rounded-lg p-8 border text-center">
          <Activity className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <h2 className="h3 mb-4">Competitive Benchmarking</h2>
          <p className="body text-gray-600 mb-6">
            This section will show how your AI visibility compares to competitors, 
            market share analysis, and competitive intelligence insights.
          </p>
          <button 
            onClick={() => router.push('/analytics/health-check')}
            className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors"
          >
            Run Health Check First
          </button>
        </div>
      </div>
    </AppShell>
  )
}