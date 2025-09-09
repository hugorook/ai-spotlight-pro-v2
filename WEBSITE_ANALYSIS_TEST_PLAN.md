# Website Analysis Feature Test Plan

## Test Results Summary ✅

### Backend Components - All Working ✅
- **Edge Function**: `analyze-website` is working correctly
- **Data Structure**: Compatible with UI requirements
- **Database Schema**: Proper tables exist (`analytics_data`, `health_check_sessions`, `generated_prompts`)

### Manual Testing Required
Since the backend is fully functional, the remaining tests need to be done through the UI.

## Step-by-Step Manual Test

### 1. Access the Application
- ✅ Dev server is running at http://localhost:8080/
- Navigate to the application

### 2. Create User Account (if needed)
- Sign up or log in to create an authenticated user session
- This is required for database operations due to RLS policies

### 3. Test Company Setup Flow
1. Navigate to the main page (likely shows company setup form)
2. Fill in company details including **website URL** (use `https://example.com` for testing)
3. Submit the form - this should:
   - Save company data
   - Generate prompts
   - Store data in `generated_prompts` table

### 4. Run Health Check
1. Click "Run Health Check" button
2. Monitor the console logs for website analysis debug messages:
   ```
   🌐 WEBSITE ANALYSIS DEBUG: Analyzing website URL: https://example.com
   🌐 WEBSITE ANALYSIS DEBUG: Edge function response: {...}
   🌐 WEBSITE ANALYSIS DEBUG: Saving successful analysis
   ```
3. Wait for health check to complete

### 5. Verify Database Saving
After health check completion, you should be able to verify:
- `health_check_sessions` table has a new record with the website URL
- `analytics_data` table has a new record with `analytics_type = 'website_analysis'`

### 6. Test Analytics Page
1. Navigate to `/analytics` or click Analytics from the main page
2. Check the "Website Analysis" tab
3. Verify that the website analysis data is displayed:
   - Content Summary section
   - Key Topics (as purple pills)
   - AI Optimization Opportunities (bulleted list)
   - Content Gaps (bulleted list with red dots)
   - Recommendations (bulleted list with green dots)
   - Analysis timestamp

### 7. Test Results Section Component
The results section should show:
- Website analysis data in proper format
- Collapsible sections
- Export functionality
- Proper styling and layout

## Expected Data Structure

When working correctly, the `analytics_data` table should contain records like:
```json
{
  "analytics_type": "website_analysis",
  "data": {
    "content": "Website text content...",
    "analysis": {
      "contentSummary": "Brief summary...",
      "aiOptimizationOpportunities": ["opportunity 1", "opportunity 2"],
      "keyTopics": ["topic 1", "topic 2"],
      "contentGaps": ["gap 1", "gap 2"],
      "recommendations": ["rec 1", "rec 2"]
    },
    "fetchedAt": "2025-09-09T10:10:32.000Z"
  }
}
```

## Troubleshooting

### If Website Analysis Doesn't Show:
1. Check browser console for errors
2. Verify user is authenticated
3. Check that website URL was provided during company setup
4. Look for database RLS policy issues

### If Database Not Saving:
1. Ensure user is properly authenticated
2. Check that health check session was created successfully
3. Verify RLS policies allow user to write to `analytics_data`

### If UI Not Rendering:
1. Check that `websiteAnalysis` prop is being passed to `ResultsSection`
2. Verify the data structure matches expected format
3. Look for JavaScript errors in browser console

## Test URLs

Safe test URLs to use:
- `https://example.com` - Simple, fast loading
- `https://github.com` - More complex content
- `https://stackoverflow.com` - Rich content for analysis

## Success Criteria

✅ **Backend Working**: All Edge functions and data structures verified
⏳ **Frontend Integration**: Needs manual testing
⏳ **End-to-End Flow**: User can complete full flow and see results
⏳ **UI Components**: Website analysis displays correctly in analytics page