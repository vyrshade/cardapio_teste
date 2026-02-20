import { useMediaQuery, useTheme } from '@mui/material';




export function useSmartTruncate() {
  const theme = useTheme();

  const isXs = useMediaQuery(theme.breakpoints.only('xs'));
  const isSm = useMediaQuery(theme.breakpoints.only('sm'));
  const isMd = useMediaQuery(theme.breakpoints.only('md'));
  const isLg = useMediaQuery(theme.breakpoints.only('lg'));
  const isXl = useMediaQuery(theme.breakpoints.up('xl'));

  const getMaxLength = () => {
    if (isXs) return 14;
    if (isSm) return 40;
    if (isMd) return 60;
    if (isLg) return 80;
    if (isXl) return 100;
    return 10;
  };

  const truncateText = (text) => {
    const maxLength = getMaxLength();
    if (!text) return '';
    return text.length > maxLength
      ? text.slice(0, maxLength - 1) + '…'
      : text;
  };

  return truncateText;
}