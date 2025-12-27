// Production-only style fixes for Heroku deployment
// This only applies size fixes when NOT running on localhost

import { forceLocalStyling } from './forceLocalStyling';

export function applyProductionStyleFixes() {
  // Only apply if we're NOT on localhost (i.e., we're in production)
  const isProduction = !window.location.hostname.includes('localhost') && 
                       !window.location.hostname.includes('127.0.0.1');
  
  if (!isProduction) {
    console.log('Running locally - skipping production style fixes');
    return;
  }
  
  console.log('Production environment detected - applying style fixes');
  
  // Use the aggressive inline style approach
  forceLocalStyling();
}


