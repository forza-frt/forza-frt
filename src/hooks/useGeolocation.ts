import { useCallback, useEffect, useRef, useState } from 'react';
import { SpeedEstimator } from '../services/speedService';
import type { Fix, GeoStatus, SpeedReading } from '../types/speed';

const EMPTY_SPEED: SpeedReading = { kmh: null, origin: null, heading: null, reliable: false };

export interface GeoState {
  status: GeoStatus;
  fix: Fix | null;
  speed: SpeedReading;
  message: string | null;
  start: () => void;
}

/**
 * Watches the device position. The location never leaves the device —
 * it is not sent to any server and not stored.
 */
export function useGeolocation(autoStart = true): GeoState {
  const [status, setStatus] = useState<GeoStatus>('idle');
  const [fix, setFix] = useState<Fix | null>(null);
  const [speed, setSpeed] = useState<SpeedReading>(EMPTY_SPEED);
  const [message, setMessage] = useState<string | null>(null);
  const watchId = useRef<number | null>(null);
  const estimator = useRef(new SpeedEstimator());

  const start = useCallback(() => {
    if (!('geolocation' in navigator)) {
      setStatus('unsupported');
      setMessage('Геолокация не поддерживается этим браузером');
      return;
    }
    if (!window.isSecureContext) {
      setStatus('unsupported');
      setMessage('Геолокация работает только по HTTPS');
      return;
    }
    if (watchId.current !== null) navigator.geolocation.clearWatch(watchId.current);
    setStatus((s) => (s === 'active' ? s : 'requesting'));
    estimator.current.reset();
    watchId.current = navigator.geolocation.watchPosition(
      (pos) => {
        const f: Fix = {
          lat: pos.coords.latitude,
          lon: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          speed: pos.coords.speed,
          heading: pos.coords.heading,
          timestamp: pos.timestamp || Date.now(),
        };
        setFix(f);
        setSpeed(estimator.current.update(f));
        setStatus('active');
        setMessage(null);
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          setStatus('denied');
          setMessage('Геолокация запрещена. Карта работает без неё. Включить: Настройки → Конфиденциальность → Службы геолокации → Safari.');
          if (watchId.current !== null) navigator.geolocation.clearWatch(watchId.current);
          watchId.current = null;
        } else if (err.code === err.POSITION_UNAVAILABLE) {
          setStatus('unavailable');
          setMessage('Местоположение сейчас недоступно');
          setSpeed(EMPTY_SPEED);
        }
        // TIMEOUT: keep watching, the next fix will come
      },
      { enableHighAccuracy: true, maximumAge: 1000, timeout: 20000 },
    );
  }, []);

  useEffect(() => {
    if (autoStart) start();
    return () => {
      if (watchId.current !== null) navigator.geolocation.clearWatch(watchId.current);
    };
  }, [autoStart, start]);

  return { status, fix, speed, message, start };
}
