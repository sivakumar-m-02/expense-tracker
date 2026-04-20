import axios from 'axios';

const API_KEY = 'AIzaSyCVC9rwPG62I_YTd8Tp5B3HcOYodTIWbcU';

export const getAIParsedExpense = async (text) => {
  console.log("text2--->", API_KEY);
  try {
    const prompt = `
      You are a smart expense parser for a mobile app.
      
      Extract structured data from this text:
      "${text}"
      
      Return ONLY JSON:
      
      {
        "amount": number,
        "category": string,
        "subcategory": string | null,
        "note": string,
        "confidence": number (0 to 1)
      }
      
      Rules:
      
      1. Categories:
      Food, Petrol, Travel, Shopping, Bills, Other
      
      2. Smart understanding:
      - "tea", "coffee", "swiggy", "zomato" → Food
      - "uber", "ola", "bus", "train" → Travel
      - "electricity", "wifi", "rent" → Bills
      - "amazon", "clothes" → Shopping
      
      3. Subcategories:
      Food → Breakfast, Lunch, Dinner, Snacks, Drinks
      Petrol → Bike, Car, Other
      
      4. If unsure:
      - category = "Other"
      - confidence < 0.6
      
      5. Extract amount even if written like:
      - "₹200"
      - "200rs"
      - "spent 200"
      
      6. Note:
      - Short meaningful phrase (max 3 words)
      
      Return ONLY JSON. No explanation.
      `;

    const res = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${API_KEY}`,
      {
        contents: [
          {
            parts: [{ text: prompt }],
          },
        ],
      }
    );

    const output =
      res.data.candidates[0].content.parts[0].text;

    console.log("output--->", output);

    const jsonMatch = output.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }

    return null;
  } catch (error) {
    console.log('AI Parse Error:', error?.response?.data || error);
    return null;
  }
};


// ─── Monthly Summary ───────────────────────────────────────────────────────────
/**
 * @param {Object} params
 * @param {Array}  params.currentMonthExpenses  - raw expense docs for current month
 * @param {Array}  params.previousMonthExpenses - raw expense docs for previous month
 * @param {string} params.currentMonthLabel     - e.g. "June 2025"
 * @param {string} params.previousMonthLabel    - e.g. "May 2025"
 *
 * Each expense doc shape: { amount, category, subcategory, note, date }
 *
 * Returns a JSON string with shape:
 * {
 *   totalSpent: number,
 *   topCategory: string,
 *   topCategoryAmount: number,
 *   vsLastMonth: string,        // "+12%" / "-8%" / "same"
 *   peakDay: string,            // "Mon 9th"
 *   peakDayAmount: number,
 *   quietDay: string,
 *   quietDayAmount: number,
 *   categoryBreakdown: [{ category, amount, percent }],
 *   dailyPattern: string,       // 1-sentence description
 *   suggestion: string,         // 1 actionable tip
 *   headline: string,           // 6-word max punchy headline
 * }
 */
export const getAIMonthlySummary = async ({
  currentMonthExpenses = [],
  previousMonthExpenses = [],
  currentMonthLabel = 'This Month',
  previousMonthLabel = 'Last Month',
}) => {
  try {
    // ── Pre-process on the client to give AI clean, compact data ──────────────

    const toJSDate = (d) => {
      if (!d) return null;
      if (d?.seconds) return new Date(d.seconds * 1000);
      if (d instanceof Date) return d;
      return new Date(d);
    };

    // Category totals for current month
    const catTotals = {};
    const dayTotals = {}; // { "Mon 1": amount }

    currentMonthExpenses.forEach((e) => {
      const amt = Number(e.amount) || 0;
      const cat = e.category || 'Other';
      catTotals[cat] = (catTotals[cat] || 0) + amt;

      const d = toJSDate(e.date);
      if (d) {
        const label = d.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric' });
        dayTotals[label] = (dayTotals[label] || 0) + amt;
      }
    });

    const currentTotal = Object.values(catTotals).reduce((s, v) => s + v, 0);
    const previousTotal = previousMonthExpenses.reduce((s, e) => s + (Number(e.amount) || 0), 0);

    // Category breakdown (sorted, with percent)
    const categoryBreakdown = Object.entries(catTotals)
      .map(([category, amount]) => ({
        category,
        amount: Math.round(amount),
        percent: currentTotal > 0 ? Math.round((amount / currentTotal) * 100) : 0,
      }))
      .sort((a, b) => b.amount - a.amount);

    // Peak & quiet day
    const dayEntries = Object.entries(dayTotals);
    const peakEntry = dayEntries.sort((a, b) => b[1] - a[1])[0];
    const quietEntry = dayEntries.sort((a, b) => a[1] - b[1])[0];

    // Previous month category breakdown (for comparison)
    const prevCatTotals = {};
    previousMonthExpenses.forEach((e) => {
      const cat = e.category || 'Other';
      prevCatTotals[cat] = (prevCatTotals[cat] || 0) + (Number(e.amount) || 0);
    });

    const prompt = `
You are a personal finance analyst. Analyze the following pre-processed expense data and return ONLY a JSON object — no markdown, no explanation.

=== ${currentMonthLabel} (Current) ===
Total Spent: ₹${Math.round(currentTotal)}
Category Breakdown: ${JSON.stringify(categoryBreakdown)}
Day-wise totals (sample): ${JSON.stringify(
      Object.entries(dayTotals)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
    )}

=== ${previousMonthLabel} (Previous) ===
Total Spent: ₹${Math.round(previousTotal)}
Category Breakdown: ${JSON.stringify(
      Object.entries(prevCatTotals).map(([category, amount]) => ({ category, amount: Math.round(amount) }))
    )}

=== Your Task ===
Return ONLY a VALID JSON object with ALL fields present.

{
  "headline": "string",
  "totalSpent": number,
  "topCategory": "string",
  "topCategoryAmount": number,
  "topCategoryPercent": number,
  "vsLastMonth": "string",
  "vsLastMonthLabel": "string",
  "peakDay": "${peakEntry ? peakEntry[0] : 'N/A'}",
  "peakDayAmount": ${peakEntry ? Math.round(peakEntry[1]) : 0},
  "quietDay": "${quietEntry && quietEntry[0] !== (peakEntry && peakEntry[0]) ? quietEntry[0] : 'N/A'}",
  "quietDayAmount": ${quietEntry ? Math.round(quietEntry[1]) : 0},
  "categoryBreakdown": ${JSON.stringify(categoryBreakdown)},
  "dailyPattern": "string",
  "personalityInsight": "string",
  "riskLevel": "Low | Medium | High",
  "moneyLeak": "string (specific pattern)",
  "suggestion": "string",
  "improvementTip": "string"
}

Rules:
- Do NOT skip any field
- Do NOT rename fields
- Use ₹ symbol in text fields
- riskLevel logic:
  If top category > 40% OR spending increased → High
  If moderate → Medium
  Otherwise → Low
- moneyLeak must mention a clear pattern (not generic)
- Keep suggestion practical and specific
- headline should feel personal
`;

    const res = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${API_KEY}`,
      { contents: [{ parts: [{ text: prompt }] }] }
    );

    const raw = res.data.candidates[0].content.parts[0].text;
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (jsonMatch) return JSON.parse(jsonMatch[0]);
    return null;
  } catch (error) {
    console.log('AI Summary Error:', error?.response?.data || error);
    return null;
  }
};
