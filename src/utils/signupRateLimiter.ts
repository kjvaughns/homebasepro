// Simple client-side signup rate limiting
// Prevents rapid-fire signup attempts from same browser

interface SignupAttempt {
  email: string;
  timestamp: number;
}

const STORAGE_KEY = 'homebase_signup_attempts';
const MAX_ATTEMPTS = 3;
const WINDOW_MS = 60 * 60 * 1000; // 1 hour

function getAttempts(): SignupAttempt[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    
    const attempts = JSON.parse(stored) as SignupAttempt[];
    
    // Filter out old attempts
    const now = Date.now();
    const recent = attempts.filter(a => now - a.timestamp < WINDOW_MS);
    
    // Save cleaned list
    localStorage.setItem(STORAGE_KEY, JSON.stringify(recent));
    
    return recent;
  } catch {
    return [];
  }
}

function addAttempt(email: string) {
  const attempts = getAttempts();
  attempts.push({
    email: email.toLowerCase().trim(),
    timestamp: Date.now()
  });
  
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(attempts));
  } catch {
    // Storage full or disabled, continue anyway
  }
}

export function canSignup(email: string): { allowed: boolean; reason?: string } {
  const attempts = getAttempts();
  const emailAttempts = attempts.filter(
    a => a.email === email.toLowerCase().trim()
  );
  
  if (emailAttempts.length >= MAX_ATTEMPTS) {
    return {
      allowed: false,
      reason: `Too many signup attempts for this email. Please try again in ${Math.ceil(WINDOW_MS / 60000)} minutes.`
    };
  }
  
  return { allowed: true };
}

export function recordSignupAttempt(email: string) {
  addAttempt(email);
}

export function clearSignupAttempts() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignore errors
  }
}
