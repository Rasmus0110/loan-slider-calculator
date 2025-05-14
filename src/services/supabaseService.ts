
// Supabase connection details
const SUPABASE_URL = "https://djrtvqonifwgatjqilqx.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRqcnR2cW9uaWZ3Z2F0anFpbHF4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDI2MjgwMDQsImV4cCI6MjA1ODIwNDAwNH0.lgSsfkeMNByChNVOL1vwCDHvV_yKdA6VX72nmiD8Dik";
const TABLE_NAME = "API_to_retrieve_loan_cost";

// Cache for storing already fetched results
const resultsCache: Record<string, number> = {};
let isPrefetchComplete = false;

// Prefetch all data from the table for caching
export const prefetchLoanData = async (): Promise<void> => {
  if (isPrefetchComplete) {
    return; // Don't prefetch again if already done
  }
  
  try {
    console.log("Starting to prefetch loan data...");
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
    
    if (!Array.isArray(data)) {
      console.warn("Expected array data from API, but got:", typeof data);
      return;
    }
    
    // Populate cache with all available data points
    data.forEach((item: any) => {
      if (item["Loan amount"] && item["Year"] && item["Monthly cost"]) {
        const key = `${item["Loan amount"]}-${item["Year"]}`;
        resultsCache[key] = Math.round(item["Monthly cost"]);
      }
    });
    
    isPrefetchComplete = true;
    console.log("Prefetched loan data successfully, cached", Object.keys(resultsCache).length, "items");
  } catch (error) {
    console.error("Error prefetching loan data:", error);
    // Don't set isPrefetchComplete to true if there's an error,
    // allowing retry on next call
  }
};

// Helper function for nearest available values
const findNearestAvailableValues = (loanAmount: number, year: number): { loanAmount: number, year: number } | null => {
  // First try to find exact match
  if (resultsCache[`${loanAmount}-${year}`] !== undefined) {
    return { loanAmount, year };
  }
  
  // If cache is basically empty, we can't help
  if (Object.keys(resultsCache).length < 5) {
    return null;
  }
  
  // Get all available loan amounts and years from cache
  const availableValues = Object.keys(resultsCache).map(key => {
    const [amount, yr] = key.split('-').map(Number);
    return { amount, yr };
  });
  
  // Find nearest loan amount with same year
  const sameYearItems = availableValues.filter(item => item.yr === year);
  if (sameYearItems.length > 0) {
    sameYearItems.sort((a, b) => Math.abs(a.amount - loanAmount) - Math.abs(b.amount - loanAmount));
    return { loanAmount: sameYearItems[0].amount, year };
  }
  
  // Find nearest combination
  availableValues.sort((a, b) => {
    const distA = Math.abs(a.amount - loanAmount) + Math.abs(a.yr - year);
    const distB = Math.abs(b.amount - loanAmount) + Math.abs(b.yr - year);
    return distA - distB;
  });
  
  return availableValues.length > 0 ? 
    { loanAmount: availableValues[0].amount, year: availableValues[0].yr } : 
    null;
};

// Get monthly cost for specific loan amount and year
export const getMonthlyCost = async (loanAmount: number, year: number): Promise<number | null> => {
  // Check cache first for exact match
  const cacheKey = `${loanAmount}-${year}`;
  if (resultsCache[cacheKey] !== undefined) {
    return resultsCache[cacheKey];
  }
  
  // If we have a well-populated cache but no exact match, use nearest available value
  if (Object.keys(resultsCache).length > 20) {
    const nearest = findNearestAvailableValues(loanAmount, year);
    if (nearest) {
      const nearestKey = `${nearest.loanAmount}-${nearest.year}`;
      if (resultsCache[nearestKey] !== undefined) {
        console.log(`Using approximate value for ${loanAmount}-${year} from cache: ${nearest.loanAmount}-${nearest.year}`);
        return resultsCache[nearestKey];
      }
    }
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
