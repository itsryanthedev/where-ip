import type { ReactNode } from 'react';
import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Platform,
  type ViewProps,
} from 'react-native';

import { motion } from '@/constants/theme';
import { useReducedMotion } from '@/hooks/use-reduced-motion';

type RevealViewProps = ViewProps & {
  children: ReactNode;
  delay?: number;
  duration?: number;
  fromScale?: number;
  fromTranslateY?: number;
};

export function RevealView({
  children,
  delay = 0,
  duration = motion.duration.content,
  fromScale = 1,
  fromTranslateY = 0,
  style,
  ...props
}: RevealViewProps) {
  const reduceMotion = useReducedMotion();
  const hasAnimated = useRef(false);
  const [opacity] = useState(() => new Animated.Value(0));
  const [scale] = useState(() => new Animated.Value(fromScale));
  const [translateY] = useState(
    () => new Animated.Value(fromTranslateY),
  );

  useEffect(() => {
    if (reduceMotion === null || hasAnimated.current) {
      return;
    }

    hasAnimated.current = true;
    const easing = Easing.bezier(...motion.easing.out);
    const useNativeDriver = Platform.OS !== 'web';

    if (reduceMotion) {
      scale.setValue(1);
      translateY.setValue(0);
    }

    const animation = Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: reduceMotion
          ? Math.min(duration, motion.duration.toggle)
          : duration,
        delay,
        easing,
        useNativeDriver,
      }),
      Animated.timing(scale, {
        toValue: 1,
        duration: reduceMotion ? 0 : duration,
        delay: reduceMotion ? 0 : delay,
        easing,
        useNativeDriver,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: reduceMotion ? 0 : duration,
        delay: reduceMotion ? 0 : delay,
        easing,
        useNativeDriver,
      }),
    ]);

    animation.start();
    return () => animation.stop();
  }, [delay, duration, opacity, reduceMotion, scale, translateY]);

  return (
    <Animated.View
      {...props}
      style={[
        style,
        {
          opacity,
          transform: [{ translateY }, { scale }],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
}
