import React, { useState } from 'react';
import { Landmark, Wallet } from 'lucide-react';
import { DynamicIcon } from '../../utils/formatters';

export interface InstitutionMeta {
  id: string;
  name: string;
  shortName: string;
  logo: string;
  type: 'Bank' | 'Wallet' | 'Cash';
  defaultColor: string;
  keywords: string[];
}

export const INSTITUTIONS: InstitutionMeta[] = [
  {
    id: 'bml',
    name: 'Bank of Maldives',
    shortName: 'BML',
    logo: '/banks/BML.png',
    type: 'Bank',
    defaultColor: '#E11D48',
    keywords: ['bml', 'bank of maldives', 'maldives bank'],
  },
  {
    id: 'mib',
    name: 'Maldives Islamic Bank',
    shortName: 'MIB',
    logo: '/banks/MIB.png',
    type: 'Bank',
    defaultColor: '#059669',
    keywords: ['mib', 'maldives islamic bank', 'islamic bank'],
  },
  {
    id: 'dhiraagu_pay',
    name: 'Dhiraagu Pay',
    shortName: 'Dhiraagu Pay',
    logo: '/banks/Dhiraagu%20Pay.png',
    type: 'Wallet',
    defaultColor: '#F97316',
    keywords: ['dhiraagu', 'dhiraagu pay', 'dhipay'],
  },
  {
    id: 'm_faisaa',
    name: 'Ooredoo m-Faisaa',
    shortName: 'm-Faisaa',
    logo: '/banks/m-faisaa.jpg',
    type: 'Wallet',
    defaultColor: '#DC2626',
    keywords: ['m-faisaa', 'mfaisaa', 'm faisaa', 'ooredoo', 'faisaa wallet'],
  },
  {
    id: 'premier_bank',
    name: 'Premier Bank',
    shortName: 'Premier',
    logo: '/banks/premier%20bank.jpg',
    type: 'Bank',
    defaultColor: '#1E3A8A',
    keywords: ['premier', 'premier bank'],
  },
];

export function findInstitution(institution?: string | null, accountName?: string | null): InstitutionMeta | undefined {
  const query = `${institution || ''} ${accountName || ''}`.toLowerCase();
  return INSTITUTIONS.find((inst) =>
    inst.keywords.some((kw) => query.includes(kw))
  );
}

export interface InstitutionLogoProps {
  institution?: string | null;
  accountName?: string | null;
  accountType?: string | null;
  icon?: string | null;
  color?: string | null;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  showFallbackIfNoLogo?: boolean;
}

export function InstitutionLogo({
  institution,
  accountName,
  accountType,
  icon,
  color = '#6366F1',
  size = 'md',
  className = '',
  showFallbackIfNoLogo = true,
}: InstitutionLogoProps) {
  const [imgError, setImgError] = useState(false);
  const matched = findInstitution(institution, accountName);

  const sizeStyles = {
    xs: {
      container: 'w-6 h-6 rounded-md p-0.5',
      icon: 'w-3.5 h-3.5',
    },
    sm: {
      container: 'w-7 h-7 sm:w-8 sm:h-8 rounded-lg p-0.5',
      icon: 'w-4 h-4',
    },
    md: {
      container: 'w-9 h-9 sm:w-10 sm:h-10 rounded-xl p-1',
      icon: 'w-4 h-4 sm:w-5 sm:h-5',
    },
    lg: {
      container: 'w-11 h-11 sm:w-12 sm:h-12 rounded-xl p-1.5',
      icon: 'w-6 h-6',
    },
    xl: {
      container: 'w-14 h-14 sm:w-16 sm:h-16 rounded-2xl p-2',
      icon: 'w-7 h-7 sm:w-8 sm:h-8',
    },
  }[size];

  if (matched && !imgError) {
    return (
      <div
        className={`relative shrink-0 flex items-center justify-center overflow-hidden bg-white shadow-sm border border-white/20 transition-transform ${sizeStyles.container} ${className}`}
        title={`${matched.name} (${matched.type})`}
      >
        <img
          src={matched.logo}
          alt={matched.name}
          className="w-full h-full object-contain"
          onError={() => setImgError(true)}
          loading="lazy"
        />
      </div>
    );
  }

  if (!showFallbackIfNoLogo) return null;

  const fallbackColor = color || (accountType === 'CASH' ? '#F59E0B' : '#6366F1');

  return (
    <div
      className={`shrink-0 flex items-center justify-center border border-white/[0.08] transition-colors ${sizeStyles.container} ${className}`}
      style={{
        backgroundColor: `${fallbackColor}18`,
        color: fallbackColor,
      }}
    >
      {icon ? (
        <DynamicIcon name={icon} className={sizeStyles.icon} />
      ) : accountType === 'CASH' ? (
        <Wallet className={sizeStyles.icon} />
      ) : (
        <Landmark className={sizeStyles.icon} />
      )}
    </div>
  );
}
