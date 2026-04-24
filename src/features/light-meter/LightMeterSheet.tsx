import { useEffect, useState } from 'react';
import type { LightLevel } from '../../domain/types';
import { ChoiceCard } from '../../ui/Field';
import { Button } from '../../ui/Button';
import { luxToLevel } from './lightMap';
import { t } from '../../i18n';

const LIGHT_LEVEL_I18N: Record<string, string> = {
  low: 'addPlant.light.low',
  medium: 'addPlant.light.medium',
  bright_indirect: 'addPlant.light.brightIndirect',
  direct_sunlight: 'addPlant.light.direct',
};

const LIGHT_DESC_I18N: Record<string, string> = {
  low: 'addPlant.light.low.desc',
  medium: 'addPlant.light.medium.desc',
  bright_indirect: 'addPlant.light.brightIndirect.desc',
  direct_sunlight: 'addPlant.light.direct.desc',
};

const OPTION_VALUES: LightLevel[] = ['low', 'medium', 'bright_indirect', 'direct_sunlight'];

// Chrome/Android ships AmbientLightSensor behind a Generic-Sensor flag.
interface AmbientLightSensorLike {
  start: () => void;
  stop: () => void;
  illuminance: number;
  addEventListener(type: 'reading' | 'error', cb: () => void): void;
}
interface WithAmbient {
  AmbientLightSensor?: new () => AmbientLightSensorLike;
}

export function LightMeterSheet({
  onClose,
  onPick,
  initial,
}: {
  onClose: () => void;
  onPick: (level: LightLevel) => void;
  initial?: LightLevel;
}) {
  const [picked, setPicked] = useState<LightLevel>(initial ?? 'medium');
  const [lux, setLux] = useState<number | null>(null);
  const [sensorError, setSensorError] = useState<string | null>(null);
  const [sensorSupported, setSensorSupported] = useState<boolean>(false);

  useEffect(() => {
    const SensorCtor = (window as unknown as WithAmbient).AmbientLightSensor;
    if (!SensorCtor) return;
    setSensorSupported(true);
    let sensor: AmbientLightSensorLike | null = null;
    try {
      sensor = new SensorCtor();
      sensor.addEventListener('reading', () => {
        if (sensor) {
          setLux(sensor.illuminance);
          setPicked(luxToLevel(sensor.illuminance));
        }
      });
      sensor.addEventListener('error', () => {
        setSensorError('Sensor unavailable.');
      });
      sensor.start();
    } catch {
      setSensorError('Sensor requires a secure context.');
    }
    return () => {
      try {
        sensor?.stop();
      } catch {
        /* noop */
      }
    };
  }, []);

  return (
    <div
      className="fixed inset-0 z-40 flex items-end bg-black/40"
      onClick={onClose}
    >
      <div
        className="max-h-[92dvh] w-full overflow-auto rounded-t-3xl bg-card p-5 pb-8 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-black/10" />
        <h2 className="font-display text-xl font-semibold">{t('lightMeter.heading')}</h2>
        <p className="text-xs text-ink-muted">
          {t('lightMeter.hint')}
          {sensorSupported
            ? ' ' + t('lightMeter.sensorAvailable')
            : ' ' + t('lightMeter.sensorUnavailable')}
        </p>

        {sensorSupported && (
          <div className="mt-3 rounded-2xl bg-primary/5 p-3 text-sm">
            {sensorError ? (
              <span className="text-ink-muted">{sensorError}</span>
            ) : lux === null ? (
              <span className="text-ink-muted">{t('lightMeter.waiting')}</span>
            ) : (
              <>
                <div className="text-lg font-semibold text-primary">
                  {t('lightMeter.lux', { value: Math.round(lux) })}
                </div>
                <div
                  className="text-xs text-ink-muted"
                  dangerouslySetInnerHTML={{ __html: t('lightMeter.mapsTo', { level: t(LIGHT_LEVEL_I18N[luxToLevel(lux)] ?? '') }) }}
                />
              </>
            )}
          </div>
        )}

        <div className="mt-4 flex flex-col gap-2">
          {OPTION_VALUES.map((v) => (
            <ChoiceCard
              key={v}
              selected={picked === v}
              title={t(LIGHT_LEVEL_I18N[v])}
              description={t(LIGHT_DESC_I18N[v])}
              onClick={() => setPicked(v)}
            />
          ))}
        </div>

        <div className="mt-5 flex gap-2">
          <Button variant="secondary" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button
            className="flex-1"
            onClick={() => {
              onPick(picked);
              onClose();
            }}
          >
            {t('lightMeter.use')}
          </Button>
        </div>
      </div>
    </div>
  );
}
