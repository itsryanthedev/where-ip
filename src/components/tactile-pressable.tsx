import type { ComponentProps } from 'react';
import { useEffect, useState } from 'react';
import {
  Animated,
  Easing,
  Platform,
  Pressable,
  StyleSheet,
  type PressableStateCallbackType,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { motion } from '@/constants/theme';
import { useReducedMotion } from '@/hooks/use-reduced-motion';

type PressableProps = ComponentProps<typeof Pressable>;

type TactilePressableProps = Omit<PressableProps, 'style'> & {
  static?: boolean;
  style?:
    | StyleProp<ViewStyle>
    | ((state: PressableStateCallbackType) => StyleProp<ViewStyle>);
};

/**
 * Pressable with scale feedback. On web, Animated.createAnimatedComponent(Pressable)
 * drops non-animated / function styles (background, padding, radius), so scale is
 * applied on a wrapping Animated.View while Pressable keeps normal styles.
 */
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
  const [pressed, setPressed] = useState(false);
  const motionDisabled = isStatic || disabled || reduceMotion;

  // Sync Animated.Value when motion is disabled mid-animation (external system).
  /* eslint-disable react-you-might-not-need-an-effect/no-event-handler -- Animated.Value is an external store; reset when motion turns off. */
  useEffect(() => {
    if (motionDisabled) {
      scale.stopAnimation();
      scale.setValue(1);
    }
  }, [motionDisabled, scale]);
  /* eslint-enable react-you-might-not-need-an-effect/no-event-handler */

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

  // RN core types only include `pressed`. Expo's react-native-web
  // augmentation also requires `hovered`. Assert so typecheck works in
  // both environments when resolving layout for the animated host.
  const resolvedStyle =
    typeof style === 'function'
      ? style({ pressed, hovered: false } as PressableStateCallbackType)
      : style;
  const hostStyle = layoutHostStyle(resolvedStyle);

  return (
    <Animated.View
      style={[
        hostStyle,
        motionDisabled ? null : { transform: [{ scale }] },
      ]}
    >
      <Pressable
        {...props}
        disabled={disabled}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={style}
      />
    </Animated.View>
  );
}

/** Lift flex/sizing onto the animated host so row layouts like `flex: 1` still work. */
function layoutHostStyle(style: StyleProp<ViewStyle>): ViewStyle | undefined {
  const flat = StyleSheet.flatten(style);
  if (!flat) {
    return undefined;
  }

  const host: ViewStyle = {};
  let hasLayout = false;

  const assign = <K extends keyof ViewStyle>(key: K) => {
    const value = flat[key];
    if (value !== undefined) {
      host[key] = value;
      hasLayout = true;
    }
  };

  assign('flex');
  assign('flexGrow');
  assign('flexShrink');
  assign('flexBasis');
  assign('alignSelf');
  assign('width');
  assign('minWidth');
  assign('maxWidth');
  assign('height');
  assign('minHeight');
  assign('maxHeight');
  assign('margin');
  assign('marginTop');
  assign('marginBottom');
  assign('marginLeft');
  assign('marginRight');
  assign('marginHorizontal');
  assign('marginVertical');
  assign('marginStart');
  assign('marginEnd');

  return hasLayout ? host : undefined;
}
