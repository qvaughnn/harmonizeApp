import { View, type ViewProps } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useThemeColor } from '@/hooks/useThemeColor';

export type ThemedViewProps = ViewProps & {
  lightColor?: string;
  darkColor?: string;
};

export function ThemedView({ style, lightColor, darkColor, ...otherProps }: ThemedViewProps) {
  const backgroundColor = useThemeColor({ light: lightColor, dark: darkColor }, 'background');

  // return <View style={[{ backgroundColor }, style]} {...otherProps} />;
  return (
    <LinearGradient colors={['#39065b', '#582877', '#946ead']} style={style} {...otherProps} />
  );
}
