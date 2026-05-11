import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Unit Conversion Helpers
 */
export const units = {
  // Metric to Imperial
  kgToLbs: (kg: number) => kg * 2.20462,
  cmToFtIn: (cm: number) => {
    const totalInches = cm / 2.54;
    const feet = Math.floor(totalInches / 12);
    const inches = Math.round(totalInches % 12);
    return { feet, inches };
  },
  mlToOz: (ml: number) => ml * 0.033814,
  kmToMiles: (km: number) => km * 0.621371,

  // Imperial to Metric
  lbsToKg: (lbs: number) => lbs / 2.20462,
  ftInToCm: (feet: number, inches: number) => (feet * 12 + inches) * 2.54,
  ozToMl: (oz: number) => oz / 0.033814,
  milesToKm: (miles: number) => miles / 0.621371,

  // Formatters
  formatWeight: (val: number, unit: 'metric' | 'imperial') => 
    unit === 'metric' ? `${Math.round(val)} kg` : `${Math.round(units.kgToLbs(val))} lbs`,
  
  formatHeight: (val: number, unit: 'metric' | 'imperial') => {
    if (unit === 'metric') return `${Math.round(val)} cm`;
    const { feet, inches } = units.cmToFtIn(val);
    return `${feet}'${inches}"`;
  },

  formatWater: (val: number, unit: 'metric' | 'imperial') =>
    unit === 'metric' ? `${val} ml` : `${Math.round(units.mlToOz(val))} oz`,
};
