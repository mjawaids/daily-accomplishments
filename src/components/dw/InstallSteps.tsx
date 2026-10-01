/* DailyWins — the Add to Home Screen (iOS) / Add to Dock (macOS Safari) steps,
   for browsers a page can't install from. Opened via useInstallAction(). */
import { Sheet } from './components';
import { Icon } from './icons';
import type { IconName } from './icons';

export type StepsMode = 'ios' | 'mac-safari';

interface Step {
  title: string;
  sub: string;
  icon?: IconName;
}

const COPY: Record<StepsMode, { title: string; intro: string; steps: Step[]; note?: string }> = {
  ios: {
    title: 'Add DailyWins to your Home Screen',
    intro: 'On iPhone and iPad, apps like this install from the Share menu.',
    steps: [
      { title: 'Tap Share', sub: 'In the Safari toolbar', icon: 'share' },
      { title: 'Tap Add to Home Screen', sub: 'Scroll the menu down if you don’t see it', icon: 'plusSquare' },
      { title: 'Tap Add', sub: 'DailyWins then opens from your Home Screen like any app' },
    ],
    note: 'Using another browser? Look for Add to Home Screen in its Share menu.',
  },
  'mac-safari': {
    title: 'Add DailyWins to your Dock',
    intro: 'Safari installs apps like this from the File menu.',
    steps: [
      { title: 'Choose File, then Add to Dock', sub: 'In the menu bar at the top of the screen' },
      { title: 'Click Add', sub: 'DailyWins then opens from your Dock like any app' },
    ],
  },
};

export function InstallSteps({ mode, onClose }: { mode: StepsMode; onClose: () => void }) {
  const c = COPY[mode];
  return (
    <Sheet labelledBy="dw-install-steps-title" onClose={onClose}>
      <h3 id="dw-install-steps-title">{c.title}</h3>
      <p className="dw-steps-intro">{c.intro}</p>
      <ol className="dw-steps">
        {c.steps.map((s, i) => (
          <li key={s.title} className="dw-step">
            <span className="num" aria-hidden="true">
              {i + 1}
            </span>
            <div className="lbl">
              <div className="t">
                {s.title}
                {s.icon && (
                  <span className="glyph" aria-hidden="true">
                    <Icon name={s.icon} size={18} />
                  </span>
                )}
              </div>
              <div className="s">{s.sub}</div>
            </div>
          </li>
        ))}
      </ol>
      <button type="button" className="dw-btn block" style={{ marginTop: 14, height: 46 }} onClick={onClose}>
        Got it
      </button>
      {c.note && <p className="dw-steps-note">{c.note}</p>}
    </Sheet>
  );
}
