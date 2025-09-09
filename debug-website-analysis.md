# Website Analysis Flow Debug Report

## Flow Analysis

### 1. **Website URL Collection**
- **Source 1**: `generated_prompts` table - `website_url` field (preferred)
- **Source 2**: `companies` table - `website_url` field (fallback)
- **Current Logic**: Lines 162-176 in HealthCheckContext.tsx

### 2. **Edge Function Invocation**
- **Function**: `analyze-website` 
- **Location**: HealthCheckContext.tsx lines 178-199
- **Payload**: `{ url: websiteUrl }`
- **URL Processing**: Prepends `https://` if not already present

### 3. **Data Storage**
- **Table**: `analytics_data`
- **Fields**:
  - `user_id`
  - `health_check_session_id`
  - `analytics_type`: 'website_analysis'
  - `data`: JSON result from Edge function

### 4. **Data Loading**
- **Location**: analytics/index.tsx lines 160-206
- **Query**: Fetches from `analytics_data` where `analytics_type = 'website_analysis'`
- **State**: Sets `websiteAnalysis` state variable

### 5. **Display**
- **Component**: ResultsSection (results-section.tsx)
- **Tab**: 'website'
- **Data Path**: `websiteAnalysis.analysis`

## Potential Issues Found

### Issue 1: Edge Function Error Handling
The Edge function might be failing silently. In HealthCheckContext.tsx line 198, errors are caught but only logged to console:
```javascript
}).catch(error => console.error('Website analysis failed:', error))
```

### Issue 2: URL Format
The website URL might be malformed or empty. Check:
1. Is `website_url` populated in `generated_prompts` table?
2. Is the URL valid (has protocol, domain)?

### Issue 3: Edge Function Response
The Edge function might be returning an error response with status 500, which would include:
```json
{
  "content": "",
  "analysis": {
    "contentSummary": "Analysis failed",
    "aiOptimizationOpportunities": [],
    "keyTopics": [],
    "contentGaps": [],
    "recommendations": []
  },
  "error": "error message"
}
```

### Issue 4: Timing Issue
The analytics page might be loading before the website analysis completes, as it's done asynchronously with `.catch()`.

## Debugging Steps

1. **Check Database**:
   ```sql
   -- Check if website_url exists in generated_prompts
   SELECT website_url, company_data FROM generated_prompts 
   WHERE user_id = 'YOUR_USER_ID' 
   ORDER BY generated_at DESC LIMIT 1;
   
   -- Check if website analysis data was saved
   SELECT * FROM analytics_data 
   WHERE user_id = 'YOUR_USER_ID' 
   AND analytics_type = 'website_analysis'
   ORDER BY created_at DESC LIMIT 1;
   ```

2. **Add Console Logging**:
   - Add logs before and after Edge function call
   - Log the exact URL being passed
   - Log the full response/error from Edge function

3. **Check Edge Function Logs**:
   ```bash
   supabase functions logs analyze-website
   ```

4. **Test Edge Function Directly**:
   ```bash
   curl -X POST https://your-project.supabase.co/functions/v1/analyze-website \
     -H "Authorization: Bearer YOUR_ANON_KEY" \
     -H "Content-Type: application/json" \
     -d '{"url": "https://example.com"}'
   ```

## Recommended Fixes

1. **Better Error Handling**: Don't swallow errors in the catch block
2. **Await Analytics Generation**: Consider making analytics generation synchronous or adding a loading state
3. **Validate URLs**: Add URL validation before calling Edge function
4. **Add Retry Logic**: If Edge function fails, retry with exponential backoff
5. **User Feedback**: Show loading/error states for website analysis in UI