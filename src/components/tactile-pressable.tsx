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
  onHoverIn,
  onHoverOut,
  onPressIn,
  onPressOut,
  static: isStatic = false,
  style,
  ...props
}: TactilePressableProps) {
  const reduceMotion = useReducedMotion();
  const [scale] = useState(() => new Animated.Value(1));
  const [pressed, setPressed] = useState(false);
  const [hovered, setHovered] = useState(false);
  const motionDisabled = isStatic || disabled || reduceMotion !== false;

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
    setPressed(true);
    animateScale(motion.scale.pressed, motion.duration.pressIn);
    onPressIn?.(event);
  };

  const handlePressOut: NonNullable<PressableProps['onPressOut']> = (event) => {
    setPressed(false);
    animateScale(1, motion.duration.pressOut);
    onPressOut?.(event);
  };

  const handleHoverIn: NonNullable<PressableProps['onHoverIn']> = (event) => {
    setHovered(true);
    onHoverIn?.(event);
  };

  const handleHoverOut: NonNullable<PressableProps['onHoverOut']> = (event) => {
    setHovered(false);
    onHoverOut?.(event);
  };

  const resolvedStyle =
    typeof style === 'function'
      ? style({ pressed, hovered } as PressableStateCallbackType)
      : style;

  return (
    <AnimatedPressable
      {...props}
      disabled={disabled}
      onHoverIn={handleHoverIn}
      onHoverOut={handleHoverOut}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[
        resolvedStyle,
        motionDisabled ? null : { transform: [{ scale }] },
      ]}
    />
  );
}
