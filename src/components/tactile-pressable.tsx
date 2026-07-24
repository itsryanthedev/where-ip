import type { ComponentProps } from 'react';
import { useEffect, useState } from 'react';
import {
  Animated,
  Easing,
  Platform,
  Pressable,
  type PressableStateCallbackType,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { motion } from '@/constants/theme';
import { useReducedMotion } from '@/hooks/use-reduced-motion';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type PressableProps = ComponentProps<typeof Pressable>;

type TactilePressableProps = Omit<PressableProps, 'style'> & {
  static?: boolean;
  style?:
    | StyleProp<ViewStyle>
    | ((state: PressableStateCallbackType) => StyleProp<ViewStyle>);
};

export function TactilePressable({
  disabled,
  onPressIn,
  onPressOut,
  static: isStatic = false,
  style,
  ...props
}: TactilePressableProps) {
  const reduceMotion = useReducedMotion();
  const [scale] = useState(() => new Animated.Value(1));
  const motionDisabled = isStatic || disabled || reduceMotion;

  useEffect(() => {
    if (motionDisabled) {
      scale.stopAnimation();
      scale.setValue(1);
    }
  }, [motionDisabled, scale]);

  const animateScale = (toValue: number, duration: number) => {
    if (motionDisabled) {
      scale.setValue(1);
      return;
    }

    Animated.timing(scale, {
      toValue,
      duration,
      easing: Easing.bezier(...motion.easing.out),
      useNativeDriver: Platform.OS !== 'web',
    }).start();
  };

  const handlePressIn: NonNullable<PressableProps['onPressIn']> = (event) => {
    animateScale(motion.scale.pressed, motion.duration.pressIn);
    onPressIn?.(event);
  };

  const handlePressOut: NonNullable<PressableProps['onPressOut']> = (event) => {
    animateScale(1, motion.duration.pressOut);
    onPressOut?.(event);
  };

  return (
    <AnimatedPressable
      {...props}
      disabled={disabled}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={(state) => [
        typeof style === 'function' ? style(state) : style,
        motionDisabled ? null : { transform: [{ scale }] },
      ]}
    />
  );
}
