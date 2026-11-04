import React from "react";
import Image from "next/image";
import logoImg from "@/assets/logo.webp";

interface LogoProps {
  className?: string;
  size?: number; // dimension in pixels if needed
}

export const Logo: React.FC<LogoProps> = ({ className, size}) => {
  return (
    <Image
      src={logoImg}
      alt="Corroly Logo"
      width={size}
      height={size}
      priority
      className={`object-contain ${className}`}
    />
  );
};

