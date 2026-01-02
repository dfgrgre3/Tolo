'use client';

interface PasswordStrengthMeterProps {
  password: string;
}

export function PasswordStrengthMeter({ password }: PasswordStrengthMeterProps) {
  const getStrength = (pwd: string) => {
    if (!pwd) return 0;
    
    let strength = 0;
    if (pwd.length > 5) strength += 1;
    if (pwd.length > 8) strength += 1;
    if (/[A-Z]/.test(pwd)) strength += 1;
    if (/[0-9]/.test(pwd)) strength += 1;
    if (/[^A-Za-z0-9]/.test(pwd)) strength += 1;
    
    return Math.min(strength, 4);
  };

  const strength = getStrength(password);
  const colors = ['bg-red-500', 'bg-yellow-500', 'bg-blue-500', 'bg-green-500'];
  
  return (
    <div className="mt-1">
      <div className="flex h-1 gap-1">
        {[1, 2, 3, 4].map((i) => (
          <div 
            key={i}
            className={`flex-1 rounded-full ${i <= strength ? colors[strength-1] : 'bg-gray-200'}`}
          />
        ))}
      </div>
      <p className="mt-1 text-xs text-right text-gray-500">
        {strength === 0 && 'ضعيف جداً'}
        {strength === 1 && 'ضعيف'}
        {strength === 2 && 'متوسط'}
        {strength === 3 && 'قوي'}
        {strength === 4 && 'قوي جداً'}
      </p>
    </div>
  );
}
