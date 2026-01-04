import { I18nManager } from 'react-native';

export const isRTL = () => I18nManager.isRTL;

export const getFlexDirection = (isRTL) => (isRTL ? 'row-reverse' : 'row');

export const getTextAlign = (isRTL) => (isRTL ? 'right' : 'left');

export const getWritingDirection = (isRTL) => (isRTL ? 'rtl' : 'ltr');

export const rtlStyle = (isRTL, ltrStyle, rtlStyle) => (isRTL ? rtlStyle : ltrStyle);
