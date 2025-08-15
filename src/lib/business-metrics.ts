// Utility functions to translate technical metrics to business-friendly language

export interface VisibilityInsight {
  score: number;
  label: string;
  description: string;
  businessImpact: string;
  recommendation: string;
  color: 'red' | 'yellow' | 'green';
}

export const getVisibilityInsight = (mentionRate: number, avgPosition?: number): VisibilityInsight => {
  // Calculate composite score considering both mention rate and position
  const positionScore = avgPosition ? Math.max(0, (10 - avgPosition) / 10) : 0.5;
  const compositeScore = Math.round((mentionRate * 0.7 + positionScore * 0.3) * 100);

  if (compositeScore >= 75) {
    return {
      score: compositeScore,
      label: "Excellent AI Visibility",
      description: "Your company is frequently mentioned by AI models",
      businessImpact: "High likelihood of AI-driven referrals and brand recognition",
      recommendation: "Focus on maintaining this strong position across all AI models",
      color: "green"
    };
  } else if (compositeScore >= 50) {
    return {
      score: compositeScore,
      label: "Good AI Visibility", 
      description: "Your company appears in many AI responses",
      businessImpact: "Moderate AI-driven awareness, room for growth",
      recommendation: "Optimize content to improve mention frequency and ranking",
      color: "yellow"
    };
  } else if (compositeScore >= 25) {
    return {
      score: compositeScore,
      label: "Limited AI Visibility",
      description: "Your company is occasionally mentioned by AI models",
      businessImpact: "Missing opportunities for AI-driven discovery",
      recommendation: "Create content targeting your industry's common AI queries",
      color: "yellow"
    };
  } else {
    return {
      score: compositeScore,
      label: "Low AI Visibility",
      description: "Your company is rarely mentioned by AI models", 
      businessImpact: "Significant risk of being overlooked in AI recommendations",
      recommendation: "Urgent: Implement comprehensive AI visibility strategy",
      color: "red"
    };
  }
};

export const getPositionInsight = (position: number): string => {
  if (position === 1) return "Top recommendation 🥇";
  if (position <= 3) return `Top ${position} recommendation 🏅`;
  if (position <= 5) return `Among top 5 options`;
  if (position <= 10) return `Listed in top 10`;
  return `Mentioned further down the list`;
};

export const getSentimentInsight = (sentiment: string): { label: string, color: string, impact: string } => {
  switch (sentiment.toLowerCase()) {
    case 'positive':
      return {
        label: "Positive mention ✨",
        color: "text-green-600",
        impact: "AI models speak favorably about your company"
      };
    case 'negative':  
      return {
        label: "Critical mention ⚠️",
        color: "text-red-600",
        impact: "Review and address concerns mentioned by AI models"
      };
    default:
      return {
        label: "Neutral mention 📝", 
        color: "text-gray-600",
        impact: "Basic factual mention without opinion"
      };
  }
};

export const getCompetitiveInsight = (yourScore: number, industryAverage?: number): string => {
  if (!industryAverage) return "";
  
  const difference = yourScore - industryAverage;
  if (difference >= 20) return `Significantly outperforming industry average (${industryAverage}%)`;
  if (difference >= 10) return `Above industry average (${industryAverage}%)`;  
  if (difference >= -10) return `Close to industry average (${industryAverage}%)`;
  return `Below industry average (${industryAverage}%) - opportunity for improvement`;
};

export const getHealthScoreGrade = (score: number): { grade: string, gpa: string } => {
  if (score >= 90) return { grade: "A+", gpa: "4.0" };
  if (score >= 85) return { grade: "A", gpa: "3.8" };
  if (score >= 80) return { grade: "A-", gpa: "3.5" };
  if (score >= 75) return { grade: "B+", gpa: "3.2" };
  if (score >= 70) return { grade: "B", gpa: "3.0" };
  if (score >= 65) return { grade: "B-", gpa: "2.8" };
  if (score >= 60) return { grade: "C+", gpa: "2.5" };
  if (score >= 55) return { grade: "C", gpa: "2.2" };
  if (score >= 50) return { grade: "C-", gpa: "2.0" };
  if (score >= 45) return { grade: "D+", gpa: "1.5" };
  if (score >= 40) return { grade: "D", gpa: "1.2" };
  return { grade: "F", gpa: "0.0" };
};