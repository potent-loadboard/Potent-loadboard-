// POTENT Load Score — rate-per-mile rating shown on every listing.
// Thresholds are a starting point; tune them once you have real data
// on what operators in your area actually consider worthwhile.
export function scoreFor(rate) {
  if (rate >= 3.25) {
    return {
      label: 'STRONG',
      color: '#0a7d1f',
      note: 'Now this is a business move. The numbers hold up.',
    }
  }
  if (rate >= 2.1) {
    return {
      label: 'REVIEW',
      color: '#8a6d00',
      note: 'Not terrible. Not amazing. Run your costs before accepting.',
    }
  }
  return {
    label: 'KICK ROCKS',
    color: '#a30000',
    note: "Trucks don't run on promises. Fuel, insurance, and time cost money.",
  }
}

// Rough fuel cost estimate. mpg varies by vehicle type — good enough
// for a directional estimate, not a precise operating-cost tool.
export function estimateFuelCost(miles, vehicle, fuelPricePerGallon = 3.6) {
  const mpgByVehicle = {
    'Cargo Van': 18,
    'Sprinter Van': 16,
    'Box Truck': 10,
  }
  const mpg = mpgByVehicle[vehicle] || 12
  const gallons = miles / mpg
  return gallons * fuelPricePerGallon
}
