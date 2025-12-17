import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { SocialButton, SocialButtonProps } from '@/app/(auth)/components/shared/AuthButton';
import { LucideIcon } from 'lucide-react';

// Mock the cn utility
jest.mock('@/lib/utils', () => ({
  cn: (...inputs: any[]) => inputs.filter(Boolean).join(' '),
}));

// Mock Lucide icons
jest.mock('lucide-react', () => ({
  Loader2: 'loader-icon',
  // Add any other icons used in AuthButton if necessary
}));

const socialProviders: SocialButtonProps['provider'][] = [
  'google',
  'github',
  'twitter',
  'facebook',
  'apple',
];

describe('SocialButton', () => {
  it.each(socialProviders)('should render correctly for provider %s', (provider) => {
    render(<SocialButton provider={provider} />);
    const button = screen.getByRole('button');
    expect(button).toBeInTheDocument();
    
    // Check for the default label
    // Check for the default label
    const label = provider === 'github' 
      ? 'GitHub' 
      : provider.charAt(0).toUpperCase() + provider.slice(1);
    expect(screen.getByText(label)).toBeInTheDocument();
  });

  it('should render children instead of default label', () => {
    render(<SocialButton provider="google">Continue with Google</SocialButton>);
    expect(screen.getByRole('button')).toHaveTextContent('Continue with Google');
    expect(screen.queryByText('Google')).not.toBeInTheDocument();
  });

  it('should handle click events', () => {
    const handleClick = jest.fn();
    render(<SocialButton provider="github" onClick={handleClick} />);
    const button = screen.getByRole('button');
    fireEvent.click(button);
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('should be disabled', () => {
    const handleClick = jest.fn();
    render(<SocialButton provider="twitter" onClick={handleClick} disabled />);
    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
    fireEvent.click(button);
    expect(handleClick).not.toHaveBeenCalled();
  });

  it('should show loading state', () => {
    render(<SocialButton provider="facebook" isLoading />);
    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
    expect(screen.getByText('جاري التحميل...')).toBeInTheDocument();
  });

  it('should show custom loading text', () => {
    render(<SocialButton provider="apple" isLoading loadingText="Please wait..." />);
    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
    expect(screen.getByText('Please wait...')).toBeInTheDocument();
    expect(screen.queryByText('جاري التحميل...')).not.toBeInTheDocument();
  });
});
