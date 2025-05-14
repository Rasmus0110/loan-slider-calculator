
// Supabase connection details
const SUPABASE_URL = "https://djrtvqonifwgatjqilqx.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRqcnR2cW9uaWZ3Z2F0anFpbHF4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDI2MjgwMDQsImV4cCI6MjA1ODIwNDAwNH0.lgSsfkeMNByChNVOL1vwCDHvV_yKdA6VX72nmiD8Dik";
const TABLE_NAME = "API_to_retrieve_loan_cost";

// Cache for storing already fetched results
const resultsCache: Record<string, number> = {};

// Prefetch all data from the table for caching
export const prefetchLoanData = async (): Promise<void> => {
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/${encodeURIComponent(TABLE_NAME)}?select=*`, {
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        "Content-Type": "application/json",
        Prefer: "return=representation"
      }
    });

    if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
    
    const data = await response.json();
    
    if (!Array.isArray(data)) return;
    
    data.forEach((item: any) => {
      if (item["Loan amount"] && item["Year"] && item["Monthly cost"]) {
        const key = `${item["Loan amount"]}-${item["Year"]}`;
        resultsCache[key] = item["Monthly cost"];
      }
    });
    
    console.log("Prefetched loan data successfully");
  } catch (error) {
    console.error("Error prefetching loan data:", error);
  }
};

// Get monthly cost for specific loan amount and year
export const getMonthlyCost = async (loanAmount: number, year: number): Promise<number | null> => {
  // Check cache first
  const cacheKey = `${loanAmount}-${year}`;
  if (resultsCache[cacheKey] !== undefined) {
    return resultsCache[cacheKey];
  }
  
  // Fetch from API if not in cache
  try {
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/${encodeURIComponent(TABLE_NAME)}?select=*&Loan%20amount=eq.${loanAmount}&Year=eq.${year}`,
      {
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`,
          "Content-Type": "application/json",
          Prefer: "return=representation"
        }
      }
    );

    if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
    
    const data = await response.json();
    
    if (data.length && data[0]["Monthly cost"] !== undefined) {
      const cost = Math.round(data[0]["Monthly cost"]);
      resultsCache[cacheKey] = cost;
      return cost;
    }
    
    return null;
  } catch (error) {
    console.error("Error fetching monthly cost:", error);
    return null;
  }
};
