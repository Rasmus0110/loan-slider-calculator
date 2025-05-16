
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

// Helper function for nearest available values - improved algorithm
const findNearestAvailableValues = (loanAmount: number, year: number): { loanAmount: number, year: number } | null => {
  // First try to find exact match
  if (resultsCache[`${loanAmount}-${year}`] !== undefined) {
    return { loanAmount, year };
  }
  
  // If cache is basically empty, we can't help
  if (Object.keys(resultsCache).length < 5) {
    return null;
  }
  
  // Get all unique years and amounts from cache
  const availableAmounts = new Set<number>();
  const availableYears = new Set<number>();
  
  Object.keys(resultsCache).forEach(key => {
    const [amount, yr] = key.split('-').map(Number);
    availableAmounts.add(amount);
    availableYears.add(yr);
  });
  
  // Convert sets to sorted arrays for easier searching
  const amountArray = Array.from(availableAmounts).sort((a, b) => a - b);
  const yearArray = Array.from(availableYears).sort((a, b) => a - b);
  
  // Find nearest year (this is important for years > 9)
  let nearestYear = year;
  if (!yearArray.includes(year)) {
    // Find the closest year value
    nearestYear = yearArray.reduce((prev, curr) => 
      Math.abs(curr - year) < Math.abs(prev - year) ? curr : prev
    );
  }
  
  // Find nearest loan amount for the nearest year
  let nearestAmount = loanAmount;
  if (!amountArray.includes(loanAmount)) {
    // Find the closest loan amount
    nearestAmount = amountArray.reduce((prev, curr) => 
      Math.abs(curr - loanAmount) < Math.abs(prev - loanAmount) ? curr : prev
    );
  }
  
  // Try with nearest year first (prioritize matching the year)
  const keyWithNearestYear = `${loanAmount}-${nearestYear}`;
  if (resultsCache[keyWithNearestYear] !== undefined) {
    console.log(`Using year-prioritized value for ${loanAmount}-${year}: ${loanAmount}-${nearestYear}`);
    return { loanAmount, year: nearestYear };
  }
  
  // Then try with nearest amount and nearest year
  const keyWithBothNearest = `${nearestAmount}-${nearestYear}`;
  if (resultsCache[keyWithBothNearest] !== undefined) {
    console.log(`Using fully approximated value for ${loanAmount}-${year}: ${nearestAmount}-${nearestYear}`);
    return { loanAmount: nearestAmount, year: nearestYear };
  }
  
  // If we get here, we need to find the best available combination
  // Sort all cache keys by combined distance to target values
  const allCombinations = Object.keys(resultsCache).map(key => {
    const [amount, yr] = key.split('-').map(Number);
    // Calculate weighted distance - year distance is more important
    const yearDistance = Math.abs(yr - year) * 2; // Weight year distance more
    const amountDistance = Math.abs(amount - loanAmount) / 1000; // Normalize amount distance
    return {
      key,
      amount,
      yr,
      distance: yearDistance + amountDistance
    };
  }).sort((a, b) => a.distance - b.distance);
  
  if (allCombinations.length > 0) {
    const best = allCombinations[0];
    console.log(`Using best available value for ${loanAmount}-${year}: ${best.amount}-${best.yr}`);
    return { loanAmount: best.amount, year: best.yr };
  }
  
  return null;
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
