import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'success';
  fullWidth?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const Button: React.FC<ButtonProps> = ({ 
  children, 
  variant = 'primary', 
  fullWidth = false, 
  size = 'md',
  className = '',
  ...props 
}) => {
  
  const baseStyles = "font-heading font-bold rounded-xl transition-all duration-200 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed shadow-md flex items-center justify-center gap-2";
  
  const variants = {
    primary: "bg-[#0057A0] hover:bg-[#003D73] text-white border-b-4 border-[#003D73] active:border-b-0 active:translate-y-1",
    secondary: "bg-white text-[#0057A0] hover:bg-gray-50 border-b-4 border-gray-200 active:border-b-0 active:translate-y-1",
    outline: "border-2 border-white/30 text-white hover:bg-white/10",
    danger: "bg-[#E63946] text-white hover:bg-red-700 border-b-4 border-red-800 active:border-b-0 active:translate-y-1",
    success: "bg-[#30C050] text-white hover:bg-green-600 border-b-4 border-green-700 active:border-b-0 active:translate-y-1"
  };

  const sizes = {
    sm: "py-2 px-4 text-sm",
    md: "py-3 px-6 text-base",
    lg: "py-4 px-8 text-lg uppercase tracking-wide"
  };

  return (
    <button 
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${fullWidth ? 'w-full' : ''} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};

export default Button;